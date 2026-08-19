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
