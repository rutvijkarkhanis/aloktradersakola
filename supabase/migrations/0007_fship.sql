-- FShip aggregator support alongside Big Ship (additive, safe to re-run).
-- An order can now be booked through either aggregator. shipping_provider
-- records which one handled it so tracking refresh / cancel route to the
-- right API. The AWB (waybill) still lives in orders.tracking_number; the
-- FShip external order id is kept for label/re-attempt calls.

alter table public.orders add column if not exists shipping_provider text;   -- 'bigship' | 'fship'
alter table public.orders add column if not exists fship_order_id text;       -- FShip apiorderid

-- Backfill existing Big Ship bookings so their provider is explicit.
update public.orders set shipping_provider = 'bigship'
  where shipping_provider is null and bigship_order_id is not null;
