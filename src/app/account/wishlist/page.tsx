import Link from "next/link";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProductByIds } from "@/lib/queries";
import { ProductCard } from "@/components/commerce/product-card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const supabase = createClient();
  const { data: items } = await supabase.from("wishlist_items").select("product_id");
  const ids = (items ?? []).map((i) => i.product_id);
  const products = await getProductByIds(ids);

  return (
    <div>
      <h1 className="text-2xl font-bold">Wishlist</h1>
      {products.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-lg border border-dashed py-16 text-center">
          <Heart className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Your wishlist is empty.</p>
          <Button asChild className="mt-4" variant="brand"><Link href="/shop">Browse products</Link></Button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
