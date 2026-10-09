import { manualSyncHandler } from "@/lib/sales-sync";
import { syncSquare } from "@/lib/sales-sync-square";

// Sync Now from the admin Sales page (admin only). The daily cron calls
// syncSquare directly.
export const POST = manualSyncHandler(syncSquare);
