-- Row1Merch Database Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────

create table clients (
  id uuid primary key default uuid_generate_v4(),
  company_name text not null,
  email text not null unique,
  supabase_auth_id uuid unique,
  role text not null default 'client' check (role in ('admin', 'client')),
  created_at timestamptz not null default now()
);

create table suppliers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  contact_email text,
  country text,
  created_at timestamptz not null default now()
);

create table warehouses (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  location text,
  created_at timestamptz not null default now()
);

create table skus (
  id uuid primary key default uuid_generate_v4(),
  sku_code text not null unique,
  name text not null,
  description text,
  cost_price numeric(10,2) not null default 0,
  client_price numeric(10,2) not null default 0,
  landed_cost_per_unit numeric(10,2) not null default 0,
  status text not null default 'in_review'
    check (status in ('in_review','sample_pending','in_production','in_transit','landed','on_sale','discontinued')),
  stock_qty integer not null default 0,
  reorder_point integer not null default 0,
  supplier_id uuid references suppliers(id) on delete set null,
  warehouse_id uuid references warehouses(id) on delete set null,
  client_id uuid not null references clients(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table designs (
  id uuid primary key default uuid_generate_v4(),
  sku_id uuid not null references skus(id) on delete cascade,
  file_url text not null,
  file_name text not null,
  status text not null default 'uploaded'
    check (status in ('uploaded','in_review','approved','rejected')),
  uploaded_at timestamptz not null default now()
);

create table notes (
  id uuid primary key default uuid_generate_v4(),
  sku_id uuid not null references skus(id) on delete cascade,
  author text not null,
  content text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default uuid_generate_v4(),
  sku_id uuid not null references skus(id) on delete cascade,
  sender_id uuid not null references clients(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────

create index skus_client_id_idx on skus(client_id);
create index skus_status_idx on skus(status);
create index designs_sku_id_idx on designs(sku_id);
create index notes_sku_id_idx on notes(sku_id);
create index messages_sku_id_idx on messages(sku_id);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

alter table clients enable row level security;
alter table suppliers enable row level security;
alter table warehouses enable row level security;
alter table skus enable row level security;
alter table designs enable row level security;
alter table notes enable row level security;
alter table messages enable row level security;

-- Helper: get the client row for the current auth user
create or replace function get_my_client_id()
returns uuid language sql security definer stable as $$
  select id from clients where supabase_auth_id = auth.uid() limit 1;
$$;

-- Helper: check if current user is admin
create or replace function is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from clients
    where supabase_auth_id = auth.uid() and role = 'admin'
  );
$$;

-- CLIENTS table policies
create policy "Admins can do everything on clients"
  on clients for all using (is_admin()) with check (is_admin());

create policy "Clients can read their own record"
  on clients for select using (supabase_auth_id = auth.uid());

-- SUPPLIERS: admins full access, clients read-only
create policy "Admins manage suppliers"
  on suppliers for all using (is_admin()) with check (is_admin());

create policy "Clients read suppliers"
  on suppliers for select using (true);

-- WAREHOUSES: admins full access, clients read-only
create policy "Admins manage warehouses"
  on warehouses for all using (is_admin()) with check (is_admin());

create policy "Clients read warehouses"
  on warehouses for select using (true);

-- SKUS
create policy "Admins manage all SKUs"
  on skus for all using (is_admin()) with check (is_admin());

create policy "Clients read their own SKUs"
  on skus for select using (client_id = get_my_client_id());

-- DESIGNS
create policy "Admins manage all designs"
  on designs for all using (is_admin()) with check (is_admin());

create policy "Clients read designs for their SKUs"
  on designs for select using (
    exists (
      select 1 from skus
      where skus.id = designs.sku_id
        and skus.client_id = get_my_client_id()
    )
  );

-- NOTES
create policy "Admins manage all notes"
  on notes for all using (is_admin()) with check (is_admin());

create policy "Clients read non-internal notes for their SKUs"
  on notes for select using (
    is_internal = false
    and exists (
      select 1 from skus
      where skus.id = notes.sku_id
        and skus.client_id = get_my_client_id()
    )
  );

-- MESSAGES
create policy "Admins manage all messages"
  on messages for all using (is_admin()) with check (is_admin());

create policy "Clients read messages for their SKUs"
  on messages for select using (
    exists (
      select 1 from skus
      where skus.id = messages.sku_id
        and skus.client_id = get_my_client_id()
    )
  );

create policy "Clients insert messages for their SKUs"
  on messages for insert with check (
    sender_id = get_my_client_id()
    and exists (
      select 1 from skus
      where skus.id = messages.sku_id
        and skus.client_id = get_my_client_id()
    )
  );

-- ─────────────────────────────────────────────
-- MIGRATIONS (run if upgrading an existing database)
-- ─────────────────────────────────────────────

-- Rename shipping_cost → landed_cost_per_unit (run if upgrading from shipping_cost):
-- alter table skus rename column shipping_cost to landed_cost_per_unit;
-- If the column doesn't exist at all:
-- alter table skus add column if not exists landed_cost_per_unit numeric(10,2) not null default 0;

-- ─────────────────────────────────────────────
-- STORAGE BUCKET (run separately or via dashboard)
-- ─────────────────────────────────────────────

-- Create a public bucket called "designs" in the Supabase dashboard,
-- or uncomment and run:
-- insert into storage.buckets (id, name, public)
-- values ('designs', 'designs', true);
