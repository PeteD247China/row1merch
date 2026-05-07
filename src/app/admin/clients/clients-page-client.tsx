"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/sku/status-badge";
import type { Client } from "@/types";

interface SKURow {
  id: string;
  name: string;
  sku_code: string;
  status: any;
  client_id: string;
}

interface Props {
  clients: Client[];
  skus: SKURow[];
}

export function ClientsPageClient({ clients, skus }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    company_name: "",
    email: "",
    password: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Create auth user via admin endpoint
    const res = await fetch("/api/admin/create-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const result = await res.json();
    if (!res.ok) {
      setError(result.error ?? "Failed to create client");
      setSaving(false);
      return;
    }

    router.refresh();
    setShowModal(false);
    setForm({ company_name: "", email: "", password: "" });
    setSaving(false);
  }

  const clientSkus = (clientId: string) => skus.filter((s) => s.client_id === clientId);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500 mt-1">{clients.length} clients</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
      </div>

      <div className="space-y-3">
        {clients.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-sm text-slate-400">No clients yet.</p>
          </div>
        )}
        {clients.map((client) => {
          const isExpanded = expanded === client.id;
          const clientSkuList = clientSkus(client.id);
          return (
            <div
              key={client.id}
              className="rounded-xl border border-slate-200 bg-white overflow-hidden"
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : client.id)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 text-left"
              >
                <div>
                  <p className="font-semibold text-slate-900">{client.company_name}</p>
                  <p className="text-sm text-slate-500">{client.email}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-500">
                    {clientSkuList.length} SKU{clientSkuList.length !== 1 ? "s" : ""}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </div>
              </button>
              {isExpanded && (
                <div className="border-t border-slate-100 px-6 py-4">
                  {clientSkuList.length === 0 ? (
                    <p className="text-sm text-slate-400">No SKUs assigned.</p>
                  ) : (
                    <div className="space-y-2">
                      {clientSkuList.map((sku) => (
                        <div key={sku.id} className="flex items-center justify-between py-1.5">
                          <div>
                            <span className="text-sm font-medium text-slate-800">{sku.name}</span>
                            <span className="ml-2 font-mono text-xs text-slate-400">{sku.sku_code}</span>
                          </div>
                          <StatusBadge status={sku.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Client">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Company Name <span className="text-red-500">*</span>
            </label>
            <Input
              required
              value={form.company_name}
              onChange={(e) => set("company_name", e.target.value)}
              placeholder="Acme Corp"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <Input
              required
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="client@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Initial Password <span className="text-red-500">*</span>
            </label>
            <Input
              required
              type="password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="Set a temporary password"
              minLength={6}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Client"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
