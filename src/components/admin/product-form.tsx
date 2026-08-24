"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { createClient } from "@/lib/supabase/client";
import { upsertProduct, addProductImage, deleteProductImage } from "@/app/actions/admin";
import { PRODUCT_TYPES } from "@/lib/constants";
import type { Category, ProductFull } from "@/lib/types/database";

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "product-images";

export function ProductForm({ categories, product }: { categories: Category[]; product?: ProductFull }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [quoteOnly, setQuoteOnly] = useState(product?.is_quote_only ?? false);
  const [images, setImages] = useState(product?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const productId = product?.id;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const input = {
      id: productId,
      name: String(fd.get("name")),
      sku: String(fd.get("sku")),
      category_id: (fd.get("category_id") as string) || null,
      short_description: String(fd.get("short_description") || ""),
      description: String(fd.get("description") || ""),
      price: quoteOnly ? null : Number(fd.get("price") || 0),
      sale_price: fd.get("sale_price") ? Number(fd.get("sale_price")) : null,
      delivery_charge: fd.get("delivery_charge") ? Number(fd.get("delivery_charge")) : null,
      stock_quantity: Number(fd.get("stock_quantity") || 0),
      low_stock_threshold: Number(fd.get("low_stock_threshold") || 5),
      material: String(fd.get("material") || ""),
      dimensions: String(fd.get("dimensions") || ""),
      colour: String(fd.get("colour") || ""),
      finish: String(fd.get("finish") || ""),
      weight: String(fd.get("weight") || ""),
      shipping_weight: fd.get("shipping_weight") ? Number(fd.get("shipping_weight")) : null,
      length_cm: fd.get("length_cm") ? Number(fd.get("length_cm")) : null,
      breadth_cm: fd.get("breadth_cm") ? Number(fd.get("breadth_cm")) : null,
      height_cm: fd.get("height_cm") ? Number(fd.get("height_cm")) : null,
      product_type: String(fd.get("product_type")) as any,
      is_customizable: fd.get("is_customizable") === "on",
      is_active: fd.get("is_active") === "on",
      is_featured: fd.get("is_featured") === "on",
      is_quote_only: quoteOnly,
    };
    const res = await upsertProduct(input);
    setSaving(false);
    if (!res.ok) return toast.error(res.error ?? "Failed to save");
    toast.success("Product saved");
    if (!productId && res.id) router.push(`/admin/products/${res.id}/edit`);
    else router.refresh();
  }

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !productId) return;
    setUploading(true);
    const supabase = createClient();
    const path = `products/${product?.slug ?? productId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
    if (error) { setUploading(false); return toast.error(error.message); }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const res = await addProductImage(productId, data.publicUrl, path, images.length === 0);
    setUploading(false);
    if (!res.ok) return toast.error(res.error ?? "Failed");
    toast.success("Image uploaded");
    router.refresh();
    setImages((prev) => [...prev, { id: crypto.randomUUID(), url: data.publicUrl, is_primary: prev.length === 0 } as any]);
  }

  async function removeImage(id: string) {
    const res = await deleteProductImage(id);
    if (res.ok) { setImages((prev) => prev.filter((i) => i.id !== id)); router.refresh(); }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card title="Basic Information">
          <div className="grid gap-4 sm:grid-cols-2">
            <F label="Name *" full><Input name="name" defaultValue={product?.name} required /></F>
            <F label="SKU *"><Input name="sku" defaultValue={product?.sku} required /></F>
            <F label="Category">
              <select name="category_id" defaultValue={product?.category_id ?? ""} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Uncategorised</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.parent_id ? "— " : ""}{c.name}</option>)}
              </select>
            </F>
            <F label="Short description" full><Input name="short_description" defaultValue={product?.short_description ?? ""} /></F>
            <F label="Full description" full><Textarea name="description" rows={4} defaultValue={product?.description ?? ""} /></F>
          </div>
        </Card>

        <Card title="Specifications">
          <div className="grid gap-4 sm:grid-cols-2">
            <F label="Dimensions / Size"><Input name="dimensions" defaultValue={product?.dimensions ?? ""} /></F>
            <F label="Material"><Input name="material" defaultValue={product?.material ?? ""} /></F>
            <F label="Colour"><Input name="colour" defaultValue={product?.colour ?? ""} /></F>
            <F label="Finish"><Input name="finish" defaultValue={product?.finish ?? ""} /></F>
            <F label="Weight (shown to customer, e.g. “2 kg”)"><Input name="weight" defaultValue={product?.weight ?? ""} /></F>
          </div>
        </Card>

        <Card title="Shipping (for live delivery estimate)">
          <p className="-mt-1 mb-1 text-xs text-muted-foreground">
            Used to quote real courier rates by pincode. Enter the packed parcel weight and box size.
            Leave blank and a default is used until you fill it in.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <F label="Shipping weight (kg)"><Input name="shipping_weight" type="number" min={0} step="0.1" defaultValue={product?.shipping_weight ?? ""} /></F>
            <div className="hidden sm:block" />
            <F label="Length (cm)"><Input name="length_cm" type="number" min={0} step="1" defaultValue={product?.length_cm ?? ""} /></F>
            <F label="Breadth (cm)"><Input name="breadth_cm" type="number" min={0} step="1" defaultValue={product?.breadth_cm ?? ""} /></F>
            <F label="Height (cm)"><Input name="height_cm" type="number" min={0} step="1" defaultValue={product?.height_cm ?? ""} /></F>
          </div>
        </Card>

        <Card title="Images">
          {!productId ? (
            <p className="text-sm text-muted-foreground">Save the product first, then upload images.</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {images.map((img) => (
                  <div key={img.id} className="group relative aspect-square overflow-hidden rounded-md border bg-secondary">
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                    {img.is_primary && <Star className="absolute left-1 top-1 h-4 w-4 fill-warning text-warning" />}
                    <button type="button" onClick={() => removeImage(img.id)} className="absolute right-1 top-1 rounded bg-background/80 p-1 opacity-0 group-hover:opacity-100">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                ))}
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground hover:border-brand">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                  Upload
                  <input type="file" accept="image/*" className="hidden" onChange={uploadImage} disabled={uploading} />
                </label>
              </div>
            </>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        <Card title="Pricing & Type">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={quoteOnly} onChange={(e) => setQuoteOnly(e.target.checked)} name="is_quote_only_ui" />
            Quote only (no online price)
          </label>
          {!quoteOnly && (
            <>
              <F label="Price (₹) *"><Input name="price" type="number" min={0} step="1" defaultValue={product?.price ?? ""} /></F>
              <F label="Sale price (₹)"><Input name="sale_price" type="number" min={0} step="1" defaultValue={product?.sale_price ?? ""} /></F>
            </>
          )}
          <F label="Product type">
            <select name="product_type" defaultValue={product?.product_type ?? "READY_MADE"} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t.replaceAll("_", " ")}</option>)}
            </select>
          </F>
          <F label="Delivery charge (₹) — per unit, blank = site default">
            <Input name="delivery_charge" type="number" min={0} step="1" defaultValue={product?.delivery_charge ?? ""} />
          </F>
        </Card>

        <Card title="Inventory">
          <F label="Stock quantity"><Input name="stock_quantity" type="number" min={0} defaultValue={product?.stock_quantity ?? 0} /></F>
          <F label="Low stock threshold"><Input name="low_stock_threshold" type="number" min={0} defaultValue={product?.low_stock_threshold ?? 5} /></F>
        </Card>

        <Card title="Visibility">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={product?.is_active ?? true} /> Active (visible in shop)</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_featured" defaultChecked={product?.is_featured ?? false} /> Featured</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_customizable" defaultChecked={product?.is_customizable ?? false} /> Customisable (custom sizes)</label>
        </Card>

        <Button type="submit" variant="brand" className="w-full" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} {productId ? "Save changes" : "Create product"}
        </Button>
      </div>
    </form>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <h2 className="mb-4 font-semibold">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
function F({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <Label className="mb-1 block text-xs">{label}</Label>
      {children}
    </div>
  );
}
