import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { DbClient, SyncResult } from "@/lib/sales-sync";
import { syncShopify } from "@/lib/sales-sync-shopify";
import { syncSquare } from "@/lib/sales-sync-square";
import type { SalesPlatform } from "@/types";

const SYNCS: Record<SalesPlatform, (supabase: DbClient, skuId: string) => Promise<SyncResult>> = {
  shopify: syncShopify,
  square: syncSquare,
};

// Syncs run a few at a time so one slow store can't hold up the rest
const CONCURRENCY = 3;

// Daily sales sync for every SKU with an integration, triggered by Vercel Cron
// (see vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // No user session here, so use the service role (bypasses RLS)
  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const startedAt = new Date().toISOString();
  const { data: integrations, error } = await supabase
    .from("sku_sales_integrations")
    .select("sku_id, platform");

  if (error) {
    console.error("[cron-sync] Failed to load integrations:", error.message);
    return NextResponse.json({ error: `Failed to load integrations: ${error.message}` }, { status: 500 });
  }

  const queue = [...(integrations ?? [])] as { sku_id: string; platform: SalesPlatform }[];
  const results: {
    sku_id: string;
    platform: SalesPlatform;
    ok: boolean;
    units_last_30_days?: number;
    error?: string;
  }[] = [];

  async function worker() {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const { sku_id, platform } = next;
      let result: SyncResult;
      try {
        result = await SYNCS[platform](supabase, sku_id);
      } catch (err) {
        result = { ok: false, status: 500, error: err instanceof Error ? err.message : "Unexpected error" };
      }

      if (result.ok) {
        results.push({ sku_id, platform, ok: true, units_last_30_days: result.summary.last_30_days.units_sold });
      } else {
        console.error(`[cron-sync] ${platform} sync failed for SKU ${sku_id}: ${result.error}`);
        results.push({ sku_id, platform, ok: false, error: result.error });
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const failed = results.filter((r) => !r.ok).length;
  const summary = {
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    total: results.length,
    synced: results.length - failed,
    failed,
    results,
  };
  console.log(
    `[cron-sync] Synced ${summary.synced}/${summary.total} SKUs` + (failed ? `, ${failed} failed` : "")
  );

  return NextResponse.json(summary);
}
