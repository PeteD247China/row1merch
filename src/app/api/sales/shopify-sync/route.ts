import { manualSyncHandler } from "@/lib/sales-sync";
import { syncShopify } from "@/lib/sales-sync-shopify";

// Sync Now from the admin Sales page (admin only). The daily cron calls
// syncShopify directly.
export const POST = manualSyncHandler(syncShopify);
