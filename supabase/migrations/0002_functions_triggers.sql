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
