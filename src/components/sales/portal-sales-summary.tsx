import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDay } from "@/lib/utils";
import { currentFigures, weekStart } from "@/lib/sales";
import type { SkuSalesReport } from "@/types";

interface Props {
  skus: { id: string; name: string; client_price: number }[];
  reports: SkuSalesReport[];
  today: string;
}

// Client portal: their own totals for today and this week. Revenue is valued
// at the client's price per unit (client_price × units sold).
export function PortalSalesSummary({ skus, reports, today }: Props) {
  const perSku = skus.map((sku) => {
    const { today: day, week } = currentFigures(
      reports.filter((r) => r.sku_id === sku.id),
      today
    );
    const unitsToday = day?.units_sold ?? 0;
    const unitsWeek = week?.units_sold ?? 0;
    return {
      ...sku,
      unitsToday,
      unitsWeek,
      revenueToday: unitsToday * sku.client_price,
      revenueWeek: unitsWeek * sku.client_price,
    };
  });

  const sum = (pick: (s: (typeof perSku)[number]) => number) =>
    perSku.reduce((total, s) => total + pick(s), 0);
  const top = perSku.reduce<(typeof perSku)[number] | null>(
    (best, s) => (s.unitsWeek > (best?.unitsWeek ?? 0) ? s : best),
    null
  );

  const stat = (label: string, value: string, hint?: string) => (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
  const revenueHint = "Based on units sold × your Row1Merch price";

  return (
    <Card className="mb-8">
      <CardContent className="py-5">
        <div className="flex items-baseline justify-between mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sales</p>
          <p className="text-xs text-slate-400">
            Today ({formatDay(today)}) and week of {formatDay(weekStart(today))}
          </p>
        </div>
        <div className="grid grid-cols-5 gap-6">
          {stat("Units today", sum((s) => s.unitsToday).toLocaleString())}
          {stat("Units this week", sum((s) => s.unitsWeek).toLocaleString())}
          {stat("Your Revenue (at client price) today", formatCurrency(sum((s) => s.revenueToday)), revenueHint)}
          {stat("Your Revenue (at client price) this week", formatCurrency(sum((s) => s.revenueWeek)), revenueHint)}
          <div>
            <p className="text-xs text-slate-500">Top seller this week</p>
            {top ? (
              <>
                <Link
                  href={`/portal/skus/${top.id}`}
                  className="mt-0.5 block truncate text-sm font-semibold text-slate-900 hover:underline"
                >
                  {top.name}
                </Link>
                <p className="text-xs text-slate-500">{top.unitsWeek.toLocaleString()} units</p>
              </>
            ) : (
              <p className="mt-0.5 text-sm text-slate-400">No sales yet this week</p>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Figures update when sales are synced.
        </p>
      </CardContent>
    </Card>
  );
}
