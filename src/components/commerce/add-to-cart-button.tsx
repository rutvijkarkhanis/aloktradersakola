"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Check, Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useCart, type CartLine } from "@/lib/store/cart";
import { toast } from "@/components/ui/sonner";

type Props = {
  line: Omit<CartLine, "quantity">;
  quantity?: number;
  buyNow?: boolean;
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
};

export function AddToCartButton({
  line,
  quantity = 1,
  buyNow = false,
  label,
  variant = "brand",
  size = "default",
  className,
}: Props) {
  const add = useCart((s) => s.add);
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const outOfStock = line.stock === 0 ? false : line.stock < 0; // stock 0 = made-to-order (allowed)

  function handle() {
    if (outOfStock) return;
    setLoading(true);
    add(line, quantity);
    if (buyNow) {
      router.push("/checkout");
      return;
    }
    setLoading(false);
    setDone(true);
    toast.success(`${line.name} added to cart`);
    setTimeout(() => setDone(false), 1500);
  }

  return (
    <Button variant={variant} size={size} className={className} onClick={handle} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : done ? (
        <Check className="h-4 w-4" />
      ) : (
        <ShoppingCart className="h-4 w-4" />
      )}
      {label ?? (buyNow ? "Buy Now" : "Add to Cart")}
    </Button>
  );
}
