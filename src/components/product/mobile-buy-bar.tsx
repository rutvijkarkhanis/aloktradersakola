"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AddToCartButton } from "@/components/commerce/add-to-cart-button";
import { isPurchasable } from "@/lib/pricing";
import { formatINR } from "@/lib/utils";
import type { ProductFull } from "@/lib/types/database";

/**
 * Sticky bottom action bar on phones so price + buy stay reachable while the
 * customer scrolls through specs and reviews. Hidden on lg+ (the side panel
 * is always visible there) and until the user scrolls past the top panel.
 */
export function MobileBuyBar({ product }: { product: ProductFull }) {
  const [show, setShow] = useState(false);
  const purchasable = isPurchasable(product);
  const primary = product.images.find((i) => i.is_primary) ?? product.images[0];
  const unit = product.sale_price ?? product.price;

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const line = {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    sku: product.sku,
    price: product.price ?? 0,
    salePrice: product.sale_price,
    image: primary?.url ?? null,
    stock: product.stock_quantity,
    deliveryCharge: product.delivery_charge,
  };

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur transition-transform duration-200 lg:hidden ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="container-wide flex items-center gap-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">{product.name}</p>
          {purchasable && unit != null ? (
            <p className="text-base font-bold leading-tight">{formatINR(unit)}</p>
          ) : (
            <p className="text-sm font-semibold leading-tight text-brand">Quote on request</p>
          )}
        </div>
        {purchasable ? (
          <AddToCartButton className="shrink-0" size="lg" variant="brand" line={line} quantity={1} buyNow />
        ) : (
          <Button asChild size="lg" variant="brand" className="shrink-0">
            <Link href={`/custom-fabrication?product=${encodeURIComponent(product.name)}&sku=${product.sku}`}>
              Request a Quote
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
