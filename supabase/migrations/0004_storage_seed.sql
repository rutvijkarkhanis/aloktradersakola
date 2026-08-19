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
  'Fabrication & Event Décor Products',
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
