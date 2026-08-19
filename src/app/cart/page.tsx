"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/lib/store/cart";
import { formatINR } from "@/lib/utils";

export default function CartPage() {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const subtotal = useCart((s) => s.subtotal());

  if (lines.length === 0) {
    return (
      <div className="container-wide flex flex-col items-center justify-center py-24 text-center">
        <ShoppingBag className="h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-bold">Your cart is empty</h1>
        <p className="mt-1 text-sm text-muted-foreground">Browse the catalogue and add products to your cart.</p>
        <Button asChild className="mt-6" variant="brand"><Link href="/shop">Shop Products</Link></Button>
      </div>
    );
  }

  return (
    <div className="container-wide py-8">
      <h1 className="text-2xl font-bold tracking-tight">Shopping Cart</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ul className="divide-y rounded-lg border">
            {lines.map((l) => {
              const unit = l.salePrice && l.salePrice < l.price ? l.salePrice : l.price;
              return (
                <li key={l.productId} className="flex gap-4 p-4">
                  <Link href={`/products/${l.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-md border bg-secondary">
                    {l.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.image} alt={l.name} className="h-full w-full object-cover" />
                    ) : null}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link href={`/products/${l.slug}`} className="text-sm font-semibold hover:text-brand">{l.name}</Link>
                        <p className="text-xs text-muted-foreground">SKU: {l.sku}</p>
                      </div>
                      <button onClick={() => remove(l.productId)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center rounded-md border">
                        <button className="flex h-8 w-8 items-center justify-center hover:bg-secondary disabled:opacity-40" onClick={() => setQty(l.productId, l.quantity - 1)} disabled={l.quantity <= 1}>
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-9 text-center text-sm font-semibold">{l.quantity}</span>
                        <button className="flex h-8 w-8 items-center justify-center hover:bg-secondary disabled:opacity-40" onClick={() => setQty(l.productId, l.quantity + 1)} disabled={l.stock > 0 && l.quantity >= l.stock}>
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{formatINR(unit * l.quantity)}</p>
                        <p className="text-xs text-muted-foreground">{formatINR(unit)} each</p>
                      </div>
                    </div>
                    {l.stock > 0 && l.quantity >= l.stock && (
                      <p className="mt-1 text-xs text-warning">Max available stock reached</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-4">
            <Button asChild variant="outline"><Link href="/shop">Continue Shopping</Link></Button>
          </div>
        </div>

        <div>
          <div className="sticky top-28 rounded-lg border bg-card p-5">
            <h2 className="font-semibold">Order Summary</h2>
            <Separator className="my-3" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold">{formatINR(subtotal)}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Delivery, taxes and any coupon discount are calculated at checkout. Choose full payment or
              50% advance + 50% on delivery.
            </p>
            <Button variant="brand" className="mt-4 w-full" size="lg" onClick={() => router.push("/checkout")}>
              Proceed to Checkout <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
