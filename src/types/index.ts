export type SkuStatus =
  | "in_review"
  | "sample_pending"
  | "in_production"
  | "in_transit"
  | "landed"
  | "on_sale"
  | "discontinued";

export type ShipmentDestination = "warehouse" | "theatre" | "venue" | "other";

export type DesignStatus = "uploaded" | "in_review" | "approved" | "rejected";

export interface Client {
  id: string;
  company_name: string;
  email: string;
  supabase_auth_id: string | null;
  role: "admin" | "client";
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_email: string | null;
  country: string | null;
  created_at: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string | null;
  created_at: string;
}

export interface SKU {
  id: string;
  sku_code: string;
  name: string;
  description: string | null;
  client_price: number;
  status: SkuStatus;
  stock_warehouse: number;
  stock_theatre: number;
  // Generated: stock_warehouse + stock_theatre (read-only)
  stock_qty: number;
  reorder_point: number;
  supplier_id: string | null;
  warehouse_id: string | null;
  client_id: string;
  created_at: string;
  supplier?: Supplier;
  warehouse?: Warehouse;
  client?: Client;
  // Admin-only; RLS returns null for clients
  cost?: SkuCost | null;
}

// What the client portal fetches (see CLIENT_SKU_COLUMNS)
export type ClientSku = Omit<
  SKU,
  "stock_warehouse" | "stock_theatre" | "cost" | "supplier" | "warehouse" | "client"
>;

export interface SkuCost {
  sku_id: string;
  cost_price: number;
  landed_cost_per_unit: number;
  // Price the venue sells to the public at
  resale_price: number | null;
}

export interface Design {
  id: string;
  sku_id: string;
  file_url: string;
  file_name: string;
  status: DesignStatus;
  uploaded_at: string;
}

export interface Note {
  id: string;
  sku_id: string;
  author: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  sku_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: Client;
}

export interface SkuShipment {
  id: string;
  sku_id: string;
  production_start_date: string | null;
  estimated_production_days: number | null;
  estimated_production_complete: string | null;
  dispatch_date: string | null;
  estimated_transit_days: number | null;
  estimated_arrival_date: string | null;
  actual_arrival_date: string | null;
  destination: ShipmentDestination | null;
  created_at: string;
  // Admin-only; RLS returns null for clients
  notes?: SkuShipmentNotes | null;
}

export interface SkuShipmentNotes {
  destination_notes: string | null;
}

export type SalesPlatform = "shopify" | "square";

// sku_sales_integrations as sent to the browser. The access token is never
// selected for the UI; has_access_token says whether one is stored.
export interface SkuSalesIntegration {
  id: string;
  sku_id: string;
  platform: SalesPlatform;
  shopify_store_domain: string | null;
  shopify_product_id: string | null;
  shopify_variant_id: string | null;
  updated_at: string;
  has_access_token: boolean;
}

export interface SkuSalesReport {
  id: string;
  sku_id: string;
  report_date: string;
  period: "daily" | "weekly";
  units_sold: number;
  gross_revenue: number;
  platform: string;
  synced_at: string;
}
