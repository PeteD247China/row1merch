-- Manufacture & Shipment tracking per SKU.
-- Run once in the Supabase SQL Editor BEFORE deploying the matching app code.

create table sku_shipments (
  id uuid primary key default gen_random_uuid(),
  sku_id uuid unique references skus(id) on delete cascade,
  production_start_date date,
  estimated_production_days int,
  estimated_production_complete date,
  dispatch_date date,
  estimated_transit_days int,
  estimated_arrival_date date,
  actual_arrival_date date,
  destination text check (destination in ('warehouse', 'theatre', 'venue', 'other')),
  created_at timestamptz default now()
);

-- Kept out of sku_shipments so clients can never read them
-- (RLS is row-level only, so any column on sku_shipments is visible to the owning client)
create table sku_shipment_notes (
  shipment_id uuid primary key references sku_shipments(id) on delete cascade,
  destination_notes text
);

alter table sku_shipments enable row level security;
create policy "Admins manage shipments" on sku_shipments for all using (is_admin()) with check (is_admin());
create policy "Clients view their shipments" on sku_shipments for select using (
  exists (select 1 from skus where skus.id = sku_shipments.sku_id and skus.client_id = get_my_client_id())
);

alter table sku_shipment_notes enable row level security;
create policy "Admins manage shipment notes" on sku_shipment_notes for all using (is_admin()) with check (is_admin());
