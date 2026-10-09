-- Sales Reporting: per-SKU sales platform integrations (Shopify first) and
-- synced daily/weekly sales reports.
-- Run once in the Supabase SQL Editor BEFORE deploying the matching app code.

begin;

-- Admin-only: holds Shopify access tokens, which must never reach clients
CREATE TABLE sku_sales_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id uuid UNIQUE REFERENCES skus(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('shopify', 'square')),
  shopify_store_domain text,
  shopify_access_token text,
  shopify_product_id text,
  shopify_variant_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sku_sales_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage integrations" ON sku_sales_integrations FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE sku_sales_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id uuid REFERENCES skus(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  period text NOT NULL CHECK (period IN ('daily', 'weekly')),
  units_sold int NOT NULL DEFAULT 0,
  gross_revenue numeric(10,2) NOT NULL DEFAULT 0,
  platform text NOT NULL,
  created_at timestamptz DEFAULT now(),
  -- Set on every sync (created_at is kept on upsert, so it can't show this)
  synced_at timestamptz NOT NULL DEFAULT now(),
  -- One row per SKU per day/week, so re-syncing updates rather than duplicates.
  -- For weekly rows report_date is the Monday the week starts on.
  UNIQUE (sku_id, period, report_date)
);

CREATE INDEX sku_sales_reports_sku_date_idx ON sku_sales_reports(sku_id, report_date);

ALTER TABLE sku_sales_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage reports" ON sku_sales_reports FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Clients view their reports" ON sku_sales_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM skus WHERE skus.id = sku_sales_reports.sku_id AND skus.client_id = get_my_client_id())
);

-- Admin-only: Shopify order references behind each report. Kept off
-- sku_sales_reports because the client read policy there covers every column.
CREATE TABLE sku_sales_raw_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid UNIQUE REFERENCES sku_sales_reports(id) ON DELETE CASCADE,
  raw_data jsonb
);

ALTER TABLE sku_sales_raw_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage raw sales data" ON sku_sales_raw_data FOR ALL USING (is_admin()) WITH CHECK (is_admin());

commit;
