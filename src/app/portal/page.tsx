import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/sku/status-badge";
import { formatCurrency, CLIENT_SKU_COLUMNS } from "@/lib/utils";
import { Package } from "lucide-react";
import { PortalSalesSummary } from "@/components/sales/portal-sales-summary";
import { SALES_REPORT_COLUMNS, todayUtc, weekStart } from "@/lib/sales";

export default async function PortalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: clientRecord } = await supabase
    .from("clients")
    .select("id, company_name")
    .eq("supabase_auth_id", user.id)
    .single();

  if (!clientRecord) redirect("/login");

  const { data: skus } = await supabase
    .from("skus")
    .select(`${CLIENT_SKU_COLUMNS}, supplier:suppliers(name), warehouse:warehouses(name)`)
    .eq("client_id", clientRecord.id)
    .order("created_at", { ascending: false });

  // This week's report rows (daily + weekly) for the summary
  const today = todayUtc();
  const skuIds = (skus ?? []).map((s) => s.id);
  const { data: salesReports } = skuIds.length
    ? await supabase
        .from("sku_sales_reports")
        .select(SALES_REPORT_COLUMNS)
        .in("sku_id", skuIds)
        .gte("report_date", weekStart(today))
    : { data: [] };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome, {clientRecord.company_name}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Your merchandise portfolio — {(skus ?? []).length} products
        </p>
      </div>

      {(salesReports ?? []).length > 0 && (
        <PortalSalesSummary skus={skus ?? []} reports={salesReports ?? []} today={today} />
      )}

      {(skus ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-4">
            <Package className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-700 mb-1">No products yet</h2>
          <p className="text-sm text-slate-400">
            Your Ovation Merch team will add your products here soon.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(skus ?? []).map((sku: any) => (
            <Link
              key={sku.id}
              href={`/portal/skus/${sku.id}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-sm font-mono font-semibold text-slate-600">
                  {sku.sku_code.slice(0, 3).toUpperCase()}
                </div>
                <StatusBadge status={sku.status} />
              </div>
              <h3 className="font-semibold text-slate-900 group-hover:text-slate-700 mb-1">
                {sku.name}
              </h3>
              <p className="text-xs font-mono text-slate-400 mb-3">{sku.sku_code}</p>
              {sku.description && (
                <p className="text-sm text-slate-500 mb-3 line-clamp-2">{sku.description}</p>
              )}
              <div className="flex items-center justify-between text-sm border-t border-slate-50 pt-3">
                <span className="text-slate-500">
                  {sku.stock_qty} in stock
                </span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(sku.client_price)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
