import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/sku/status-badge";
import {
  Package,
  Users,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import type { SKU } from "@/types";
import {
  StockControlTable,
  isLowStock,
  type StockControlSku,
} from "@/components/stock/stock-control-table";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [
    { data: skus },
    { count: totalClients },
    { data: stockSkus },
  ] = await Promise.all([
    supabase
      .from("skus")
      .select("*, supplier:suppliers(name), warehouse:warehouses(name), client:clients(company_name)")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("role", "client"),
    supabase
      .from("skus")
      .select(
        "id, sku_code, name, status, stock_qty, stock_warehouse, stock_theatre, reorder_point, client_price, client:clients(id, company_name), cost:sku_costs(resale_price)"
      )
      .order("name")
      .returns<StockControlSku[]>(),
  ]);

  // PostgREST can't compare two columns, so filter here
  const lowStockSkus = (stockSkus ?? []).filter(isLowStock);

  const statusCounts: Record<string, number> = {};
  (skus ?? []).forEach((s: SKU) => {
    statusCounts[s.status] = (statusCounts[s.status] ?? 0) + 1;
  });

  const { count: totalSkus } = await supabase
    .from("skus")
    .select("*", { count: "exact", head: true });

  const { count: activeSkus } = await supabase
    .from("skus")
    .select("*", { count: "exact", head: true })
    .eq("status", "on_sale");

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Overview of all inventory and clients</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalSkus ?? 0}</p>
              <p className="text-xs text-slate-500">Total SKUs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{activeSkus ?? 0}</p>
              <p className="text-xs text-slate-500">On Sale</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalClients ?? 0}</p>
              <p className="text-xs text-slate-500">Clients</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{lowStockSkus?.length ?? 0}</p>
              <p className="text-xs text-slate-500">Low Stock</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Recent SKUs */}
        <div className="col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent SKUs</CardTitle>
                <Link
                  href="/admin/skus"
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  View all
                </Link>
              </div>
            </CardHeader>
            <div className="divide-y divide-slate-50">
              {(skus ?? []).length === 0 && (
                <div className="px-6 py-8 text-center text-sm text-slate-400">
                  No SKUs yet. <Link href="/admin/skus" className="text-slate-700 underline">Add the first one.</Link>
                </div>
              )}
              {(skus ?? []).map((sku: any) => (
                <div key={sku.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-xs font-mono font-medium text-slate-600">
                      {sku.sku_code.slice(0, 3).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{sku.name}</p>
                      <p className="text-xs text-slate-500">{sku.sku_code} · {sku.client?.company_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-600">
                      {sku.stock_qty} units
                    </span>
                    <StatusBadge status={sku.status} />
                    <Link
                      href={`/admin/skus/${sku.id}`}
                      className="text-xs text-slate-400 hover:text-slate-700"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Low Stock Alerts */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Low Stock Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {(lowStockSkus ?? []).length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">
                  All stock levels are healthy.
                </p>
              ) : (
                <div className="space-y-3">
                  {(lowStockSkus ?? []).map((sku: any) => (
                    <div key={sku.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{sku.name}</p>
                        <p className="text-xs text-slate-500">{sku.sku_code}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-red-600">{sku.stock_qty}</p>
                        <p className="text-xs text-slate-400">min {sku.reorder_point}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stock Control */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Stock Control</CardTitle>
            <span className="text-xs text-slate-500">Warehouse vs theatre/venue, by client</span>
          </div>
        </CardHeader>
        <StockControlTable skus={stockSkus ?? []} />
      </Card>
    </div>
  );
}
