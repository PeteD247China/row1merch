-- Move Row1Merch's cost fields off skus into an admin-only table.
-- RLS is row-level only, so while these columns lived on skus any client
-- could read them for their own SKUs straight from the Supabase API.
--
-- Run once in the Supabase SQL Editor BEFORE deploying the matching app code.

begin;

create table if not exists sku_costs (
  sku_id uuid primary key references skus(id) on delete cascade,
  cost_price numeric(10,2) not null default 0,
  landed_cost_per_unit numeric(10,2) not null default 0
);

alter table sku_costs enable row level security;

drop policy if exists "Admins manage SKU costs" on sku_costs;
create policy "Admins manage SKU costs"
  on sku_costs for all using (is_admin()) with check (is_admin());

insert into sku_costs (sku_id, cost_price, landed_cost_per_unit)
select id, cost_price, landed_cost_per_unit from skus
on conflict (sku_id) do nothing;

alter table skus
  drop column cost_price,
  drop column landed_cost_per_unit;

commit;
