import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { SKU } from "@/types";

export type StockControlSku = Pick<
  SKU,
  | "id"
  | "sku_code"
  | "name"
  | "status"
  | "stock_qty"
  | "stock_warehouse"
  | "stock_theatre"
  | "reorder_point"
  | "client_price"
> & {
  client: { id: string; company_name: string } | null;
  cost: { resale_price: number | null } | null;
};

interface Props {
  skus: StockControlSku[];
}

export function isLowStock(sku: Pick<SKU, "status" | "stock_qty" | "reorder_point">) {
  return sku.status !== "discontinued" && sku.stock_qty <= sku.reorder_point;
}

export function StockControlTable({ skus }: Props) {
  const groups = new Map<string, { id: string; name: string; skus: StockControlSku[] }>();
  for (const sku of skus) {
    const key = sku.client?.id ?? "none";
    if (!groups.has(key)) {
      groups.set(key, { id: key, name: sku.client?.company_name ?? "No client", skus: [] });
    }
    groups.get(key)!.skus.push(sku);
  }
  const clients = Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));

  if (clients.length === 0) {
    return <p className="px-6 py-8 text-center text-sm text-slate-400">No SKUs yet.</p>;
  }

  const th = "px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide";
  const sum = (list: StockControlSku[], field: "stock_qty" | "stock_warehouse" | "stock_theatre") =>
    list.reduce((total, s) => total + s[field], 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-100">
          <tr>
            <th className={`${th} text-left`}>Product</th>
            <th className={`${th} text-right`}>Total</th>
            <th className={`${th} text-right`}>Warehouse</th>
            <th className={`${th} text-right`}>Theatre</th>
            <th className={`${th} text-right`}>Reorder Pt</th>
            <th className={`${th} text-right`}>Resale</th>
            <th className={`${th} text-right`}>Client Price</th>
            <th className={th} />
          </tr>
        </thead>
        {clients.map((client) => (
          <tbody key={client.id} className="border-b border-slate-100">
            <tr className="bg-slate-50">
              <td colSpan={8} className="px-4 py-2 text-xs font-semibold text-slate-700">
                {client.name}
              </td>
            </tr>
            {client.skus.map((sku) => {
              const low = isLowStock(sku);
              return (
                <tr key={sku.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/skus/${sku.id}`} className="font-medium text-slate-900 hover:underline">
                      {sku.name}
                    </Link>
                    <p className="text-xs font-mono text-slate-400">{sku.sku_code}</p>
                  </td>
                  <td className={`px-4 py-2.5 text-right font-medium ${low ? "text-red-600" : "text-slate-900"}`}>
                    {sku.stock_qty}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{sku.stock_warehouse}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{sku.stock_theatre}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{sku.reorder_point}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">
                    {sku.cost?.resale_price != null ? formatCurrency(sku.cost.resale_price) : "-"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">
                    {formatCurrency(sku.client_price)}
                  </td>
                  <td className="px-4 py-2.5">
                    {low && (
                      <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-red-600">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Low stock
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            <tr className="font-semibold text-slate-900">
              <td className="px-4 py-2.5 text-xs uppercase tracking-wide text-slate-500">
                {client.name} total
              </td>
              <td className="px-4 py-2.5 text-right">{sum(client.skus, "stock_qty")}</td>
              <td className="px-4 py-2.5 text-right">{sum(client.skus, "stock_warehouse")}</td>
              <td className="px-4 py-2.5 text-right">{sum(client.skus, "stock_theatre")}</td>
              <td colSpan={4} />
            </tr>
          </tbody>
        ))}
      </table>
    </div>
  );
}
