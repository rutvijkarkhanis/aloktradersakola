-- ============================================================================
-- Alok Traders Akola - COMPLETE SCHEMA (all migrations, in order)
-- Paste this whole file into Supabase -> SQL Editor -> Run.
-- Generated from supabase/migrations/*.sql - do not edit here; edit the sources.
-- ============================================================================


-- ========== supabase/migrations/0001_schema.sql ==========

-- ============================================================================
-- Alok Traders Akola - core schema
-- Fabrication & event decoration e-commerce
-- All monetary amounts are stored in INR rupees (integer-friendly numeric(12,2)).
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------------
-- Profiles (mirror of auth.users, holds role)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  phone       text,
  role        text not null default 'customer' check (role in ('customer','admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Site settings (single-row config, admin editable)
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  id                      int primary key default 1 check (id = 1),
  business_name           text not null default 'Alok Traders Akola',
  logo_url                text,
  tagline                 text,
  phone                   text,
  whatsapp_number         text,
  email                   text,
  address                 text,
  instagram_url           text,
  facebook_url            text,
  description             text,
  currency                text not null default 'INR',
  tax_enabled             boolean not null default false,
  tax_rate                numeric(5,2) not null default 0,      -- percent; 0 = disabled
  tax_label               text not null default 'GST',
  delivery_flat_fee       numeric(12,2) not null default 0,
  free_delivery_threshold numeric(12,2),                        -- null = no free threshold
  advance_percentage      numeric(5,2) not null default 50,     -- for 50/50 orders
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Categories (self-referencing hierarchy; event categories flagged)
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              text not null unique,
  description       text,
  parent_id         uuid references public.categories(id) on delete set null,
  image_url         text,
  is_event_category boolean not null default false,
  sort_order        int not null default 0,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists categories_parent_idx on public.categories(parent_id);

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text not null unique,
  sku                 text not null unique,
  short_description   text,
  description         text,
  category_id         uuid references public.categories(id) on delete set null,
  price               numeric(12,2),          -- null => quote only / price on request
  sale_price          numeric(12,2),
  currency            text not null default 'INR',
  stock_quantity      int not null default 0,
  low_stock_threshold int not null default 5,
  material            text,
  dimensions          text,
  weight              text,
  colour              text,
  finish              text,
  product_type        text not null default 'READY_MADE'
                       check (product_type in ('READY_MADE','CUSTOM','READY_MADE_AND_CUSTOM','QUOTE_ONLY')),
  is_customizable     boolean not null default false,
  is_active           boolean not null default true,
  is_featured         boolean not null default false,
  is_quote_only       boolean not null default false,
  needs_review        boolean not null default false,
  source_pdf          text,
  source_pages        int[],
  seo_title           text,
  seo_description     text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint sale_price_lte_price check (sale_price is null or price is null or sale_price <= price)
);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_active_idx on public.products(is_active);
create index if not exists products_featured_idx on public.products(is_featured);
create index if not exists products_price_idx on public.products(price);
create index if not exists products_search_idx on public.products
  using gin ((name || ' ' || coalesce(sku,'') || ' ' || coalesce(short_description,'') || ' ' || coalesce(description,'')) gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Product images
-- ---------------------------------------------------------------------------
create table if not exists public.product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products(id) on delete cascade,
  url          text not null,
  storage_path text,
  alt          text,
  is_primary   boolean not null default false,
  sort_order   int not null default 0,
  source_page  int,
  created_at   timestamptz not null default now()
);
create index if not exists product_images_product_idx on public.product_images(product_id);
create unique index if not exists product_images_one_primary
  on public.product_images(product_id) where is_primary;

-- ---------------------------------------------------------------------------
-- Product variants (e.g. size options with own price/stock)
-- ---------------------------------------------------------------------------
create table if not exists public.product_variants (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products(id) on delete cascade,
  name           text not null,
  sku            text unique,
  price          numeric(12,2),
  stock_quantity int not null default 0,
  attributes     jsonb not null default '{}'::jsonb,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists product_variants_product_idx on public.product_variants(product_id);

-- ---------------------------------------------------------------------------
-- Inventory (source of truth for availability status)
-- ---------------------------------------------------------------------------
create table if not exists public.inventory (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  quantity   int not null default 0,
  reserved   int not null default 0,
  status     text not null default 'MADE_TO_ORDER'
             check (status in ('IN_STOCK','LOW_STOCK','OUT_OF_STOCK','MADE_TO_ORDER','QUOTE_ONLY')),
  updated_at timestamptz not null default now()
);
-- NULL variant_id must still be unique per product (NULLs are distinct to a
-- plain UNIQUE constraint), so use partial unique indexes.
create unique index if not exists inventory_product_novariant_uniq
  on public.inventory(product_id) where variant_id is null;
create unique index if not exists inventory_product_variant_uniq
  on public.inventory(product_id, variant_id) where variant_id is not null;

-- ---------------------------------------------------------------------------
-- Product attributes (spec key/value), tags, event category links
-- ---------------------------------------------------------------------------
create table if not exists public.product_attributes (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name       text not null,
  value      text not null,
  sort_order int not null default 0
);
create index if not exists product_attributes_product_idx on public.product_attributes(product_id);

create table if not exists public.product_tags (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  tag        text not null,
  unique (product_id, tag)
);
create index if not exists product_tags_tag_idx on public.product_tags(tag);

create table if not exists public.product_event_categories (
  product_id  uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (product_id, category_id)
);

-- ---------------------------------------------------------------------------
-- Wishlist
-- ---------------------------------------------------------------------------
create table if not exists public.wishlist_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

-- ---------------------------------------------------------------------------
-- Reviews (verified purchasers, admin-moderated)
-- ---------------------------------------------------------------------------
create table if not exists public.reviews (
  id                   uuid primary key default gen_random_uuid(),
  product_id           uuid not null references public.products(id) on delete cascade,
  user_id              uuid not null references auth.users(id) on delete cascade,
  order_id             uuid,
  rating               int not null check (rating between 1 and 5),
  title                text,
  comment              text,
  images               text[],
  is_verified_purchase boolean not null default false,
  is_approved          boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (product_id, user_id)
);
create index if not exists reviews_product_idx on public.reviews(product_id);

-- ---------------------------------------------------------------------------
-- Addresses
-- ---------------------------------------------------------------------------
create table if not exists public.addresses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  full_name    text not null,
  mobile       text not null,
  email        text,
  address_line text not null,
  area         text,
  city         text not null,
  state        text not null,
  pincode      text not null,
  landmark     text,
  is_default   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists addresses_user_idx on public.addresses(user_id);

-- ---------------------------------------------------------------------------
-- Coupons
-- ---------------------------------------------------------------------------
create table if not exists public.coupons (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique,
  discount_type       text not null check (discount_type in ('PERCENT','FIXED')),
  discount_value      numeric(12,2) not null check (discount_value >= 0),
  min_order_amount    numeric(12,2) not null default 0,
  max_discount_amount numeric(12,2),
  starts_at           timestamptz,
  expires_at          timestamptz,
  usage_limit         int,
  used_count          int not null default 0,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text not null unique,
  customer_id      uuid references auth.users(id) on delete set null,
  subtotal         numeric(12,2) not null default 0,
  discount         numeric(12,2) not null default 0,
  coupon_code      text,
  delivery_charge  numeric(12,2) not null default 0,
  tax              numeric(12,2) not null default 0,
  total_amount     numeric(12,2) not null default 0,
  payment_type     text not null check (payment_type in ('FULL_PAYMENT','ADVANCE_50_COD_50')),
  advance_required numeric(12,2) not null default 0,
  advance_paid     numeric(12,2) not null default 0,
  cod_amount       numeric(12,2) not null default 0,
  payment_status   text not null default 'PENDING'
                    check (payment_status in ('PENDING','PARTIALLY_PAID','PAID','FAILED','REFUND_PENDING','REFUNDED')),
  order_status     text not null default 'PENDING_PAYMENT'
                    check (order_status in ('PENDING_PAYMENT','PAYMENT_CONFIRMED','PROCESSING','FABRICATION',
                                            'READY','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED',
                                            'REFUND_PENDING','REFUNDED')),
  cod_status       text not null default 'NOT_APPLICABLE'
                    check (cod_status in ('NOT_APPLICABLE','COD_PENDING','COD_COLLECTED')),
  shipping_address jsonb not null default '{}'::jsonb,
  customer_notes   text,
  contact_email    text,
  contact_mobile   text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists orders_customer_idx on public.orders(customer_id);
create index if not exists orders_status_idx on public.orders(order_status);
create index if not exists orders_payment_status_idx on public.orders(payment_status);
create index if not exists orders_created_idx on public.orders(created_at desc);

create table if not exists public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  product_id   uuid references public.products(id) on delete set null,
  product_name text not null,
  sku          text,
  image_url    text,
  unit_price   numeric(12,2) not null,
  quantity     int not null check (quantity > 0),
  line_total   numeric(12,2) not null
);
create index if not exists order_items_order_idx on public.order_items(order_id);

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders(id) on delete cascade,
  amount           numeric(12,2) not null,
  payment_type     text not null default 'FULL' check (payment_type in ('ADVANCE','FULL','COD','REFUND')),
  gateway          text not null default 'razorpay',
  gateway_order_id text,
  transaction_id   text,
  status           text not null default 'CREATED'
                    check (status in ('CREATED','AUTHORIZED','CAPTURED','FAILED','REFUNDED','PENDING')),
  raw_payload      jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists payments_order_idx on public.payments(order_id);
create index if not exists payments_gateway_order_idx on public.payments(gateway_order_id);
create unique index if not exists payments_txn_unique on public.payments(transaction_id)
  where transaction_id is not null;

-- ---------------------------------------------------------------------------
-- Webhook idempotency ledger
-- ---------------------------------------------------------------------------
create table if not exists public.webhook_events (
  id           uuid primary key default gen_random_uuid(),
  event_id     text not null unique,
  type         text not null,
  payload      jsonb not null,
  processed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Custom fabrication enquiries
-- ---------------------------------------------------------------------------
create table if not exists public.custom_fabrication_requests (
  id               uuid primary key default gen_random_uuid(),
  request_number   text not null unique,
  user_id          uuid references auth.users(id) on delete set null,
  name             text not null,
  phone            text not null,
  email            text,
  event_type       text,
  product_required text,
  dimensions       text,
  quantity         int,
  material         text,
  colour           text,
  finish           text,
  required_date    date,
  budget           numeric(12,2),
  description      text,
  reference_images text[],
  status           text not null default 'NEW'
                    check (status in ('NEW','CONTACTED','QUOTED','APPROVED','IN_PRODUCTION','COMPLETED','CANCELLED')),
  admin_notes      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists cfr_status_idx on public.custom_fabrication_requests(status);

-- ========== supabase/migrations/0002_functions_triggers.sql ==========

-- ============================================================================
-- Functions & triggers
-- ============================================================================

-- updated_at maintenance ------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','site_settings','categories','products','product_variants',
    'reviews','addresses','coupons','orders','payments','custom_fabrication_requests'
  ] loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;
       create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at();', t, t);
  end loop;
end $$;

-- Admin check (security definer so RLS policies can call it) ------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Create a profile row automatically on signup -------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Human-friendly order numbers: ATA-YYYYMMDD-XXXX -----------------------------
create or replace function public.generate_order_number()
returns text
language plpgsql
as $$
declare
  seq int;
  num text;
begin
  select count(*) + 1 into seq
  from public.orders
  where created_at::date = current_date;
  num := 'ATA-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(seq::text, 4, '0');
  -- guard against same-day collisions
  while exists (select 1 from public.orders where order_number = num) loop
    seq := seq + 1;
    num := 'ATA-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(seq::text, 4, '0');
  end loop;
  return num;
end $$;

create or replace function public.generate_request_number()
returns text
language plpgsql
as $$
declare seq int; num text;
begin
  select count(*) + 1 into seq
  from public.custom_fabrication_requests
  where created_at::date = current_date;
  num := 'CFR-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(seq::text, 4, '0');
  while exists (select 1 from public.custom_fabrication_requests where request_number = num) loop
    seq := seq + 1;
    num := 'CFR-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(seq::text, 4, '0');
  end loop;
  return num;
end $$;

-- Default order_number / request_number if not provided ----------------------
create or replace function public.set_order_number()
returns trigger language plpgsql as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := public.generate_order_number();
  end if;
  return new;
end $$;
drop trigger if exists set_order_number on public.orders;
create trigger set_order_number before insert on public.orders
  for each row execute function public.set_order_number();

create or replace function public.set_request_number()
returns trigger language plpgsql as $$
begin
  if new.request_number is null or new.request_number = '' then
    new.request_number := public.generate_request_number();
  end if;
  return new;
end $$;
drop trigger if exists set_request_number on public.custom_fabrication_requests;
create trigger set_request_number before insert on public.custom_fabrication_requests
  for each row execute function public.set_request_number();

-- Keep inventory status in sync with product stock ---------------------------
create or replace function public.sync_inventory_status()
returns trigger language plpgsql as $$
declare new_status text;
begin
  if new.is_quote_only then
    new_status := 'QUOTE_ONLY';
  elsif new.stock_quantity <= 0 then
    new_status := 'MADE_TO_ORDER';
  elsif new.stock_quantity <= new.low_stock_threshold then
    new_status := 'LOW_STOCK';
  else
    new_status := 'IN_STOCK';
  end if;

  -- Update-or-insert the product-level (variant_id IS NULL) inventory row.
  -- Can't rely on ON CONFLICT because variant_id is nullable.
  update public.inventory
     set quantity = greatest(new.stock_quantity, 0), status = new_status, updated_at = now()
   where product_id = new.id and variant_id is null;
  if not found then
    insert into public.inventory (product_id, variant_id, quantity, status, updated_at)
    values (new.id, null, greatest(new.stock_quantity, 0), new_status, now());
  end if;
  return new;
end $$;
drop trigger if exists sync_inventory_status on public.products;
create trigger sync_inventory_status
  after insert or update of stock_quantity, low_stock_threshold, is_quote_only on public.products
  for each row execute function public.sync_inventory_status();

-- Decrement stock atomically (called server-side after payment confirmation).
-- Only decrements tracked, non-quote products; never goes below zero.
create or replace function public.decrement_stock(p_product_id uuid, p_qty int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
     set stock_quantity = greatest(stock_quantity - p_qty, 0),
         updated_at = now()
   where id = p_product_id
     and is_quote_only = false;
end $$;

-- Aggregate product rating (used by product pages) ---------------------------
create or replace function public.product_rating(p_product_id uuid)
returns table (avg_rating numeric, review_count bigint)
language sql stable as $$
  select coalesce(round(avg(rating)::numeric, 1), 0) as avg_rating,
         count(*) as review_count
  from public.reviews
  where product_id = p_product_id and is_approved = true;
$$;

-- ========== supabase/migrations/0003_rls.sql ==========

-- ============================================================================
-- Row Level Security
-- Service-role (server) bypasses RLS entirely. These policies govern the
-- anon key used in the browser and in user-scoped server components.
-- ============================================================================

alter table public.profiles                     enable row level security;
alter table public.site_settings                enable row level security;
alter table public.categories                   enable row level security;
alter table public.products                      enable row level security;
alter table public.product_images               enable row level security;
alter table public.product_variants             enable row level security;
alter table public.inventory                     enable row level security;
alter table public.product_attributes           enable row level security;
alter table public.product_tags                 enable row level security;
alter table public.product_event_categories     enable row level security;
alter table public.wishlist_items               enable row level security;
alter table public.reviews                       enable row level security;
alter table public.addresses                     enable row level security;
alter table public.coupons                       enable row level security;
alter table public.orders                        enable row level security;
alter table public.order_items                   enable row level security;
alter table public.payments                      enable row level security;
alter table public.webhook_events               enable row level security;
alter table public.custom_fabrication_requests  enable row level security;

-- Helper: drop-and-create a policy idempotently is verbose; we just create with
-- distinct names and rely on `drop policy if exists`.

-- profiles --------------------------------------------------------------------
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id or public.is_admin());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id or public.is_admin())
  with check (
    (auth.uid() = id and role = 'customer') or public.is_admin()
  );

-- site_settings ---------------------------------------------------------------
drop policy if exists site_settings_read on public.site_settings;
create policy site_settings_read on public.site_settings for select using (true);
drop policy if exists site_settings_admin on public.site_settings;
create policy site_settings_admin on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- categories ------------------------------------------------------------------
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories
  for select using (is_active or public.is_admin());
drop policy if exists categories_admin on public.categories;
create policy categories_admin on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- products --------------------------------------------------------------------
drop policy if exists products_read on public.products;
create policy products_read on public.products
  for select using (is_active or public.is_admin());
drop policy if exists products_admin on public.products;
create policy products_admin on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- product_images / variants / inventory / attributes / tags / event links ----
drop policy if exists product_images_read on public.product_images;
create policy product_images_read on public.product_images for select using (true);
drop policy if exists product_images_admin on public.product_images;
create policy product_images_admin on public.product_images
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists product_variants_read on public.product_variants;
create policy product_variants_read on public.product_variants for select using (true);
drop policy if exists product_variants_admin on public.product_variants;
create policy product_variants_admin on public.product_variants
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists inventory_read on public.inventory;
create policy inventory_read on public.inventory for select using (true);
drop policy if exists inventory_admin on public.inventory;
create policy inventory_admin on public.inventory
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists product_attributes_read on public.product_attributes;
create policy product_attributes_read on public.product_attributes for select using (true);
drop policy if exists product_attributes_admin on public.product_attributes;
create policy product_attributes_admin on public.product_attributes
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists product_tags_read on public.product_tags;
create policy product_tags_read on public.product_tags for select using (true);
drop policy if exists product_tags_admin on public.product_tags;
create policy product_tags_admin on public.product_tags
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists product_event_read on public.product_event_categories;
create policy product_event_read on public.product_event_categories for select using (true);
drop policy if exists product_event_admin on public.product_event_categories;
create policy product_event_admin on public.product_event_categories
  for all using (public.is_admin()) with check (public.is_admin());

-- wishlist --------------------------------------------------------------------
drop policy if exists wishlist_own on public.wishlist_items;
create policy wishlist_own on public.wishlist_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- addresses -------------------------------------------------------------------
drop policy if exists addresses_own on public.addresses;
create policy addresses_own on public.addresses
  for all using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id);

-- reviews ---------------------------------------------------------------------
drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews
  for select using (is_approved or auth.uid() = user_id or public.is_admin());
drop policy if exists reviews_insert_own on public.reviews;
create policy reviews_insert_own on public.reviews
  for insert with check (auth.uid() = user_id);
drop policy if exists reviews_update_own on public.reviews;
create policy reviews_update_own on public.reviews
  for update using (auth.uid() = user_id or public.is_admin())
  with check (
    -- customers can edit their own review but cannot self-approve
    (auth.uid() = user_id and is_approved = false) or public.is_admin()
  );
drop policy if exists reviews_admin_delete on public.reviews;
create policy reviews_admin_delete on public.reviews
  for delete using (auth.uid() = user_id or public.is_admin());

-- coupons: no public read; admin manage. Validation happens server-side. ------
drop policy if exists coupons_admin on public.coupons;
create policy coupons_admin on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());

-- orders ----------------------------------------------------------------------
drop policy if exists orders_select_own on public.orders;
create policy orders_select_own on public.orders
  for select using (auth.uid() = customer_id or public.is_admin());
drop policy if exists orders_admin_write on public.orders;
create policy orders_admin_write on public.orders
  for update using (public.is_admin()) with check (public.is_admin());
-- (order creation is done via service role in server actions)

-- order_items -----------------------------------------------------------------
drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items
  for select using (
    public.is_admin() or exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = auth.uid()
    )
  );

-- payments --------------------------------------------------------------------
drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
  for select using (
    public.is_admin() or exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = auth.uid()
    )
  );

-- custom fabrication ----------------------------------------------------------
drop policy if exists cfr_insert_any on public.custom_fabrication_requests;
create policy cfr_insert_any on public.custom_fabrication_requests
  for insert with check (true);   -- anonymous enquiries allowed
drop policy if exists cfr_select_own on public.custom_fabrication_requests;
create policy cfr_select_own on public.custom_fabrication_requests
  for select using (
    public.is_admin() or (user_id is not null and auth.uid() = user_id)
  );
drop policy if exists cfr_admin_write on public.custom_fabrication_requests;
create policy cfr_admin_write on public.custom_fabrication_requests
  for update using (public.is_admin()) with check (public.is_admin());

-- webhook_events: service role only (no policies = deny all via anon key) -----

-- ========== supabase/migrations/0004_storage_seed.sql ==========

-- ============================================================================
-- Storage buckets + baseline seed data (settings, event categories)
-- ============================================================================

-- Public bucket for product & catalogue images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- Public bucket for customer uploads (review images, custom-fab references)
insert into storage.buckets (id, name, public)
values ('customer-uploads', 'customer-uploads', true)
on conflict (id) do update set public = true;

-- Storage policies -----------------------------------------------------------
drop policy if exists "product images public read" on storage.objects;
create policy "product images public read" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "product images admin write" on storage.objects;
create policy "product images admin write" on storage.objects
  for all using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "customer uploads public read" on storage.objects;
create policy "customer uploads public read" on storage.objects
  for select using (bucket_id = 'customer-uploads');

drop policy if exists "customer uploads authed write" on storage.objects;
create policy "customer uploads authed write" on storage.objects
  for insert with check (bucket_id = 'customer-uploads' and auth.role() = 'authenticated');

-- Site settings single row ----------------------------------------------------
insert into public.site_settings (id, business_name, tagline, description, currency)
values (
  1,
  'Alok Traders Akola',
  'Fabrication & Event Decor Products',
  'Fabrication structures, event decoration products and custom solutions for weddings, birthdays, parties and events.',
  'INR'
)
on conflict (id) do nothing;

-- Event categories (collections; products linked only where configured) ------
insert into public.categories (name, slug, is_event_category, sort_order)
values
  ('Birthday Events',  'birthday-events',  true, 100),
  ('Wedding Events',   'wedding-events',   true, 101),
  ('Engagement',       'engagement',       true, 102),
  ('Baby Shower',      'baby-shower',      true, 103),
  ('Anniversary',      'anniversary',      true, 104),
  ('Corporate Events', 'corporate-events', true, 105),
  ('Party Events',     'party-events',     true, 106)
on conflict (slug) do nothing;
