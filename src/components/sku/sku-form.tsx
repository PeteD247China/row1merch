"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import type { SKU, Client, Supplier, Warehouse } from "@/types";

const SKU_STATUSES = [
  { value: "in_review", label: "In Review" },
  { value: "sample_pending", label: "Sample Pending" },
  { value: "in_production", label: "In Production" },
  { value: "in_transit", label: "In Transit" },
  { value: "landed", label: "Landed" },
  { value: "on_sale", label: "On Sale" },
  { value: "discontinued", label: "Discontinued" },
];

interface SkuFormProps {
  sku?: SKU;
  clients: Client[];
  suppliers: Supplier[];
  warehouses: Warehouse[];
  onSuccess?: () => void;
}

export function SkuForm({ sku, clients, suppliers, warehouses, onSuccess }: SkuFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    sku_code: sku?.sku_code ?? "",
    name: sku?.name ?? "",
    description: sku?.description ?? "",
    cost_price: sku?.cost_price?.toString() ?? "",
    client_price: sku?.client_price?.toString() ?? "",
    landed_cost_per_unit: sku?.landed_cost_per_unit?.toString() ?? "",
    status: sku?.status ?? "in_review",
    stock_qty: sku?.stock_qty?.toString() ?? "0",
    reorder_point: sku?.reorder_point?.toString() ?? "0",
    supplier_id: sku?.supplier_id ?? "",
    warehouse_id: sku?.warehouse_id ?? "",
    client_id: sku?.client_id ?? "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();

    const payload = {
      sku_code: form.sku_code,
      name: form.name,
      description: form.description || null,
      cost_price: parseFloat(form.cost_price),
      client_price: parseFloat(form.client_price),
      landed_cost_per_unit: parseFloat(form.landed_cost_per_unit) || 0,
      status: form.status,
      stock_qty: parseInt(form.stock_qty),
      reorder_point: parseInt(form.reorder_point),
      supplier_id: form.supplier_id || null,
      warehouse_id: form.warehouse_id || null,
      client_id: form.client_id,
    };

    let result;
    if (sku) {
      result = await supabase.from("skus").update(payload).eq("id", sku.id);
    } else {
      result = await supabase.from("skus").insert(payload);
    }

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    router.refresh();
    onSuccess?.();
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            SKU Code <span className="text-red-500">*</span>
          </label>
          <Input
            required
            value={form.sku_code}
            onChange={(e) => set("sku_code", e.target.value)}
            placeholder="e.g. TSHIRT-001"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Status <span className="text-red-500">*</span>
          </label>
          <Select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
          >
            {SKU_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Product Name <span className="text-red-500">*</span>
        </label>
        <Input
          required
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Classic Logo Tee"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Description
        </label>
        <Textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          placeholder="Product description..."
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Cost Price (£) <span className="text-red-500">*</span>
          </label>
          <Input
            required
            type="number"
            step="0.01"
            min="0"
            value={form.cost_price}
            onChange={(e) => set("cost_price", e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Landed Cost per Unit (£)
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={form.landed_cost_per_unit}
            onChange={(e) => set("landed_cost_per_unit", e.target.value)}
            placeholder="0.00"
          />
          <p className="mt-1 text-xs text-slate-400">
            Total cost per unit inc. freight, duty &amp; clearance
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Client Price (£) <span className="text-red-500">*</span>
          </label>
          <Input
            required
            type="number"
            step="0.01"
            min="0"
            value={form.client_price}
            onChange={(e) => set("client_price", e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Current Stock
          </label>
          <Input
            type="number"
            min="0"
            value={form.stock_qty}
            onChange={(e) => set("stock_qty", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Reorder Point
          </label>
          <Input
            type="number"
            min="0"
            value={form.reorder_point}
            onChange={(e) => set("reorder_point", e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Client <span className="text-red-500">*</span>
        </label>
        <Select
          required
          value={form.client_id}
          onChange={(e) => set("client_id", e.target.value)}
        >
          <option value="">Select client...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company_name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Supplier
          </label>
          <Select
            value={form.supplier_id}
            onChange={(e) => set("supplier_id", e.target.value)}
          >
            <option value="">No supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Warehouse
          </label>
          <Select
            value={form.warehouse_id}
            onChange={(e) => set("warehouse_id", e.target.value)}
          >
            <option value="">No warehouse</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : sku ? "Update SKU" : "Create SKU"}
        </Button>
      </div>
    </form>
  );
}
