import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/commerce/price";
import { AddToCartButton } from "@/components/commerce/add-to-cart-button";
import { WishlistButton } from "@/components/commerce/wishlist-button";
import { primaryImage } from "@/lib/queries";
import { isPurchasable } from "@/lib/pricing";
import type { ProductWithImages } from "@/lib/types/database";

function stockBadge(p: ProductWithImages) {
  if (p.is_quote_only) return <Badge variant="warning">Quote only</Badge>;
  if (p.stock_quantity <= 0) return <Badge variant="secondary">Made to order</Badge>;
  if (p.stock_quantity <= p.low_stock_threshold)
    return <Badge variant="warning">Low stock</Badge>;
  return <Badge variant="success">In stock</Badge>;
}

export function ProductCard({ product }: { product: ProductWithImages }) {
  const img = primaryImage(product);
  const purchasable = isPurchasable(product);
  const price = product.sale_price ?? product.price;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md">
      <Link href={`/products/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-secondary">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img.url}
            alt={img.alt ?? product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No image</div>
        )}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.is_featured && <Badge variant="brand">Featured</Badge>}
          {product.sale_price != null && product.price != null && product.sale_price < product.price && (
            <Badge variant="destructive">Sale</Badge>
          )}
        </div>
      </Link>

      <div className="absolute right-2 top-2">
        <WishlistButton productId={product.id} className="h-8 w-8 bg-background/80 backdrop-blur" />
      </div>

      <div className="flex flex-1 flex-col p-3">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {product.category?.name ?? "Fabrication"}
          </span>
          {stockBadge(product)}
        </div>
        <Link href={`/products/${product.slug}`} className="line-clamp-2 text-sm font-semibold leading-snug hover:text-brand">
          {product.name}
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">SKU: {product.sku}</p>

        <div className="mt-2">
          <Price price={product.price} salePrice={product.sale_price} isQuoteOnly={product.is_quote_only} />
        </div>

        <div className="mt-3 flex gap-2">
          {purchasable ? (
            <>
              <AddToCartButton
                className="flex-1"
                size="sm"
                line={{
                  productId: product.id,
                  slug: product.slug,
                  name: product.name,
                  sku: product.sku,
                  price: product.price ?? 0,
                  salePrice: product.sale_price,
                  image: img?.url ?? null,
                  stock: product.stock_quantity,
                }}
              />
            </>
          ) : (
            <Button asChild variant="brand" size="sm" className="flex-1">
              <Link href={`/products/${product.slug}`}>Request a Quote</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
