"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/sku/status-badge";
import { SkuForm } from "@/components/sku/sku-form";
import { formatCurrency } from "@/lib/utils";
import type { SKU, Client, Supplier, Warehouse } from "@/types";

interface Props {
  skus: (SKU & { supplier?: Supplier; warehouse?: any; client?: any })[];
  clients: Client[];
  suppliers: Supplier[];
  warehouses: Warehouse[];
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "in_review", label: "In Review" },
  { value: "sample_pending", label: "Sample Pending" },
  { value: "in_production", label: "In Production" },
  { value: "in_transit", label: "In Transit" },
  { value: "landed", label: "Landed" },
  { value: "on_sale", label: "On Sale" },
  { value: "discontinued", label: "Discontinued" },
];

export function SkuTableClient({ skus, clients, suppliers, warehouses }: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");

  const filtered = skus.filter((sku) => {
    const matchSearch =
      !search ||
      sku.name.toLowerCase().includes(search.toLowerCase()) ||
      sku.sku_code.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || sku.status === statusFilter;
    const matchClient = !clientFilter || sku.client_id === clientFilter;
    return matchSearch && matchStatus && matchClient;
  });

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SKUs</h1>
          <p className="text-sm text-slate-500 mt-1">{skus.length} total products</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" />
          Add SKU
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search SKUs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="w-44"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select
          className="w-44"
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
        >
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company_name}
            </option>
          ))}
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                SKU
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Product
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Client
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Supplier
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Cost
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Client Price
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Stock
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Status
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-400 text-sm">
                  {skus.length === 0 ? "No SKUs yet. Add your first product." : "No SKUs match your filters."}
                </td>
              </tr>
            )}
            {filtered.map((sku) => (
              <tr key={sku.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {sku.sku_code}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{sku.name}</p>
                  {sku.description && (
                    <p className="text-xs text-slate-400 truncate max-w-[200px]">{sku.description}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {(sku as any).client?.company_name ?? "-"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {sku.supplier?.name ?? "-"}
                </td>
                <td className="px-4 py-3 text-right text-slate-700">
                  {formatCurrency(sku.cost_price)}
                </td>
                <td className="px-4 py-3 text-right text-slate-700">
                  {formatCurrency(sku.client_price)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={
                      sku.stock_qty <= sku.reorder_point
                        ? "text-red-600 font-medium"
                        : "text-slate-700"
                    }
                  >
                    {sku.stock_qty}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={sku.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/skus/${sku.id}`}
                    className="text-xs font-medium text-slate-500 hover:text-slate-900"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add SKU"
        size="lg"
      >
        <SkuForm
          clients={clients}
          suppliers={suppliers}
          warehouses={warehouses}
          onSuccess={() => setShowAddModal(false)}
        />
      </Modal>
    </>
  );
}
