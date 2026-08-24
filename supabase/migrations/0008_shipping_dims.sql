-- Numeric shipping weight + dimensions per product, so the live delivery
-- estimator can quote real courier rates by pincode (additive, safe to re-run).
-- The existing free-text weight/dimensions columns stay for display; these
-- numeric ones feed the rate calculator (volumetric weight = L*B*H/5000).

alter table public.products add column if not exists shipping_weight numeric;  -- kg
alter table public.products add column if not exists length_cm numeric;         -- cm
alter table public.products add column if not exists breadth_cm numeric;        -- cm
alter table public.products add column if not exists height_cm numeric;         -- cm
