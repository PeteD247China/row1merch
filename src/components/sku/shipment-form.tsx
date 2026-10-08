"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { addDays, formatDay, SHIPMENT_DESTINATION_LABELS } from "@/lib/utils";
import type { SkuShipment, ShipmentDestination } from "@/types";

interface Props {
  skuId: string;
  shipment: SkuShipment | null;
  onSaved: (shipment: SkuShipment) => void;
}

export function ShipmentForm({ skuId, shipment, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    production_start_date: shipment?.production_start_date ?? "",
    estimated_production_days: shipment?.estimated_production_days?.toString() ?? "",
    dispatch_date: shipment?.dispatch_date ?? "",
    estimated_transit_days: shipment?.estimated_transit_days?.toString() ?? "",
    actual_arrival_date: shipment?.actual_arrival_date ?? "",
    destination: shipment?.destination ?? "",
    destination_notes: shipment?.notes?.destination_notes ?? "",
  });

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  }

  const productionDays = parseInt(form.estimated_production_days);
  const transitDays = parseInt(form.estimated_transit_days);

  const estimatedComplete =
    form.production_start_date && !isNaN(productionDays)
      ? addDays(form.production_start_date, productionDays)
      : null;

  // Before dispatch, estimate arrival from the expected production finish
  const transitFrom = form.dispatch_date || estimatedComplete;
  const estimatedArrival =
    transitFrom && !isNaN(transitDays) ? addDays(transitFrom, transitDays) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      const payload = {
        sku_id: skuId,
        production_start_date: form.production_start_date || null,
        estimated_production_days: isNaN(productionDays) ? null : productionDays,
        estimated_production_complete: estimatedComplete,
        dispatch_date: form.dispatch_date || null,
        estimated_transit_days: isNaN(transitDays) ? null : transitDays,
        estimated_arrival_date: estimatedArrival,
        actual_arrival_date: form.actual_arrival_date || null,
        destination: (form.destination || null) as ShipmentDestination | null,
      };

      const result = shipment
        ? await supabase.from("sku_shipments").update(payload).eq("id", shipment.id).select().single()
        : await supabase.from("sku_shipments").insert(payload).select().single();

      if (result.error) {
        setError(result.error.message);
        return;
      }

      // Destination notes live in the admin-only sku_shipment_notes table
      const notes = { destination_notes: form.destination_notes || null };
      const { error: notesError } = await supabase
        .from("sku_shipment_notes")
        .upsert({ shipment_id: result.data.id, ...notes });

      if (notesError) {
        onSaved({ ...result.data, notes: shipment?.notes ?? null });
        setError(`Shipment saved, but destination notes failed to save: ${notesError.message}`);
        return;
      }

      onSaved({ ...result.data, notes });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Production Start Date
          </label>
          <Input
            type="date"
            value={form.production_start_date}
            onChange={(e) => set("production_start_date", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Est. Production Days
          </label>
          <Input
            type="number"
            min="0"
            value={form.estimated_production_days}
            onChange={(e) => set("estimated_production_days", e.target.value)}
            placeholder="e.g. 30"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Est. Production Complete
          </label>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {estimatedComplete ? formatDay(estimatedComplete) : "-"}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Dispatch Date
          </label>
          <Input
            type="date"
            value={form.dispatch_date}
            onChange={(e) => set("dispatch_date", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Est. Transit Days
          </label>
          <Input
            type="number"
            min="0"
            value={form.estimated_transit_days}
            onChange={(e) => set("estimated_transit_days", e.target.value)}
            placeholder="e.g. 21"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Est. Arrival
          </label>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {estimatedArrival ? formatDay(estimatedArrival) : "-"}
          </div>
          {estimatedArrival && !form.dispatch_date && (
            <p className="mt-1 text-xs text-slate-400">From est. production complete</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Actual Arrival Date
          </label>
          <Input
            type="date"
            value={form.actual_arrival_date}
            onChange={(e) => set("actual_arrival_date", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Destination
          </label>
          <Select
            value={form.destination}
            onChange={(e) => set("destination", e.target.value)}
          >
            <option value="">Select destination</option>
            {Object.entries(SHIPMENT_DESTINATION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Destination Notes
        </label>
        <Textarea
          rows={2}
          value={form.destination_notes}
          onChange={(e) => set("destination_notes", e.target.value)}
          placeholder="Address, contact, delivery instructions…"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-green-700">Saved</span>}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save Shipment"}
        </Button>
      </div>
    </form>
  );
}
