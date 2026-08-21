-- ============================================================================
-- Per-product delivery charge + shipment tracking (Delhivery)
-- Idempotent: safe to run on an existing database.
-- ============================================================================

-- Per-product delivery charge (INR). NULL = use the site flat fee.
alter table public.products
  add column if not exists delivery_charge numeric(12,2);

-- Shipment tracking on orders
alter table public.orders add column if not exists courier text;
alter table public.orders add column if not exists tracking_number text;
alter table public.orders add column if not exists tracking_url text;
