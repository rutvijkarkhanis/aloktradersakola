"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";
import catalogue from "../../../data/catalogue.json";

async function assertAdmin() {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Unauthorized");
  return admin;
}

const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2),
  slug: z.string().optional(),
  sku: z.string().min(1),
  category_id: z.string().uuid().nullable().optional(),
  short_description: z.string().optional(),
  description: z.string().optional(),
  price: z.coerce.number().nonnegative().nullable().optional(),
  sale_price: z.coerce.number().nonnegative().nullable().optional(),
  delivery_charge: z.coerce.number().nonnegative().nullable().optional(),
  stock_quantity: z.coerce.number().int().min(0),
  low_stock_threshold: z.coerce.number().int().min(0),
  material: z.string().optional(),
  dimensions: z.string().optional(),
  colour: z.string().optional(),
  finish: z.string().optional(),
  weight: z.string().optional(),
  shipping_weight: z.coerce.number().positive().nullable().optional(),
  length_cm: z.coerce.number().positive().nullable().optional(),
  breadth_cm: z.coerce.number().positive().nullable().optional(),
  height_cm: z.coerce.number().positive().nullable().optional(),
  product_type: z.enum(["READY_MADE", "CUSTOM", "READY_MADE_AND_CUSTOM", "QUOTE_ONLY"]),
  is_customizable: z.boolean().optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  is_quote_only: z.boolean().optional(),
});

export async function upsertProduct(input: unknown) {
  await assertAdmin();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid data" };
  const d = parsed.data;
  const admin = createAdminClient();
  const row = {
    name: d.name,
    slug: d.slug || slugify(d.name),
    sku: d.sku,
    category_id: d.category_id ?? null,
    short_description: d.short_description || null,
    description: d.description || null,
    price: d.is_quote_only ? null : d.price ?? null,
    sale_price: d.sale_price ?? null,
    delivery_charge: d.delivery_charge ?? null,
    stock_quantity: d.stock_quantity,
    low_stock_threshold: d.low_stock_threshold,
    material: d.material || null,
    dimensions: d.dimensions || null,
    colour: d.colour || null,
    finish: d.finish || null,
    weight: d.weight || null,
    shipping_weight: d.shipping_weight ?? null,
    length_cm: d.length_cm ?? null,
    breadth_cm: d.breadth_cm ?? null,
    height_cm: d.height_cm ?? null,
    product_type: d.product_type,
    is_customizable: d.is_customizable ?? false,
    is_active: d.is_active ?? true,
    is_featured: d.is_featured ?? false,
    is_quote_only: d.is_quote_only ?? false,
  };
  const q = d.id
    ? admin.from("products").update(row).eq("id", d.id).select("id, slug").single()
    : admin.from("products").insert(row).select("id, slug").single();
  const { data, error } = await q;
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  if (data?.slug) revalidatePath(`/products/${data.slug}`);
  return { ok: true, id: data?.id };
}

export async function deleteProduct(id: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("products").delete().eq("id", id);
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  return { ok: !error, error: error?.message };
}

export async function setProductActive(id: string, is_active: boolean) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("products").update({ is_active }).eq("id", id);
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  return { ok: !error, error: error?.message };
}

export async function addProductImage(productId: string, url: string, storagePath: string | null, isPrimary: boolean) {
  await assertAdmin();
  const admin = createAdminClient();
  if (isPrimary) await admin.from("product_images").update({ is_primary: false }).eq("product_id", productId);
  const { count } = await admin.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", productId);
  const { error } = await admin.from("product_images").insert({
    product_id: productId, url, storage_path: storagePath, is_primary: isPrimary || (count ?? 0) === 0, sort_order: count ?? 0,
  });
  return { ok: !error, error: error?.message };
}

export async function deleteProductImage(id: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("product_images").delete().eq("id", id);
  return { ok: !error, error: error?.message };
}

export async function updateOrderStatus(id: string, order_status: string, cod_status?: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const patch: any = { order_status };
  if (cod_status) patch.cod_status = cod_status;
  const { error } = await admin.from("orders").update(patch).eq("id", id);
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  return { ok: !error, error: error?.message };
}

/**
 * Build a live tracking URL from the courier + waybill.
 * Big Ship is an aggregator that dispatches via Delhivery, so the AWB it
 * issues is a real Delhivery waybill and the Delhivery tracking page shows
 * live status. Big Ship's own portal page is kept as a fallback option.
 */
function courierTrackingUrl(courier: string, waybill: string): string {
  const awb = encodeURIComponent(waybill.trim());
  const c = courier.toLowerCase();
  if (c.includes("delhivery") || c.includes("big ship") || c.includes("bigship")) {
    return `https://www.delhivery.com/track/package/${awb}`;
  }
  return "";
}

