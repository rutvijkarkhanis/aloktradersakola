/**
 * Catalogue import: data/catalogue.json -> Supabase (DB + Storage).
 *
 *   npm run db:import            # upsert products/categories/images/attributes
 *   npm run db:reset-import      # wipe imported catalogue first, then import
 *
 * Reads env from .env.local / .env. Requires:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Uploads the extracted PDF page images (public/catalogue/*.png) to the
 * `product-images` storage bucket and wires them to product_images rows.
 *
 * Source fidelity: prices/specs/names come verbatim from data/catalogue.json,
 * which is generated from the supplied ZIP by scripts/normalize_catalogue.py.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Load env (.env.local wins, then .env)
loadEnv({ path: resolve(ROOT, ".env.local") });
loadEnv({ path: resolve(ROOT, ".env") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "product-images";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "\n✖ Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local\n",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const RESET = process.argv.includes("--reset");

type ImgRec = { file: string; page: number; is_primary: boolean; alt: string; sort_order: number };
type AttrRec = { name: string; value: string };
type ProductRec = {
  name: string; slug: string; sku: string; category_slug: string; category_group: string;
  price: number | null; sale_price: number | null; currency: string;
  short_description: string; description: string;
  dimensions: string | null; material: string | null; colour: string | null;
  finish: string | null; weight: string | null;
  product_type: string; is_customizable: boolean; is_quote_only: boolean;
  is_featured: boolean; is_active: boolean; needs_review: boolean;
  stock_quantity: number; low_stock_threshold: number;
  source_pdf: string; source_pages: number[];
  images: ImgRec[]; attributes: AttrRec[];
};
type CatRec = {
  slug: string; name: string; parent_slug: string | null;
  sort_order: number; is_event_category: boolean;
};
type Catalogue = { meta: any; categories: CatRec[]; products: ProductRec[] };

const report = { imported: 0, updated: 0, skipped: 0, failed: 0, imagesUploaded: 0, warnings: [] as string[] };

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.id === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error && !/already exists/i.test(error.message)) throw error;
    console.log(`• Created public bucket "${BUCKET}"`);
  }
}

async function resetCatalogue() {
  console.log("• --reset: removing previously imported products & non-event categories");
  // product_images / attributes cascade via FK on product delete.
  await supabase.from("products").delete().not("source_pdf", "is", null);
  await supabase.from("categories").delete().eq("is_event_category", false);
}

async function upsertCategories(cats: CatRec[]) {
  const idBySlug = new Map<string, string>();
  // Pass 1: upsert all without parent to obtain ids
  for (const c of cats) {
    const { data, error } = await supabase
      .from("categories")
      .upsert(
        { name: c.name, slug: c.slug, sort_order: c.sort_order, is_event_category: c.is_event_category, is_active: true },
        { onConflict: "slug" },
      )
      .select("id, slug")
      .single();
    if (error) { report.failed++; report.warnings.push(`category ${c.slug}: ${error.message}`); continue; }
    idBySlug.set(data.slug, data.id);
  }
  // Pass 2: set parent links
  for (const c of cats) {
    if (!c.parent_slug) continue;
    const id = idBySlug.get(c.slug);
    const parentId = idBySlug.get(c.parent_slug);
    if (id && parentId) await supabase.from("categories").update({ parent_id: parentId }).eq("id", id);
  }
  console.log(`• Categories upserted: ${idBySlug.size}`);
  return idBySlug;
}

async function uploadImage(slug: string, file: string): Promise<string | null> {
  const localPath = resolve(ROOT, "public", "catalogue", file);
  if (!existsSync(localPath)) {
    report.warnings.push(`image missing on disk: ${file} (product ${slug})`);
    return null;
  }
  const buf = readFileSync(localPath);
  const storagePath = `products/${slug}/${file}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buf, { contentType: "image/png", upsert: true });
  if (error) { report.warnings.push(`upload ${storagePath}: ${error.message}`); return null; }
  report.imagesUploaded++;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

async function upsertProduct(p: ProductRec, catIdBySlug: Map<string, string>) {
  const category_id = catIdBySlug.get(p.category_slug) ?? null;
  const row = {
    name: p.name, slug: p.slug, sku: p.sku, category_id,
    short_description: p.short_description, description: p.description,
    price: p.price, sale_price: p.sale_price, currency: p.currency,
    stock_quantity: p.stock_quantity, low_stock_threshold: p.low_stock_threshold,
    material: p.material, dimensions: p.dimensions, weight: p.weight,
    colour: p.colour, finish: p.finish,
    product_type: p.product_type, is_customizable: p.is_customizable,
    is_active: p.is_active, is_featured: p.is_featured, is_quote_only: p.is_quote_only,
    needs_review: p.needs_review, source_pdf: p.source_pdf, source_pages: p.source_pages,
    seo_title: `${p.name} | Alok Traders Akola`,
    seo_description: p.short_description,
  };

  const { data: existing } = await supabase.from("products").select("id").eq("slug", p.slug).maybeSingle();

  const { data: prod, error } = await supabase
    .from("products")
    .upsert(row, { onConflict: "slug" })
    .select("id")
    .single();
  if (error || !prod) { report.failed++; report.warnings.push(`product ${p.slug}: ${error?.message}`); return; }
  existing ? report.updated++ : report.imported++;

  // Images: re-upload + replace rows (idempotent)
  await supabase.from("product_images").delete().eq("product_id", prod.id);
  for (const img of p.images) {
    const url = await uploadImage(p.slug, img.file);
    if (!url) continue;
    await supabase.from("product_images").insert({
      product_id: prod.id, url, storage_path: `products/${p.slug}/${img.file}`,
      alt: img.alt, is_primary: img.is_primary, sort_order: img.sort_order, source_page: img.page,
    });
  }

  // Attributes: replace
  await supabase.from("product_attributes").delete().eq("product_id", prod.id);
  if (p.attributes.length) {
    await supabase.from("product_attributes").insert(
      p.attributes.map((a, i) => ({ product_id: prod.id, name: a.name, value: a.value, sort_order: i })),
    );
  }
}

async function main() {
  console.log(`\n== Alok Traders Akola — catalogue import ==`);
  console.log(`Supabase: ${SUPABASE_URL}\n`);

  const cataloguePath = resolve(ROOT, "data", "catalogue.json");
  const catalogue: Catalogue = JSON.parse(readFileSync(cataloguePath, "utf-8"));
  console.log(`Source: ${catalogue.meta.source}`);
  console.log(`Products: ${catalogue.products.length} | Categories: ${catalogue.categories.length}\n`);

  await ensureBucket();
  if (RESET) await resetCatalogue();

  const catIdBySlug = await upsertCategories(catalogue.categories);

  for (const p of catalogue.products) {
    try {
      await upsertProduct(p, catIdBySlug);
      process.stdout.write(".");
    } catch (e: any) {
      report.failed++;
      report.warnings.push(`product ${p.slug}: ${e?.message ?? e}`);
      process.stdout.write("x");
    }
  }
  process.stdout.write("\n\n");

  // Carry through the normalizer's source-fidelity warnings.
  report.warnings.push(...(catalogue.meta.warnings ?? []));

  console.log("== Import report ==");
  console.log(`  Imported (new):   ${report.imported}`);
  console.log(`  Updated:          ${report.updated}`);
  console.log(`  Failed:           ${report.failed}`);
  console.log(`  Images uploaded:  ${report.imagesUploaded}`);
  console.log(`  Warnings:         ${report.warnings.length}`);
  for (const w of report.warnings) console.log(`    - ${w}`);
  console.log("");

  if (report.failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("\n✖ Import failed:", e);
  process.exit(1);
});
