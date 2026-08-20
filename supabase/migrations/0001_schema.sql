-- ============================================================================
-- Alok Traders Akola — core schema
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
