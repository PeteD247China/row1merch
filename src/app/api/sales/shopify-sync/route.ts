import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { addDays } from "@/lib/utils";
import { normalizeShopifyDomain, todayUtc, weekStart, SALES_CHART_DAYS } from "@/lib/sales";

// Shopify supports each Admin API version for ~12 months; bump this quarterly.
const SHOPIFY_API_VERSION = "2026-07";
// 250 orders per page; caps a sync at 10k orders so it fits the function timeout
const MAX_PAGES = 40;

interface ShopifyLineItem {
  variant_id: number | null;
  product_id: number | null;
  quantity: number;
  price: string;
}

interface ShopifyOrder {
  id: number;
  name: string;
  created_at: string; // ISO with the shop's UTC offset, e.g. 2026-10-08T14:03:00+01:00
  cancelled_at: string | null;
  test: boolean;
  line_items: ShopifyLineItem[];
}

interface DayTotal {
  units: number;
  revenue: number;
  orders: { id: number; name: string; quantity: number }[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

async function fetchShopify(url: string, token: string): Promise<Response> {
  const init = { headers: { "X-Shopify-Access-Token": token, Accept: "application/json" } };
  const res = await fetch(url, init);
  if (res.status !== 429) return res;
  // Rate limited: wait as instructed, then retry once
  const wait = Math.min(parseFloat(res.headers.get("Retry-After") ?? "2"), 10);
  await new Promise((r) => setTimeout(r, wait * 1000));
  return fetch(url, init);
}

function shopifyError(status: number): string {
  if (status === 401) return "Shopify rejected the access token.";
  if (status === 403) return "The access token is missing the read_orders scope.";
  if (status === 404) return "Shopify store not found. Check the store domain.";
  return `Shopify returned an error (HTTP ${status}).`;
}

export async function POST(request: Request) {
  // Verify current user is admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: adminRecord } = await supabase
    .from("clients")
    .select("role")
    .eq("supabase_auth_id", user.id)
    .single();

  if (adminRecord?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { sku_id: skuId } = await request.json().catch(() => ({}));
  if (!skuId) {
    return NextResponse.json({ error: "Missing sku_id" }, { status: 400 });
  }

  // The token is read here, server-side only, and never returned
  const { data: integration } = await supabase
    .from("sku_sales_integrations")
    .select("platform, shopify_store_domain, shopify_access_token, shopify_product_id, shopify_variant_id")
    .eq("sku_id", skuId)
    .maybeSingle();

  if (!integration) {
    return NextResponse.json({ error: "No sales integration set up for this SKU" }, { status: 404 });
  }
  if (integration.platform !== "shopify") {
    return NextResponse.json({ error: "Only Shopify sync is supported so far" }, { status: 400 });
  }

  const domain = normalizeShopifyDomain(integration.shopify_store_domain ?? "");
  const token = integration.shopify_access_token;
  const variantId = integration.shopify_variant_id?.trim() || null;
  const productId = integration.shopify_product_id?.trim() || null;

  if (!domain || !token || (!variantId && !productId)) {
    return NextResponse.json(
      { error: "Integration is incomplete: needs a *.myshopify.com domain, access token, and a variant or product ID" },
      { status: 400 }
    );
  }

  // Daily rows cover the last 30 days. Weekly rows start on the Monday before
  // that, so every week written is complete rather than a partial count.
  const today = todayUtc();
  const dailyStart = addDays(today, -(SALES_CHART_DAYS - 1));
  const fetchFrom = weekStart(dailyStart);

  const days = new Map<string, DayTotal>();
  let ordersScanned = 0;

  // A day of slack either side of UTC, since order dates are in shop time
  const params = new URLSearchParams({
    status: "any",
    limit: "250",
    created_at_min: `${addDays(fetchFrom, -1)}T00:00:00Z`,
    fields: "id,name,created_at,cancelled_at,test,line_items",
  });
  let url: string | null = `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/orders.json?${params}`;

  try {
    for (let page = 0; url && page < MAX_PAGES; page++) {
      const res = await fetchShopify(url, token);
      if (!res.ok) {
        return NextResponse.json({ error: shopifyError(res.status) }, { status: 502 });
      }

      const { orders } = (await res.json()) as { orders: ShopifyOrder[] };
      ordersScanned += orders.length;

      for (const order of orders) {
        if (order.cancelled_at || order.test) continue;
        const day = order.created_at.slice(0, 10); // shop-local date
        if (day < fetchFrom) continue;

        for (const item of order.line_items) {
          const matches = variantId
            ? String(item.variant_id) === variantId
            : String(item.product_id) === productId;
          if (!matches) continue;

          const total = days.get(day) ?? { units: 0, revenue: 0, orders: [] };
          total.units += item.quantity;
          total.revenue += parseFloat(item.price) * item.quantity;
          total.orders.push({ id: order.id, name: order.name, quantity: item.quantity });
          days.set(day, total);
        }
      }

      // Cursor pagination: Link: <...page_info=...>; rel="next"
      const next = res.headers.get("Link")?.match(/<([^>]+)>;\s*rel="next"/);
      url = next ? next[1] : null;
    }
  } catch {
    return NextResponse.json({ error: "Could not reach Shopify. Please try again." }, { status: 502 });
  }

  // Shops ahead of UTC can already have orders dated "tomorrow"
  const lastDay = Array.from(days.keys()).reduce((max, d) => (d > max ? d : max), today);
  const syncedAt = new Date().toISOString();
  const base = { sku_id: skuId, platform: "shopify", synced_at: syncedAt };

  const rows = [];
  // Keyed by period:report_date; written to the admin-only sku_sales_raw_data
  const rawData = new Map<string, object>();
  for (let day = dailyStart; day <= lastDay; day = addDays(day, 1)) {
    const total = days.get(day);
    rows.push({
      ...base,
      period: "daily",
      report_date: day,
      units_sold: total?.units ?? 0,
      gross_revenue: round2(total?.revenue ?? 0),
    });
    rawData.set(`daily:${day}`, { orders: total?.orders ?? [] });
  }
  for (let week = fetchFrom; week <= lastDay; week = addDays(week, 7)) {
    let units = 0;
    let revenue = 0;
    let orderCount = 0;
    for (let i = 0; i < 7; i++) {
      const total = days.get(addDays(week, i));
      units += total?.units ?? 0;
      revenue += total?.revenue ?? 0;
      orderCount += total?.orders.length ?? 0;
    }
    rows.push({
      ...base,
      period: "weekly",
      report_date: week,
      units_sold: units,
      gross_revenue: round2(revenue),
    });
    rawData.set(`weekly:${week}`, { order_count: orderCount });
  }

  const { data: saved, error: upsertError } = await supabase
    .from("sku_sales_reports")
    .upsert(rows, { onConflict: "sku_id,period,report_date" })
    .select("id, period, report_date");

  if (upsertError) {
    return NextResponse.json(
      { error: `Failed to save sales reports: ${upsertError.message}` },
      { status: 500 }
    );
  }

  const { error: rawError } = await supabase.from("sku_sales_raw_data").upsert(
    (saved ?? []).map((report) => ({
      report_id: report.id,
      raw_data: rawData.get(`${report.period}:${report.report_date}`) ?? null,
    })),
    { onConflict: "report_id" }
  );

  if (rawError) {
    return NextResponse.json(
      { error: `Sales reports saved, but raw order data failed to save: ${rawError.message}` },
      { status: 500 }
    );
  }

  const last30 = rows.filter((r) => r.period === "daily");
  return NextResponse.json({
    sku_id: skuId,
    synced_at: syncedAt,
    orders_scanned: ordersScanned,
    truncated: url !== null,
    daily_reports: last30.length,
    weekly_reports: rows.length - last30.length,
    last_30_days: {
      units_sold: last30.reduce((sum, r) => sum + r.units_sold, 0),
      gross_revenue: round2(last30.reduce((sum, r) => sum + r.gross_revenue, 0)),
    },
  });
}
