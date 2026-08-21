"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus, MessageCircle, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddToCartButton } from "@/components/commerce/add-to-cart-button";
import { WishlistButton } from "@/components/commerce/wishlist-button";
import { whatsappHref, productEnquiryMessage } from "@/lib/whatsapp";
import { isPurchasable, showsCustomQuote } from "@/lib/pricing";
import type { ProductFull } from "@/lib/types/database";

export function PurchasePanel({
  product,
  whatsappNumber,
}: {
  product: ProductFull;
  whatsappNumber: string | null;
}) {
  const [qty, setQty] = useState(1);
  const primary = product.images.find((i) => i.is_primary) ?? product.images[0];
  const purchasable = isPurchasable(product);
  const custom = showsCustomQuote(product);
  const maxQty = product.stock_quantity > 0 ? product.stock_quantity : 99;

  const wa = whatsappHref(
    whatsappNumber,
    productEnquiryMessage({ name: product.name, sku: product.sku, price: product.price, quantity: qty }),
  );

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
    <div className="space-y-4">
      {purchasable && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Quantity</span>
          <div className="flex items-center rounded-md border">
            <button
              className="flex h-10 w-10 items-center justify-center hover:bg-secondary disabled:opacity-40"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              aria-label="Decrease"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center text-sm font-semibold">{qty}</span>
            <button
              className="flex h-10 w-10 items-center justify-center hover:bg-secondary disabled:opacity-40"
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              disabled={qty >= maxQty}
              aria-label="Increase"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {product.stock_quantity > 0 && (
            <span className="text-xs text-muted-foreground">{product.stock_quantity} available</span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {purchasable ? (
          <>
            <AddToCartButton className="flex-1" size="lg" line={line} quantity={qty} />
            <AddToCartButton className="flex-1" size="lg" variant="default" line={line} quantity={qty} buyNow />
          </>
        ) : (
          <Button asChild size="lg" variant="brand" className="flex-1">
            <Link href={`/custom-fabrication?product=${encodeURIComponent(product.name)}&sku=${product.sku}`}>
              {product.product_type === "CUSTOM" ? "Request Custom Quote" : "Request a Quote"}
            </Link>
          </Button>
        )}
        <WishlistButton productId={product.id} showLabel className="sm:w-auto" />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {custom && purchasable && (
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/custom-fabrication?product=${encodeURIComponent(product.name)}&sku=${product.sku}`}>
              <Ruler className="h-4 w-4" /> Request Custom Size
            </Link>
          </Button>
        )}
        {wa && (
          <Button asChild variant="success" className="flex-1">
            <a href={wa} target="_blank" rel="noopener">
              <MessageCircle className="h-4 w-4" /> WhatsApp Enquiry
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
