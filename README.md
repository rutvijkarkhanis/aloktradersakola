# Alok Traders Akola — Fabrication & Event Décor E-commerce

A production-ready e-commerce store for an Indian fabrication & event decoration
business: browse products → view details → see price → add to cart → checkout →
pay → receive order, plus custom fabrication enquiries and a full admin dashboard.

Built with **Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase
(PostgreSQL, Auth, Storage, RLS) · Razorpay**. Deployable on Vercel.

The initial catalogue (37 products, 14 categories) is imported from the supplied
`Fabrication_Product_Import.zip` — see [Catalogue & source fidelity](#catalogue--source-fidelity).

---

## 1. Prerequisites

- Node.js 18+ and npm
- A [Supabase](https://supabase.com) project (free tier is fine)
- (Optional) A [Razorpay](https://razorpay.com) account for live payments
- Python 3 (only to regenerate the catalogue seed; not needed to run the app)

## 2. Install

```bash
npm install
cp .env.example .env.local   # then fill in the values (see below)
```

## 3. Environment variables

Set these in `.env.local` (local) and in Vercel (production). Only `NEXT_PUBLIC_*`
values are exposed to the browser — never expose the service role or Razorpay
secrets.

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | **Server only.** Used for order finalisation, webhooks, imports |
| `NEXT_PUBLIC_SITE_URL` | ✅ | e.g. `https://your-domain.com` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | – | Digits only incl. country code, e.g. `9198XXXXXXXX`. WhatsApp buttons hide when unset |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | – | Server-side. Omit to run in **test mode** (real orders, no live gateway) |
| `RAZORPAY_WEBHOOK_SECRET` | – | For the idempotent webhook |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | – | Public key id for the browser checkout widget |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | – | Defaults to `product-images` |

## 4. Database setup

**Fastest:** open Supabase → **SQL Editor** → paste the entire
`supabase/schema.sql` (all migrations concatenated in order) → **Run**. This is
validated to apply cleanly in one shot (19 tables, RLS on all, both storage
buckets).

Or apply the individual migrations in `supabase/migrations/` **in order** via the
SQL editor or the Supabase CLI:

```bash
# Option A — Supabase CLI (recommended)
supabase link --project-ref <your-project-ref>
supabase db push        # applies supabase/migrations/*.sql

# Option B — paste each file in the Supabase Dashboard → SQL Editor, in order:
#   0001_schema.sql  0002_functions_triggers.sql  0003_rls.sql  0004_storage_seed.sql
```

This creates every table, index, foreign key, constraint, RLS policy, trigger and
function, the `product-images` + `customer-uploads` storage buckets, the
`site_settings` row and the event categories.

## 5. Import the catalogue (products + images)

Run the importer — it reads `data/catalogue.json` (generated from the supplied
ZIP), **uploads the 49 catalogue page images to Supabase Storage**, and upserts
categories, products, images and attributes:

```bash
npm run db:import           # upsert (safe to re-run)
npm run db:reset-import     # wipe imported catalogue first, then import
```

You'll get an import report (imported / updated / failed / warnings). Products
appear immediately on `/shop`.

> You can also import from the admin UI: **Admin → Products → Import Catalogue**
> (bundled catalogue or CSV upload). The CLI additionally uploads images to Storage.

## 6. Create an admin user

1. Register on the site at `/register` (or create a user in the Supabase Dashboard).
2. Promote it to admin — edit the email in `supabase/seed_admin.sql` and run it,
   or run in the SQL editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
3. Visit `/admin`.

## 7. Payments (Razorpay)

- **Test mode (no keys):** leave the Razorpay vars empty. Real orders are created
  in the DB and confirmed through a test-mode path — the full server-side
  architecture stays intact. Nothing is faked in the payment records beyond the
  clearly-marked test transaction.
- **Live mode:** set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
  `NEXT_PUBLIC_RAZORPAY_KEY_ID`. Orders are created and **verified server-side**.
- **Webhook:** point a Razorpay webhook at `POST /api/webhooks/razorpay` with
  events `payment.captured`, `payment.failed`, `order.paid`. Set
  `RAZORPAY_WEBHOOK_SECRET`. The webhook is **idempotent** (deduped via
  `webhook_events`) and handles the "payment succeeded but browser closed" case.

## 8. Run

```bash
npm run dev          # http://localhost:3000
npm run build && npm start
npm run typecheck
```

## 9. Deploy to Vercel

1. Import the repo in Vercel.
2. Add all env vars from step 3.
3. Deploy. Set the Razorpay webhook URL to
   `https://<your-domain>/api/webhooks/razorpay`.

---

## Catalogue & source fidelity

The initial catalogue comes **only** from `Fabrication_Product_Import.zip`
(`data/import/`). `scripts/normalize_catalogue.py` transforms it into the
canonical seed `data/catalogue.json`:

- **37 products** across **49 catalogue pages** (multi-page products merged into
  one product with a gallery).
- **36 priced** products (₹800–₹7000); **1 quote-only** (*Jali Single Layer Stand*
  — no price in the PDF → `is_quote_only`, shown as "Price on request").
- Ambiguous specs (*Flexi Frame*, *Italian Backdrop*) are preserved verbatim and
  flagged `needs_review` for admin — never "corrected".
- Missing fields (material, colour, finish, weight) are left `null`, not invented.

Derived, non-source fields (slug, SKU, `product_type`/`is_customizable`,
`is_featured`, factual descriptions) are clearly generated and fully editable in
the admin. To regenerate the seed: `npm run catalogue:normalize`.

## Architecture

```
src/app            App Router routes (storefront, account, admin, api, actions)
src/app/actions    Server actions (orders/payments, admin, auth-adjacent, reviews)
src/components      UI (shadcn/ui), commerce, shop, product, account, admin, layout
src/lib            supabase clients, queries, pricing, razorpay, cart store, types
supabase/migrations SQL migrations (schema, functions, RLS, storage+seed)
scripts            catalogue normalizer (py) + importer (ts)
data               import source (ZIP contents) + generated catalogue.json
public/catalogue   49 extracted catalogue page images
```

### Security

- **RLS everywhere.** Customers can only read their own profile, orders,
  payments, addresses, wishlist and reviews. Products/categories are public read.
- Order totals are **always computed server-side** from DB prices — the client
  never sets prices. Coupons are validated server-side.
- Service role key, Razorpay secret and webhook secret are **server-only** and
  never sent to the browser.
- Payment signatures are verified server-side; the webhook is idempotent.

## Payment options

Every order chooses one of exactly two options at checkout:

1. **Full payment** — pay 100% online (COD = ₹0).
2. **50% advance + 50% COD** — pay the advance online now; balance on delivery.
   (The advance % is configurable in Admin → Settings.)

The checkout clearly shows **Order Total**, **Pay now** and **Pay on delivery
(COD)** and never conflates them.

## Testing checklist

Once your Supabase project is configured and the catalogue imported, verify:
homepage, categories, product grid, search, filters, product page & images,
correct prices, cart & quantity, checkout, full-payment & 50/50 options, payment
verification, order creation, customer order view, admin order view & status
changes, admin product add/edit/price/images, catalogue import, custom
fabrication enquiry, wishlist, mobile layout, RLS, and that secrets are not
exposed to the client.