export async function updateOrderTracking(
  id: string,
  input: { courier?: string; tracking_number?: string; tracking_url?: string },
) {
  await assertAdmin();
  const admin = createAdminClient();
  const courier = (input.courier || "Big Ship (Delhivery)").trim();
  const waybill = (input.tracking_number || "").trim();
  // Explicit URL (e.g. "Other" courier) wins; otherwise derive from courier.
  let tracking_url = (input.tracking_url || "").trim();
  if (!tracking_url && waybill) {
    tracking_url = courierTrackingUrl(courier, waybill);
  }
  const patch: any = {
    courier: courier || null,
    tracking_number: waybill || null,
    tracking_url: tracking_url || null,
  };
  // Advance status to SHIPPED when a waybill is first added and still processing.
  const { data: order } = await admin.from("orders").select("order_status").eq("id", id).maybeSingle();
  if (waybill && order && ["PAYMENT_CONFIRMED", "PROCESSING", "FABRICATION", "READY"].includes(order.order_status)) {
    patch.order_status = "SHIPPED";
  }
  const { error } = await admin.from("orders").update(patch).eq("id", id);
  revalidatePath(`/admin/orders/${id}`);
  return { ok: !error, error: error?.message };
}

export async function updateFabricationStatus(id: string, status: string, admin_notes?: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("custom_fabrication_requests").update({ status: status as any, admin_notes: admin_notes ?? null }).eq("id", id);
  revalidatePath("/admin/fabrication");
  return { ok: !error, error: error?.message };
}

export async function setReviewApproved(id: string, is_approved: boolean) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("reviews").update({ is_approved }).eq("id", id);
  revalidatePath("/admin/reviews");
  return { ok: !error, error: error?.message };
}

const settingsSchema = z.object({
  business_name: z.string().min(1),
  tagline: z.string().optional(),
  phone: z.string().optional(),
  whatsapp_number: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  instagram_url: z.string().optional(),
  facebook_url: z.string().optional(),
  description: z.string().optional(),
  tax_enabled: z.boolean().optional(),
  tax_rate: z.coerce.number().min(0).max(100),
  tax_label: z.string().optional(),
  delivery_flat_fee: z.coerce.number().min(0),
  free_delivery_threshold: z.coerce.number().min(0).nullable().optional(),
  advance_percentage: z.coerce.number().min(1).max(100),
});

export async function updateSettings(input: unknown) {
  await assertAdmin();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid data" };
  const admin = createAdminClient();
  const { error } = await admin.from("site_settings").update({ ...parsed.data, id: 1 }).eq("id", 1);
  revalidatePath("/", "layout");
  return { ok: !error, error: error?.message };
}

const couponSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(2),
  discount_type: z.enum(["PERCENT", "FIXED"]),
  discount_value: z.coerce.number().positive(),
  min_order_amount: z.coerce.number().min(0),
  max_discount_amount: z.coerce.number().min(0).nullable().optional(),
  expires_at: z.string().nullable().optional(),
  usage_limit: z.coerce.number().int().min(0).nullable().optional(),
  is_active: z.boolean().optional(),
});

export async function upsertCoupon(input: unknown) {
  await assertAdmin();
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid data" };
  const d = parsed.data;
  const admin = createAdminClient();
  const row = {
    code: d.code.toUpperCase(), discount_type: d.discount_type, discount_value: d.discount_value,
    min_order_amount: d.min_order_amount, max_discount_amount: d.max_discount_amount ?? null,
    expires_at: d.expires_at || null, usage_limit: d.usage_limit ?? null, is_active: d.is_active ?? true,
  };
  const q = d.id
    ? admin.from("coupons").update(row).eq("id", d.id)
    : admin.from("coupons").insert(row);
  const { error } = await q;
  revalidatePath("/admin/coupons");
  return { ok: !error, error: error?.message };
}

export async function deleteCoupon(id: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("coupons").delete().eq("id", id);
  revalidatePath("/admin/coupons");
  return { ok: !error, error: error?.message };
}

// ---- Catalogue imports -----------------------------------------------------

type ImportReport = { imported: number; updated: number; failed: number; skipped: number; warnings: string[] };

/**
 * Seed the bundled catalogue (data/catalogue.json) into the DB.
 * Images reference the committed static files (/catalogue/*.png) so this works
 * without Storage. For full Storage upload use the CLI: `npm run db:import`.
 */
