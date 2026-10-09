import { createClient } from "@/lib/supabase/server";
import { SALES_INTEGRATION_COLUMNS, SALES_REPORT_COLUMNS, todayUtc } from "@/lib/sales";
import { SalesPageClient, type SalesRow } from "./sales-page-client";
import type { SkuSalesReport } from "@/types";

// Most recent report rows per SKU: covers 30 daily + ~5 weekly rows
const REPORTS_PER_SKU = 40;

export default async function SalesPage() {
  const supabase = await createClient();

  const { data: integrations } = await supabase
    .from("sku_sales_integrations")
    .select(`${SALES_INTEGRATION_COLUMNS}, sku:skus(id, sku_code, name, client:clients(company_name))`)
    .order("created_at");

  // One query per SKU so a large catalogue can't hit the API's row cap
  const rows: SalesRow[] = await Promise.all(
    (integrations ?? []).map(async (integration: any) => {
      const { data: reports } = await supabase
        .from("sku_sales_reports")
        .select(SALES_REPORT_COLUMNS)
        .eq("sku_id", integration.sku_id)
        .order("report_date", { ascending: false })
        .limit(REPORTS_PER_SKU);
      return {
        skuId: integration.sku_id,
        skuName: integration.sku?.name ?? "Unknown SKU",
        skuCode: integration.sku?.sku_code ?? "",
        clientName: integration.sku?.client?.company_name ?? null,
        platform: integration.platform,
        storeDomain: integration.shopify_store_domain,
        reports: (reports ?? []) as SkuSalesReport[],
      };
    })
  );

  return (
    <div className="p-8">
      <SalesPageClient rows={rows} today={todayUtc()} />
    </div>
  );
}
