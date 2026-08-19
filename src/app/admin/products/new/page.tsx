import { getCategories } from "@/lib/queries";
import { ProductForm } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const categories = await getCategories();
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Add Product</h1>
      <ProductForm categories={categories} />
    </div>
  );
}
