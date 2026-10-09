import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { SkuStatus, DesignStatus, ShipmentDestination } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}

// For Postgres `date` values ("YYYY-MM-DD"). Formatted in UTC so the day
// never shifts with the viewer's timezone.
export function formatDay(day: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
}

// Fixed to UK time so server and browser render the same string
export function formatDateTime(timestamp: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date(timestamp));
}

export function addDays(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const SHIPMENT_DESTINATION_LABELS: Record<ShipmentDestination, string> = {
  warehouse: "Warehouse",
  theatre: "Theatre",
  venue: "Venue",
  other: "Other",
};

// SKU columns clients may see. The portal selects these explicitly instead of
// `*` so the warehouse/theatre stock split is never fetched into the portal.
export const CLIENT_SKU_COLUMNS =
  "id, sku_code, name, description, client_price, status, stock_qty, reorder_point, supplier_id, warehouse_id, client_id, created_at";

export const SKU_STATUS_LABELS: Record<SkuStatus, string> = {
  in_review: "In Review",
  sample_pending: "Sample Pending",
  in_production: "In Production",
  in_transit: "In Transit",
  landed: "Landed",
  on_sale: "On Sale",
  discontinued: "Discontinued",
};

export const SKU_STATUS_COLORS: Record<SkuStatus, string> = {
  in_review: "bg-yellow-100 text-yellow-800",
  sample_pending: "bg-orange-100 text-orange-800",
  in_production: "bg-blue-100 text-blue-800",
  in_transit: "bg-purple-100 text-purple-800",
  landed: "bg-cyan-100 text-cyan-800",
  on_sale: "bg-green-100 text-green-800",
  discontinued: "bg-gray-100 text-gray-600",
};

export const DESIGN_STATUS_LABELS: Record<DesignStatus, string> = {
  uploaded: "Uploaded",
  in_review: "In Review",
  approved: "Approved",
  rejected: "Rejected",
};

export const DESIGN_STATUS_COLORS: Record<DesignStatus, string> = {
  uploaded: "bg-gray-100 text-gray-700",
  in_review: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};
