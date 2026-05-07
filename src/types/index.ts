export type SkuStatus =
  | "in_review"
  | "sample_pending"
  | "in_production"
  | "in_transit"
  | "landed"
  | "on_sale"
  | "discontinued";

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
  cost_price: number;
  client_price: number;
  status: SkuStatus;
  stock_qty: number;
  reorder_point: number;
  supplier_id: string | null;
  warehouse_id: string | null;
  client_id: string;
  created_at: string;
  supplier?: Supplier;
  warehouse?: Warehouse;
  client?: Client;
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
