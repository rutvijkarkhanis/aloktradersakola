-- Big Ship automated shipping integration (additive, safe to re-run).
-- Stores the aggregator's own order id, the printable label, and the last
-- known courier status so the order page can show live progress without a
-- manual paste. The AWB itself continues to live in orders.tracking_number.

alter table public.orders add column if not exists bigship_order_id text;
alter table public.orders add column if not exists shipping_label_url text;
alter table public.orders add column if not exists tracking_status text;
alter table public.orders add column if not exists tracking_synced_at timestamptz;
