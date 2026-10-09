// Shared by the platform sync routes (server-only: reads tokens, writes reports).
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/utils";
import { todayUtc, weekStart, SALES_CHART_DAYS } from "@/lib/sales";
import type { SalesPlatform } from "@/types";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export interface DayTotal {
  units: number;
  revenue: number;
  orders: { id: string | number; name?: string; quantity: number }[];
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

// Returns the admin's Supabase client, or an error response to send back
export async function requireAdmin(): Promise<
  { supabase: ServerClient; response?: never } | { supabase?: never; response: NextResponse }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: adminRecord } = await supabase
    .from("clients")
    .select("role")
    .eq("supabase_auth_id", user.id)
    .single();

  if (adminRecord?.role !== "admin") {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { supabase };
}

// Daily rows cover the last 30 days. Weekly rows start on the Monday before
// that, so every week written is complete rather than a partial count.
export function syncWindow() {
  const today = todayUtc();
  const dailyStart = addDays(today, -(SALES_CHART_DAYS - 1));
  return { today, dailyStart, fetchFrom: weekStart(dailyStart) };
}

export function addSale(
  days: Map<string, DayTotal>,
  day: string,
  units: number,
  revenue: number,
  order: DayTotal["orders"][number]
) {
  const total = days.get(day) ?? { units: 0, revenue: 0, orders: [] };
  total.units += units;
  total.revenue += revenue;
  total.orders.push(order);
  days.set(day, total);
}

// Writes daily + weekly rows to sku_sales_reports and the order references to
// the admin-only sku_sales_raw_data, then returns the sync summary response.
export async function saveSalesReports(
  supabase: ServerClient,
  opts: {
    skuId: string;
    platform: SalesPlatform;
    days: Map<string, DayTotal>;
    window: ReturnType<typeof syncWindow>;
    ordersScanned: number;
    truncated: boolean;
  }
) {
  const { skuId, platform, days, ordersScanned, truncated } = opts;
  const { today, dailyStart, fetchFrom } = opts.window;

  // Stores ahead of UTC can already have orders dated "tomorrow"
  const lastDay = Array.from(days.keys()).reduce((max, d) => (d > max ? d : max), today);
  const syncedAt = new Date().toISOString();
  const base = { sku_id: skuId, platform, synced_at: syncedAt };

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
    platform,
    synced_at: syncedAt,
    orders_scanned: ordersScanned,
    truncated,
    daily_reports: last30.length,
    weekly_reports: rows.length - last30.length,
    last_30_days: {
      units_sold: last30.reduce((sum, r) => sum + r.units_sold, 0),
      gross_revenue: round2(last30.reduce((sum, r) => sum + r.gross_revenue, 0)),
    },
  });
}
