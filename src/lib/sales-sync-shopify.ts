// Shopify sales sync for one SKU. Server-only: reads the access token.
import { addDays } from "@/lib/utils";
import { normalizeShopifyDomain } from "@/lib/sales";
import {
  addSale,
  saveSalesReports,
  syncFailure,
  syncWindow,
  type DayTotal,
  type DbClient,
  type SyncResult,
} from "@/lib/sales-sync";

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

export async function syncShopify(supabase: DbClient, skuId: string): Promise<SyncResult> {
  // The token is read here, server-side only, and never returned
  const { data: integration } = await supabase
    .from("sku_sales_integrations")
    .select("platform, shopify_store_domain, shopify_access_token, shopify_product_id, shopify_variant_id")
    .eq("sku_id", skuId)
    .maybeSingle();

  if (!integration) {
    return syncFailure(404, "No sales integration set up for this SKU");
  }
  if (integration.platform !== "shopify") {
    return syncFailure(400, "This SKU's integration isn't Shopify");
  }

  const domain = normalizeShopifyDomain(integration.shopify_store_domain ?? "");
  const token = integration.shopify_access_token;
  const variantId = integration.shopify_variant_id?.trim() || null;
  const productId = integration.shopify_product_id?.trim() || null;

  if (!domain || !token || (!variantId && !productId)) {
    return syncFailure(400, "Integration is incomplete: needs a *.myshopify.com domain, access token, and a variant or product ID");
  }

  const window = syncWindow();
  const days = new Map<string, DayTotal>();
  let ordersScanned = 0;

  // A day of slack either side of UTC, since order dates are in shop time
  const params = new URLSearchParams({
    status: "any",
    limit: "250",
    created_at_min: `${addDays(window.fetchFrom, -1)}T00:00:00Z`,
    fields: "id,name,created_at,cancelled_at,test,line_items",
  });
  let url: string | null = `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/orders.json?${params}`;

  try {
    for (let page = 0; url && page < MAX_PAGES; page++) {
      const res = await fetchShopify(url, token);
      if (!res.ok) {
        return syncFailure(502, shopifyError(res.status));
      }

      const { orders } = (await res.json()) as { orders: ShopifyOrder[] };
      ordersScanned += orders.length;

      for (const order of orders) {
        if (order.cancelled_at || order.test) continue;
        const day = order.created_at.slice(0, 10); // shop-local date
        if (day < window.fetchFrom) continue;

        for (const item of order.line_items) {
          const matches = variantId
            ? String(item.variant_id) === variantId
            : String(item.product_id) === productId;
          if (!matches) continue;

          addSale(days, day, item.quantity, parseFloat(item.price) * item.quantity, {
            id: order.id,
            name: order.name,
            quantity: item.quantity,
          });
        }
      }

      // Cursor pagination: Link: <...page_info=...>; rel="next"
      const next = res.headers.get("Link")?.match(/<([^>]+)>;\s*rel="next"/);
      url = next ? next[1] : null;
    }
  } catch {
    return syncFailure(502, "Could not reach Shopify. Please try again.");
  }

  return saveSalesReports(supabase, {
    skuId,
    platform: "shopify",
    days,
    window,
    ordersScanned,
    truncated: url !== null,
  });
}
