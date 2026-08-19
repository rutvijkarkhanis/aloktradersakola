"use client";

import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/store/cart";
import { toast } from "@/components/ui/sonner";

type Item = {
  product_id: string | null;
  product_name: string;
  sku: string | null;
  image_url: string | null;
  unit_price: number;
  quantity: number;
  slug?: string | null;
  stock?: number;
};

export function ReorderButton({ items }: { items: Item[] }) {
  const add = useCart((s) => s.add);
  const router = useRouter();

  function reorder() {
    let added = 0;
    for (const it of items) {
      if (!it.product_id || !it.slug) continue;
      add(
        {
          productId: it.product_id,
          slug: it.slug,
          name: it.product_name,
          sku: it.sku,
          price: it.unit_price,
          salePrice: null,
          image: it.image_url,
          stock: it.stock ?? 0,
        },
        it.quantity,
      );
      added++;
    }
    if (added > 0) {
      toast.success("Items added to cart");
      router.push("/cart");
    } else {
      toast.error("These products are no longer available.");
    }
  }

  return (
    <Button variant="outline" onClick={reorder}>
      <RotateCcw className="h-4 w-4" /> Reorder
    </Button>
  );
}