export async function importBundledCatalogue(): Promise<{ ok: boolean; report: ImportReport }> {
  await assertAdmin();
  const admin = createAdminClient();
  const report: ImportReport = { imported: 0, updated: 0, failed: 0, skipped: 0, warnings: [] };

  // Categories (parents then children)
  const idBySlug = new Map<string, string>();
  for (const c of (catalogue as any).categories) {
    const { data, error } = await admin
      .from("categories")
      .upsert({ name: c.name, slug: c.slug, sort_order: c.sort_order, is_event_category: c.is_event_category, is_active: true }, { onConflict: "slug" })
      .select("id, slug").single();
    if (error) { report.failed++; report.warnings.push(`category ${c.slug}: ${error.message}`); continue; }
    idBySlug.set(data.slug, data.id);
  }
  for (const c of (catalogue as any).categories) {
    if (c.parent_slug && idBySlug.get(c.slug) && idBySlug.get(c.parent_slug)) {
      await admin.from("categories").update({ parent_id: idBySlug.get(c.parent_slug) }).eq("id", idBySlug.get(c.slug)!);
    }
  }

  for (const p of (catalogue as any).products) {
    const { data: existing } = await admin.from("products").select("id").eq("slug", p.slug).maybeSingle();
    const { data: prod, error } = await admin.from("products").upsert({
      name: p.name, slug: p.slug, sku: p.sku, category_id: idBySlug.get(p.category_slug) ?? null,
      short_description: p.short_description, description: p.description,
      price: p.price, sale_price: p.sale_price, currency: p.currency,
      stock_quantity: p.stock_quantity, low_stock_threshold: p.low_stock_threshold,
      material: p.material, dimensions: p.dimensions, weight: p.weight, colour: p.colour, finish: p.finish,
      product_type: p.product_type, is_customizable: p.is_customizable, is_active: p.is_active,
      is_featured: p.is_featured, is_quote_only: p.is_quote_only, needs_review: p.needs_review,
      source_pdf: p.source_pdf, source_pages: p.source_pages,
      seo_title: `${p.name} | Alok Traders Akola`, seo_description: p.short_description,
    }, { onConflict: "slug" }).select("id").single();
    if (error || !prod) { report.failed++; report.warnings.push(`product ${p.slug}: ${error?.message}`); continue; }
    existing ? report.updated++ : report.imported++;

    await admin.from("product_images").delete().eq("product_id", prod.id);
    await admin.from("product_images").insert(
      p.images.map((img: any) => ({
        product_id: prod.id, url: `/catalogue/${img.file}`, storage_path: null,
        alt: img.alt, is_primary: img.is_primary, sort_order: img.sort_order, source_page: img.page,
      })),
    );
    await admin.from("product_attributes").delete().eq("product_id", prod.id);
    if (p.attributes?.length) {
      await admin.from("product_attributes").insert(
        p.attributes.map((a: any, i: number) => ({ product_id: prod.id, name: a.name, value: a.value, sort_order: i })),
      );
    }
  }
  report.warnings.push(...((catalogue as any).meta?.warnings ?? []));
  revalidatePath("/shop");
  revalidatePath("/admin/products");
  return { ok: report.failed === 0, report };
}

/** Parse a CSV (headers: name,price_inr,specifications,category,sku?) and upsert. */
export async function importCsv(text: string): Promise<{ ok: boolean; report: ImportReport }> {
  await assertAdmin();
  const admin = createAdminClient();
  const report: ImportReport = { imported: 0, updated: 0, failed: 0, skipped: 0, warnings: [] };

  const rows = parseCsv(text);
  if (!rows.length) return { ok: false, report: { ...report, warnings: ["No rows found in CSV."] } };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const nameI = idx("name"), priceI = idx("price_inr"), specI = idx("specifications"),
    catI = idx("category"), skuI = idx("sku");
  if (nameI === -1) return { ok: false, report: { ...report, warnings: ["CSV must include a 'name' column."] } };

  let counter = Date.now() % 100000;
  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    if (!cols.length || !cols[nameI]?.trim()) { report.skipped++; continue; }
    const name = cols[nameI].trim();
    const priceRaw = priceI >= 0 ? cols[priceI]?.trim() : "";
    const price = priceRaw ? Number(priceRaw.replace(/[^0-9.]/g, "")) : null;
    const spec = specI >= 0 ? cols[specI]?.trim() : "";
    const catName = catI >= 0 ? cols[catI]?.trim() : "";
    const isQuote = price == null || Number.isNaN(price);

    // Resolve category by leaf name
    let categoryId: string | null = null;
    if (catName) {
      const leaf = catName.split("/").pop()!.trim();
      const { data: cat } = await admin.from("categories").select("id").eq("slug", slugify(leaf)).maybeSingle();
      if (cat) categoryId = cat.id;
      else {
        const { data: created } = await admin.from("categories").insert({ name: leaf, slug: slugify(leaf) }).select("id").maybeSingle();
        categoryId = created?.id ?? null;
      }
    }
    const sku = (skuI >= 0 && cols[skuI]?.trim()) || `ALK-CSV-${String(++counter).padStart(4, "0")}`;
    const slug = slugify(name);
    const { data: existing } = await admin.from("products").select("id").eq("slug", slug).maybeSingle();
    const { error } = await admin.from("products").upsert({
      name, slug, sku, category_id: categoryId,
      price: isQuote ? null : price, dimensions: spec || null, short_description: spec || null,
      is_quote_only: isQuote, product_type: isQuote ? "QUOTE_ONLY" : "READY_MADE",
      stock_quantity: isQuote ? 0 : 10, is_active: true,
    }, { onConflict: "slug" });
    if (error) { report.failed++; report.warnings.push(`${name}: ${error.message}`); continue; }
    existing ? report.updated++ : report.imported++;
    if (isQuote) report.warnings.push(`${name}: no price -> imported as QUOTE_ONLY`);
  }
  revalidatePath("/shop");
  revalidatePath("/admin/products");
  return { ok: report.failed === 0, report };
}

// Minimal CSV parser handling quoted fields with commas & escaped quotes.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", inQuotes = false;
  const s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"' && s[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else field += ch;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}
