import { addDays } from "@/lib/utils";
import type { SkuSalesIntegration, SkuSalesReport } from "@/types";

export const SALES_CHART_DAYS = 30;

// Never includes shopify_access_token. Pages that need to know whether a token
// is stored select it server-side and pass it through toSalesIntegration().
export const SALES_INTEGRATION_COLUMNS =
  "id, sku_id, platform, shopify_store_domain, shopify_product_id, shopify_variant_id, updated_at";

export const SALES_REPORT_COLUMNS =
  "id, sku_id, report_date, period, units_sold, gross_revenue, platform, synced_at";

// Server-only: strips the access token down to a boolean before data is handed
// to a client component.
export function toSalesIntegration(
  row: Omit<SkuSalesIntegration, "has_access_token"> & { shopify_access_token: string | null }
): SkuSalesIntegration {
  const { shopify_access_token, ...rest } = row;
  return { ...rest, has_access_token: !!shopify_access_token };
}

// Accepts "mystore.myshopify.com", "https://mystore.myshopify.com/" etc.
// Returns null unless it's a *.myshopify.com host, since the access token is
// sent to this domain.
export function normalizeShopifyDomain(input: string): string | null {
  const host = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(host) ? host : null;
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

// Monday of the week containing `day` ("YYYY-MM-DD")
export function weekStart(day: string): string {
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(day, -((dow + 6) % 7));
}

export function latestReport(reports: SkuSalesReport[], period: "daily" | "weekly") {
  return reports
    .filter((r) => r.period === period)
    .reduce<SkuSalesReport | null>(
      (latest, r) => (!latest || r.report_date > latest.report_date ? r : latest),
      null
    );
}

export function lastSyncedAt(reports: SkuSalesReport[]): string | null {
  return reports.reduce<string | null>(
    (latest, r) => (!latest || r.synced_at > latest ? r.synced_at : latest),
    null
  );
}

// This SKU's report rows for `today` and for the week containing it (if synced)
export function currentFigures(reports: SkuSalesReport[], today: string) {
  const week = weekStart(today);
  return {
    today: reports.find((r) => r.period === "daily" && r.report_date === today) ?? null,
    week: reports.find((r) => r.period === "weekly" && r.report_date === week) ?? null,
  };
}
