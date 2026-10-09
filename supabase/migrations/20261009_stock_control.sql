-- Stock Control: resale price and split stock (warehouse vs theatre/venue).
-- Run once in the Supabase SQL Editor BEFORE deploying the matching app code.

begin;

-- Resale price lives in the admin-only sku_costs table so clients can't read it
ALTER TABLE sku_costs ADD COLUMN IF NOT EXISTS resale_price numeric(10,2);

ALTER TABLE skus ADD COLUMN IF NOT EXISTS stock_warehouse int NOT NULL DEFAULT 0;
ALTER TABLE skus ADD COLUMN IF NOT EXISTS stock_theatre int NOT NULL DEFAULT 0;

-- Preserve existing stock: carry the current total into the warehouse figure
-- before stock_qty is dropped (otherwise every SKU would reset to 0).
UPDATE skus SET stock_warehouse = stock_qty;

-- stock_qty should now always equal stock_warehouse + stock_theatre
-- Add a generated column to keep total in sync
ALTER TABLE skus DROP COLUMN IF EXISTS stock_qty;
ALTER TABLE skus ADD COLUMN stock_qty int GENERATED ALWAYS AS (stock_warehouse + stock_theatre) STORED;

commit;
