"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase/client";
import type { Warehouse } from "@/types";

function WarehouseForm({
  warehouse,
  onSuccess,
}: {
  warehouse?: Warehouse;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: warehouse?.name ?? "",
    location: warehouse?.location ?? "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const payload = { name: form.name, location: form.location || null };
    let result;
    if (warehouse) {
      result = await supabase.from("warehouses").update(payload).eq("id", warehouse.id);
    } else {
      result = await supabase.from("warehouses").insert(payload);
    }
    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }
    router.refresh();
    onSuccess();
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Name <span className="text-red-500">*</span></label>
        <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Sydney Warehouse" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
        <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="e.g. Unit 4, 123 Industrial Rd, Sydney" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onSuccess}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : warehouse ? "Update" : "Create"}</Button>
      </div>
    </form>
  );
}

export function WarehousesPageClient({ warehouses: initialWarehouses }: { warehouses: Warehouse[] }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this warehouse?")) return;
    const supabase = createClient();
    await supabase.from("warehouses").delete().eq("id", id);
    router.refresh();
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Warehouses</h1>
          <p className="text-sm text-slate-500 mt-1">{initialWarehouses.length} warehouses</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowModal(true); }}>
          <Plus className="h-4 w-4" />
          Add Warehouse
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {initialWarehouses.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-slate-400 text-sm">No warehouses yet.</td></tr>
            )}
            {initialWarehouses.map((w) => (
              <tr key={w.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{w.name}</td>
                <td className="px-4 py-3 text-slate-600">{w.location ?? "-"}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(w); setShowModal(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(w.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Warehouse" : "Add Warehouse"}>
        <WarehouseForm warehouse={editing ?? undefined} onSuccess={() => setShowModal(false)} />
      </Modal>
    </>
  );
}
