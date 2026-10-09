import { addDays, formatCurrency, formatDateTime, formatDay } from "@/lib/utils";
import { latestReport, lastSyncedAt, SALES_CHART_DAYS } from "@/lib/sales";
import type { SkuSalesReport } from "@/types";

interface ChartProps {
  reports: SkuSalesReport[];
  // Last day shown ("YYYY-MM-DD"); passed in so server and browser agree
  endDate: string;
}

// Plain HTML/CSS bar chart of daily units sold over the last 30 days
export function SalesBarChart({ reports, endDate }: ChartProps) {
  const unitsByDay = new Map(
    reports.filter((r) => r.period === "daily").map((r) => [r.report_date, r.units_sold])
  );
  const days = Array.from({ length: SALES_CHART_DAYS }, (_, i) => {
    const day = addDays(endDate, i - (SALES_CHART_DAYS - 1));
    return { day, units: unitsByDay.get(day) ?? 0 };
  });
  const max = Math.max(...days.map((d) => d.units), 0);
  const total = days.reduce((sum, d) => sum + d.units, 0);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Units sold, last {SALES_CHART_DAYS} days
        </p>
        <p className="text-xs text-slate-500">
          {total.toLocaleString()} total{max > 0 && ` · peak ${max.toLocaleString()}/day`}
        </p>
      </div>
      <div
        className="flex h-32 items-end gap-0.5 border-b border-slate-200"
        role="img"
        aria-label={`Daily units sold over the last ${SALES_CHART_DAYS} days: ${total} in total`}
      >
        {days.map(({ day, units }) => (
          <div
            key={day}
            title={`${formatDay(day)}: ${units} unit${units === 1 ? "" : "s"}`}
            className="group relative flex h-full flex-1 items-end"
          >
            <div
              className={`w-full rounded-t-sm ${
                units > 0 ? "bg-slate-800 group-hover:bg-slate-600" : "bg-slate-100"
              }`}
              style={{ height: units > 0 && max > 0 ? `${Math.max((units / max) * 100, 3)}%` : "2px" }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-400">
        <span>{formatDay(days[0].day)}</span>
        <span>{formatDay(days[days.length - 1].day)}</span>
      </div>
    </div>
  );
}

interface SummaryProps {
  reports: SkuSalesReport[];
  // Optional label/helper for the gross revenue figure (the portal uses these
  // to distinguish it from revenue at the client's price)
  revenueLabel?: string;
  revenueHint?: string;
  // The admin Sales page shows this in each card's header instead
  showLastSynced?: boolean;
}

// Latest daily + weekly figures and when they were last synced
export function SalesSummary({
  reports,
  revenueLabel,
  revenueHint,
  showLastSynced = true,
}: SummaryProps) {
  const daily = latestReport(reports, "daily");
  const weekly = latestReport(reports, "weekly");
  const synced = lastSyncedAt(reports);

  const tile = (label: string, report: SkuSalesReport | null, dateLabel: string) => (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      {report ? (
        <>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {report.units_sold.toLocaleString()} units
          </p>
          {revenueLabel && <p className="mt-1 text-xs text-slate-500">{revenueLabel}</p>}
          <p className="text-sm text-slate-600">{formatCurrency(report.gross_revenue)}</p>
          {revenueHint && <p className="text-xs text-slate-400">{revenueHint}</p>}
          <p className="mt-1 text-xs text-slate-400">
            {dateLabel} {formatDay(report.report_date)}
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm text-slate-400">No data yet</p>
      )}
    </div>
  );

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {tile("Latest day", daily, "")}
        {tile("Latest week", weekly, "Week of")}
      </div>
      {showLastSynced && (
        <p className="mt-2 text-xs text-slate-400">
          {synced ? `Last synced ${formatDateTime(synced)}` : "Not synced yet"}
        </p>
      )}
    </div>
  );
}
