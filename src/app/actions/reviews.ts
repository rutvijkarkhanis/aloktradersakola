"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  productId: z.string().uuid(),
  slug: z.string(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  comment: z.string().max(2000).optional(),
});

/** Verified-purchaser check: user has a paid/delivered order containing the product. */
export async function canUserReview(productId: string): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("order_items")
    .select("order_id, orders!inner(customer_id, payment_status)")
    .eq("product_id", productId)
    .eq("orders.customer_id", user.id)
    .in("orders.payment_status", ["PAID", "PARTIALLY_PAID"])
    .limit(1);
  return !!data && data.length > 0;
}

export async function submitReview(_prev: unknown, formData: FormData) {
  const parsed = schema.safeParse({
    productId: formData.get("productId"),
    slug: formData.get("slug"),
    rating: formData.get("rating"),
    title: formData.get("title") || undefined,
    comment: formData.get("comment") || undefined,
  });
  if (!parsed.success) return { ok: false, error: "Please provide a valid rating." };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please log in to write a review." };

  const verified = await canUserReview(parsed.data.productId);
  if (!verified) {
    return { ok: false, error: "Only verified purchasers can review this product." };
  }

  const { error } = await supabase.from("reviews").upsert(
    {
      product_id: parsed.data.productId,
      user_id: user.id,
      rating: parsed.data.rating,
      title: parsed.data.title ?? null,
      comment: parsed.data.comment ?? null,
      is_verified_purchase: true,
      is_approved: false, // admin moderation required
    },
    { onConflict: "product_id,user_id" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/products/${parsed.data.slug}`);
  return { ok: true, error: null };
}
