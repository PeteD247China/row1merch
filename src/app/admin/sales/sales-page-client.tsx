"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SalesBarChart, SalesSummary } from "@/components/sales/sales-overview";
import { ClientSalesOverview } from "@/components/sales/client-sales-overview";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { lastSyncedAt, SYNC_ROUTES } from "@/lib/sales";
import type { SalesPlatform, SkuSalesReport } from "@/types";

export interface SalesRow {
  skuId: string;
  skuName: string;
  skuCode: string;
  clientId: string | null;
  clientName: string | null;
  platform: SalesPlatform;
  // Shopify store domain or Square location
  store: string | null;
  reports: SkuSalesReport[];
}

interface Props {
  rows: SalesRow[];
  today: string;
}

type SyncStatus = { kind: "ok" | "error"; message: string };

export function SalesPageClient({ rows, today }: Props) {
  const router = useRouter();
  const [syncing, setSyncing] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, SyncStatus>>({});

  async function handleSync(skuId: string, platform: SalesPlatform) {
    setSyncing(skuId);
    setStatus((s) => {
      const next = { ...s };
      delete next[skuId];
      return next;
    });

    try {
      const res = await fetch(SYNC_ROUTES[platform], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku_id: skuId }),
      });
      const json = await res.json();

      if (!res.ok) {
        setStatus((s) => ({ ...s, [skuId]: { kind: "error", message: json.error ?? "Sync failed." } }));
        return;
      }

      const { units_sold, gross_revenue } = json.last_30_days;
      setStatus((s) => ({
        ...s,
        [skuId]: {
          kind: "ok",
          message: `Synced ${json.orders_scanned} orders: ${units_sold} units, ${formatCurrency(gross_revenue)} in the last 30 days${
            json.truncated ? " (stopped early: too many orders to scan in one sync)" : ""
          }.`,
        },
      }));
      router.refresh();
    } catch {
      setStatus((s) => ({
        ...s,
        [skuId]: { kind: "error", message: "Network error. Please check your connection and try again." },
      }));
    } finally {
      setSyncing(null);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Sales Reporting</h1>
        <p className="text-sm text-slate-500 mt-1">
          SKUs with a sales integration. Set one up from a SKU&apos;s detail page.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-4">
            <ShoppingCart className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-700 mb-1">No sales integrations yet</h2>
          <p className="text-sm text-slate-400">
            Open a SKU and add its Shopify details in the Sales Integration card.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <ClientSalesOverview rows={rows} today={today} />
          <h2 className="pt-4 text-sm font-semibold text-slate-500 uppercase tracking-wide">By SKU</h2>
          {rows.map((row) => {
            const rowStatus = status[row.skuId];
            return (
              <Card key={row.skuId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <Link
                        href={`/admin/skus/${row.skuId}`}
                        className="text-base font-semibold text-slate-900 hover:underline"
                      >
                        {row.skuName}
                      </Link>
                      <p className="text-xs text-slate-500">
                        <span className="font-mono">{row.skuCode}</span>
                        {row.clientName && ` · ${row.clientName}`}
                        {` · ${row.platform === "shopify" ? "Shopify" : "Square"}`}
                        {row.store && ` · ${row.store}`}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {(() => {
                          const synced = lastSyncedAt(row.reports);
                          return synced ? `Last synced ${formatDateTime(synced)}` : "Never synced";
                        })()}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSync(row.skuId, row.platform)}
                      disabled={syncing !== null}
                    >
                      <RefreshCw className={`h-4 w-4 ${syncing === row.skuId ? "animate-spin" : ""}`} />
                      {syncing === row.skuId ? "Syncing…" : "Sync Now"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {rowStatus && (
                    <div
                      className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
                        rowStatus.kind === "ok"
                          ? "bg-green-50 border-green-200 text-green-800"
                          : "bg-red-50 border-red-200 text-red-700"
                      }`}
                    >
                      {rowStatus.message}
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-1">
                      <SalesSummary reports={row.reports} showLastSynced={false} />
                    </div>
                    <div className="col-span-2">
                      <SalesBarChart reports={row.reports} endDate={today} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
