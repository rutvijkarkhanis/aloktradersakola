import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/queries";
import { ProductForm } from "@/components/admin/product-form";
import type { ProductFull } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: product }, categories] = await Promise.all([
    supabase
      .from("products")
      .select("*, category:categories(*), images:product_images(*), attributes:product_attributes(*)")
      .eq("id", params.id)
      .maybeSingle(),
    getCategories(),
  ]);
  if (!product) notFound();

  const full = {
    ...(product as any),
    images: ((product as any).images ?? []).sort((a: any, b: any) => (a.is_primary === b.is_primary ? a.sort_order - b.sort_order : a.is_primary ? -1 : 1)),
    attributes: (product as any).attributes ?? [],
  } as ProductFull;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Edit Product</h1>
      <ProductForm categories={categories} product={full} />
    </div>
  );
}
