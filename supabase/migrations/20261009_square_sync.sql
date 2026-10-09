-- Square sync: credentials for Square integrations.
-- sku_sales_integrations is already admin-only, so the access token is never
-- readable by clients.
-- Run once in the Supabase SQL Editor BEFORE deploying the matching app code.

ALTER TABLE sku_sales_integrations ADD COLUMN IF NOT EXISTS square_access_token text;
ALTER TABLE sku_sales_integrations ADD COLUMN IF NOT EXISTS square_location_id text;
ALTER TABLE sku_sales_integrations ADD COLUMN IF NOT EXISTS square_variation_id text;
