import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Truck, ShieldCheck, Wrench, PackageCheck, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Price } from "@/components/commerce/price";
import { ProductCard } from "@/components/commerce/product-card";
import { ProductGallery } from "@/components/product/gallery";
import { PurchasePanel } from "@/components/product/purchase-panel";
import { StarRating } from "@/components/product/star-rating";
import { ReviewForm } from "@/components/product/review-form";
import { getProductBySlug, getRelatedProducts, getApprovedReviews } from "@/lib/queries";
import { canUserReview } from "@/app/actions/reviews";
import { getSiteSettings } from "@/lib/settings";
import { formatDate } from "@/lib/utils";

export const revalidate = 30;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductBySlug(params.slug).catch(() => null);
  if (!product) return { title: "Product not found" };
  const img = product.images.find((i) => i.is_primary)?.url ?? product.images[0]?.url;
  return {
    title: product.seo_title ?? product.name,
    description: product.seo_description ?? product.short_description ?? undefined,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.short_description ?? "",
      images: img ? [{ url: img }] : [],
      type: "website",
    },
  };
}

const STATUS = (p: any) =>
  p.is_quote_only
    ? { label: "Quote only", variant: "warning" as const }
    : p.stock_quantity <= 0
      ? { label: "Made to order", variant: "secondary" as const }
      : p.stock_quantity <= p.low_stock_threshold
        ? { label: "Low stock", variant: "warning" as const }
        : { label: "In stock", variant: "success" as const };

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product || !product.is_active) notFound();

  const [related, reviews, settings, canReview] = await Promise.all([
    getRelatedProducts(product.id, product.category_id, 4),
    getApprovedReviews(product.id),
    getSiteSettings().catch(() => null),
    canUserReview(product.id).catch(() => false),
  ]);

  const status = STATUS(product);
  const avg = reviews.length ? reviews.reduce((s, r: any) => s + r.rating, 0) / reviews.length : 0;

  const specs: { label: string; value: string | null }[] = [
    { label: "Dimensions / Size", value: product.dimensions },
    { label: "Material", value: product.material },
    { label: "Colour", value: product.colour },
    { label: "Finish", value: product.finish },
    { label: "Weight", value: product.weight },
    { label: "SKU", value: product.sku },
    { label: "Category", value: product.category?.name ?? null },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    description: product.short_description ?? product.description ?? "",
    image: product.images.map((i) => i.url),
    brand: { "@type": "Brand", name: settings?.business_name ?? "Alok Traders Akola" },
    ...(product.price != null && !product.is_quote_only
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "INR",
            price: (product.sale_price ?? product.price).toString(),
            availability:
              product.stock_quantity > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/PreOrder",
          },
        }
      : {}),
    ...(reviews.length
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: avg.toFixed(1), reviewCount: reviews.length } }
      : {}),
  };

  return (
    <div className="container-wide py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="mb-4 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link> <span className="mx-1">/</span>
        <Link href="/shop" className="hover:text-foreground">Shop</Link>
        {product.category && (
          <>
            <span className="mx-1">/</span>
            <Link href={`/shop?category=${product.category.slug}`} className="hover:text-foreground">
              {product.category.name}
            </Link>
          </>
        )}
        <span className="mx-1">/</span> <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />

        <div>
          <div className="flex items-center gap-2">
            <Badge variant={status.variant}>{status.label}</Badge>
            {product.is_customizable && <Badge variant="outline">Custom sizes available</Badge>}
            {product.needs_review && <Badge variant="secondary">Spec pending review</Badge>}
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{product.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">SKU: {product.sku}</p>

          {reviews.length > 0 && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              <StarRating value={avg} />
              <span className="text-muted-foreground">{avg.toFixed(1)} ({reviews.length})</span>
            </div>
          )}

          <div className="mt-4">
            <Price price={product.price} salePrice={product.sale_price} isQuoteOnly={product.is_quote_only} size="lg" />
            {product.is_quote_only && (
              <p className="mt-1 text-sm text-muted-foreground">
                This item is made to order — request a quote for pricing.
              </p>
            )}
          </div>

          {product.short_description && (
            <p className="mt-4 text-sm text-muted-foreground">{product.short_description}</p>
          )}

          <Separator className="my-5" />
          <PurchasePanel product={product} whatsappNumber={settings?.whatsapp_number ?? null} />

          <div className="mt-6 grid grid-cols-2 gap-3 rounded-lg border bg-secondary/40 p-4 text-sm sm:grid-cols-4">
            {[
              { icon: PackageCheck, t: "Made to order" },
              { icon: Wrench, t: "Custom sizes" },
              { icon: ShieldCheck, t: "Secure payment" },
              { icon: Truck, t: "Pan-India delivery" },
            ].map((f) => (
              <div key={f.t} className="flex flex-col items-center gap-1 text-center text-xs text-muted-foreground">
                <f.icon className="h-5 w-5 text-brand" /> {f.t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="text-lg font-bold">Product Details</h2>
          {product.description && (
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}

          <Accordion type="multiple" defaultValue={["specs", "delivery"]} className="mt-6">
            <AccordionItem value="specs">
              <AccordionTrigger>Specifications</AccordionTrigger>
              <AccordionContent>
                <dl className="divide-y">
                  {specs.filter((s) => s.value).map((s) => (
                    <div key={s.label} className="flex justify-between gap-4 py-2 text-sm">
                      <dt className="text-muted-foreground">{s.label}</dt>
                      <dd className="text-right font-medium text-foreground">{s.value}</dd>
                    </div>
                  ))}
                  {product.attributes.map((a) => (
                    <div key={a.id} className="flex justify-between gap-4 py-2 text-sm">
                      <dt className="text-muted-foreground">{a.name}</dt>
                      <dd className="text-right font-medium text-foreground">{a.value}</dd>
                    </div>
                  ))}
                </dl>
                {(!product.material || !product.colour) && (
                  <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Some specifications may not be listed in the catalogue. Contact us for exact details or custom options.
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="customisation">
              <AccordionTrigger>Customisation</AccordionTrigger>
              <AccordionContent>
                This product can be fabricated in custom sizes, colours and finishes to suit your event.
                Use <Link href="/custom-fabrication" className="text-brand underline">Custom Fabrication</Link> or the
                WhatsApp enquiry button to share your requirement.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="delivery">
              <AccordionTrigger>Delivery Information</AccordionTrigger>
              <AccordionContent>
                {product.delivery_charge != null && product.delivery_charge > 0 ? (
                  <p className="mb-2 font-medium text-foreground">
                    Delivery: ₹{product.delivery_charge} per unit (shipped via Delhivery).
                  </p>
                ) : null}
                Ready-made items are dispatched after order confirmation; made-to-order and custom pieces are
                fabricated to schedule. Delivery charges (if any) are shown at checkout. See our{" "}
                <Link href="/shipping-policy" className="text-brand underline">Shipping Policy</Link>.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Reviews */}
        <div>
          <h2 className="text-lg font-bold">Reviews</h2>
          {reviews.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No reviews yet.</p>
          ) : (
            <ul className="mt-3 space-y-4">
              {reviews.map((r: any) => (
                <li key={r.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <StarRating value={r.rating} size={14} />
                    {r.is_verified_purchase && <Badge variant="success">Verified</Badge>}
                  </div>
                  {r.title && <p className="mt-1 text-sm font-semibold">{r.title}</p>}
                  {r.comment && <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {r.profile?.full_name || "Customer"} · {formatDate(r.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            {canReview ? (
              <ReviewForm productId={product.id} slug={product.slug} />
            ) : (
              <p className="text-xs text-muted-foreground">
                Only verified purchasers can write a review.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 text-lg font-bold">Related Products</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
