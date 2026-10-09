import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDay } from "@/lib/utils";
import { currentFigures, latestReport, weekStart } from "@/lib/sales";
import type { SkuSalesReport } from "@/types";

interface SkuSales {
  skuId: string;
  skuName: string;
  skuCode: string;
  clientId: string | null;
  clientName: string | null;
  reports: SkuSalesReport[];
}

interface Props {
  rows: SkuSales[];
  today: string;
}

// Admin view: today's and this week's sales totals per client, using Shopify
// gross revenue, plus each SKU's latest daily figure.
export function ClientSalesOverview({ rows, today }: Props) {
  const clients = new Map<string, { name: string; skus: SkuSales[] }>();
  for (const row of rows) {
    const key = row.clientId ?? "none";
    if (!clients.has(key)) clients.set(key, { name: row.clientName ?? "No client", skus: [] });
    clients.get(key)!.skus.push(row);
  }

  const groups = Array.from(clients.entries())
    .map(([id, client]) => {
      const skus = client.skus
        .map((sku) => ({ ...sku, ...currentFigures(sku.reports, today), latest: latestReport(sku.reports, "daily") }))
        .sort((a, b) => (b.latest?.units_sold ?? 0) - (a.latest?.units_sold ?? 0));
      const total = (pick: (s: (typeof skus)[number]) => number) => skus.reduce((sum, s) => sum + pick(s), 0);
      return {
        id,
        name: client.name,
        skus,
        unitsToday: total((s) => s.today?.units_sold ?? 0),
        unitsWeek: total((s) => s.week?.units_sold ?? 0),
        revenueToday: total((s) => s.today?.gross_revenue ?? 0),
        revenueWeek: total((s) => s.week?.gross_revenue ?? 0),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const stat = (label: string, value: string) => (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between">
          <CardTitle>Sales by Client</CardTitle>
          <span className="text-xs text-slate-500">
            Today ({formatDay(today)}) and week of {formatDay(weekStart(today))} · as of each SKU&apos;s last sync
          </span>
        </div>
      </CardHeader>
      <div className="divide-y divide-slate-100">
        {groups.map((group) => (
          <div key={group.id} className="px-6 py-4">
            <div className="flex items-start justify-between gap-6">
              <h3 className="text-sm font-semibold text-slate-900 pt-1">{group.name}</h3>
              <div className="grid grid-cols-4 gap-8 text-right">
                {stat("Units today", group.unitsToday.toLocaleString())}
                {stat("Units this week", group.unitsWeek.toLocaleString())}
                {stat("Revenue today", formatCurrency(group.revenueToday))}
                {stat("Revenue this week", formatCurrency(group.revenueWeek))}
              </div>
            </div>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400">
                  <th className="py-1 text-left font-medium">Product</th>
                  <th className="py-1 text-right font-medium">Latest day</th>
                  <th className="py-1 text-right font-medium">Units</th>
                  <th className="py-1 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {group.skus.map((sku) => (
                  <tr key={sku.skuId} className="border-t border-slate-50">
                    <td className="py-1.5">
                      <Link href={`/admin/skus/${sku.skuId}`} className="text-slate-900 hover:underline">
                        {sku.skuName}
                      </Link>{" "}
                      <span className="text-xs font-mono text-slate-400">{sku.skuCode}</span>
                    </td>
                    <td className="py-1.5 text-right text-slate-500">
                      {sku.latest ? formatDay(sku.latest.report_date) : "Not synced"}
                    </td>
                    <td className="py-1.5 text-right font-medium text-slate-900">
                      {sku.latest ? sku.latest.units_sold.toLocaleString() : "-"}
                    </td>
                    <td className="py-1.5 text-right text-slate-600">
                      {sku.latest ? formatCurrency(sku.latest.gross_revenue) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </Card>
  );
}
