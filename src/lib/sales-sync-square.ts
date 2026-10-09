// Square sales sync for one SKU. Server-only: reads the access token.
import { addDays } from "@/lib/utils";
import {
  addSale,
  saveSalesReports,
  syncFailure,
  syncWindow,
  type DayTotal,
  type DbClient,
  type SyncResult,
} from "@/lib/sales-sync";

const SQUARE_API = "https://connect.squareup.com/v2";
// Pinned so responses don't change shape when Square releases; bump deliberately.
const SQUARE_VERSION = "2026-09-16";
// 500 orders per page; caps a sync at 20k orders so it fits the function timeout
const MAX_PAGES = 40;

interface SquareMoney {
  amount: number; // smallest currency unit, e.g. pence
  currency: string;
}

interface SquareLineItem {
  catalog_object_id?: string;
  quantity: string; // decimal string, e.g. "2"
  gross_sales_money?: SquareMoney;
}

interface SquareOrder {
  id: string;
  closed_at?: string; // RFC 3339, UTC
  line_items?: SquareLineItem[];
}

type SquareErrorBody = { errors?: { code?: string; detail?: string }[] };

async function fetchSquare(path: string, token: string, body?: object): Promise<Response> {
  const init: RequestInit = {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Square-Version": SQUARE_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  };
  const res = await fetch(`${SQUARE_API}${path}`, init);
  if (res.status !== 429) return res;
  // Rate limited: back off briefly, then retry once
  await new Promise((r) => setTimeout(r, 2000));
  return fetch(`${SQUARE_API}${path}`, init);
}

async function squareError(res: Response): Promise<string> {
  if (res.status === 401) return "Square rejected the access token.";
  if (res.status === 403) {
    return "The access token is missing a required permission (ORDERS_READ and MERCHANT_PROFILE_READ).";
  }
  if (res.status === 404) return "Square location not found. Check the location ID.";
  const body = (await res.json().catch(() => ({}))) as SquareErrorBody;
  const detail = body.errors?.[0]?.detail;
  return `Square returned an error (HTTP ${res.status})${detail ? `: ${detail}` : "."}`;
}

export async function syncSquare(supabase: DbClient, skuId: string): Promise<SyncResult> {
  // The token is read here, server-side only, and never returned
  const { data: integration } = await supabase
    .from("sku_sales_integrations")
    .select("platform, square_access_token, square_location_id, square_variation_id")
    .eq("sku_id", skuId)
    .maybeSingle();

  if (!integration) {
    return syncFailure(404, "No sales integration set up for this SKU");
  }
  if (integration.platform !== "square") {
    return syncFailure(400, "This SKU's integration isn't Square");
  }

  const token = integration.square_access_token;
  const locationId = integration.square_location_id?.trim() || null;
  const variationId = integration.square_variation_id?.trim() || null;

  if (!token || !locationId || !variationId) {
    return syncFailure(400, "Integration is incomplete: needs an access token, location ID and item variation ID");
  }
  if (!/^[A-Za-z0-9_-]+$/.test(locationId)) {
    return syncFailure(400, "Invalid Square location ID");
  }

  const window = syncWindow();
  const days = new Map<string, DayTotal>();
  let ordersScanned = 0;
  let cursor: string | undefined;
  let truncated = false;

  try {
    // The location's timezone decides which local day each sale belongs to
    const locationRes = await fetchSquare(`/locations/${locationId}`, token);
    if (!locationRes.ok) {
      return syncFailure(502, await squareError(locationRes));
    }
    const { location } = (await locationRes.json()) as { location: { timezone?: string } };
    const localDay = new Intl.DateTimeFormat("en-CA", {
      timeZone: location.timezone || "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await fetchSquare("/orders/search", token, {
        location_ids: [locationId],
        limit: 500,
        cursor,
        query: {
          filter: {
            state_filter: { states: ["COMPLETED"] },
            // A day of slack before the window, since dates are in location time
            date_time_filter: { closed_at: { start_at: `${addDays(window.fetchFrom, -1)}T00:00:00Z` } },
          },
          sort: { sort_field: "CLOSED_AT", sort_order: "ASC" },
        },
      });
      if (!res.ok) {
        return syncFailure(502, await squareError(res));
      }

      const data = (await res.json()) as { orders?: SquareOrder[]; cursor?: string };
      const orders = data.orders ?? [];
      ordersScanned += orders.length;

      for (const order of orders) {
        if (!order.closed_at) continue;
        const day = localDay.format(new Date(order.closed_at)); // YYYY-MM-DD
        if (day < window.fetchFrom) continue;

        for (const item of order.line_items ?? []) {
          if (item.catalog_object_id !== variationId) continue;
          // units_sold is an integer column; merch quantities are whole units
          const units = Math.round(parseFloat(item.quantity) || 0);
          const revenue = (item.gross_sales_money?.amount ?? 0) / 100;
          addSale(days, day, units, revenue, { id: order.id, quantity: units });
        }
      }

      cursor = data.cursor;
      if (!cursor) break;
      if (page === MAX_PAGES - 1) truncated = true;
    }
  } catch {
    return syncFailure(502, "Could not reach Square. Please try again.");
  }

  return saveSalesReports(supabase, {
    skuId,
    platform: "square",
    days,
    window,
    ordersScanned,
    truncated,
  });
}
