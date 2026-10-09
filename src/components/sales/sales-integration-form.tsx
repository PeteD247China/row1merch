"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { normalizeShopifyDomain, SALES_INTEGRATION_COLUMNS } from "@/lib/sales";
import type { SalesPlatform, SkuSalesIntegration } from "@/types";

interface Props {
  skuId: string;
  integration: SkuSalesIntegration | null;
  onSaved: (integration: SkuSalesIntegration) => void;
}

export function SalesIntegrationForm({ skuId, integration, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    platform: integration?.platform ?? "shopify",
    shopify_store_domain: integration?.shopify_store_domain ?? "",
    // Write-only: the stored token is never sent to the browser
    shopify_access_token: "",
    shopify_product_id: integration?.shopify_product_id ?? "",
    shopify_variant_id: integration?.shopify_variant_id ?? "",
  });
  const hasToken = integration?.has_access_token ?? false;

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let domain: string | null = null;
    if (form.platform === "shopify") {
      domain = normalizeShopifyDomain(form.shopify_store_domain);
      if (!domain) {
        setError("Store domain must be a Shopify domain, e.g. mystore.myshopify.com");
        return;
      }
      if (!hasToken && !form.shopify_access_token.trim()) {
        setError("Enter the Shopify access token.");
        return;
      }
      if (!form.shopify_variant_id.trim() && !form.shopify_product_id.trim()) {
        setError("Enter the Shopify variant ID (or a product ID to count all its variants).");
        return;
      }
    }

    setSaving(true);
    try {
      const supabase = createClient();

      const payload: Record<string, string | null> = {
        sku_id: skuId,
        platform: form.platform,
        shopify_store_domain: domain,
        shopify_product_id: form.shopify_product_id.trim() || null,
        shopify_variant_id: form.shopify_variant_id.trim() || null,
        updated_at: new Date().toISOString(),
      };
      // Only send the token when a new one is entered; leaving it out of the
      // upsert keeps the stored one
      if (form.shopify_access_token.trim()) {
        payload.shopify_access_token = form.shopify_access_token.trim();
      }

      const { data, error: saveError } = await supabase
        .from("sku_sales_integrations")
        .upsert(payload, { onConflict: "sku_id" })
        .select(SALES_INTEGRATION_COLUMNS)
        .single();

      if (saveError) {
        setError(saveError.message);
        return;
      }

      onSaved({
        ...(data as Omit<SkuSalesIntegration, "has_access_token">),
        has_access_token: hasToken || !!payload.shopify_access_token,
      });
      setForm((f) => ({ ...f, shopify_access_token: "", shopify_store_domain: domain ?? f.shopify_store_domain }));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Platform</label>
          <Select
            value={form.platform}
            onChange={(e) => set("platform", e.target.value as SalesPlatform)}
          >
            <option value="shopify">Shopify</option>
            <option value="square">Square</option>
          </Select>
        </div>
      </div>

      {form.platform === "square" ? (
        <p className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-slate-600">
          Square sync isn&apos;t available yet. You can save Square as the platform now.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Store Domain</label>
            <Input
              value={form.shopify_store_domain}
              onChange={(e) => set("shopify_store_domain", e.target.value)}
              placeholder="mystore.myshopify.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Access Token</label>
            <Input
              type="password"
              autoComplete="off"
              value={form.shopify_access_token}
              onChange={(e) => set("shopify_access_token", e.target.value)}
              placeholder={hasToken ? "Saved. Enter a new token to replace it" : "shpat_…"}
            />
            <p className="mt-1 text-xs text-slate-400">Needs the read_orders scope</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Product ID</label>
            <Input
              value={form.shopify_product_id}
              onChange={(e) => set("shopify_product_id", e.target.value)}
              placeholder="e.g. 7981234567890"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Variant ID</label>
            <Input
              value={form.shopify_variant_id}
              onChange={(e) => set("shopify_variant_id", e.target.value)}
              placeholder="e.g. 43812345678901"
            />
            <p className="mt-1 text-xs text-slate-400">
              Sales are counted for this variant (or all variants of the product if left blank)
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-green-700">Saved</span>}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save Integration"}
        </Button>
      </div>
    </form>
  );
}
