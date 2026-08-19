-- ============================================================================
-- Promote a user to admin.
--
-- 1. Create the user first by registering on the site (/register) or via the
--    Supabase Dashboard → Authentication → Users.
-- 2. Then run ONE of the statements below (replace the email).
-- ============================================================================

-- Promote by email:
update public.profiles
set role = 'admin'
where email = 'you@example.com';

-- Verify:
-- select id, email, role from public.profiles where role = 'admin';
