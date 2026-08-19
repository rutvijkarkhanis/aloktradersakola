import Link from "next/link";
import {
  ArrowRight, Truck, ShieldCheck, Wrench, Layers, MessageCircle, PackageCheck, IndianRupee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/commerce/product-card";
import { getFeaturedProducts, getBestSellers, getCategories, getEventCategories } from "@/lib/queries";
import { getSiteSettings } from "@/lib/settings";
import { whatsappHref, bulkEnquiryMessage } from "@/lib/whatsapp";

export const revalidate = 60;

export default async function HomePage() {
  const [featured, bestSellers, categories, eventCategories, settings] = await Promise.all([
    getFeaturedProducts(8).catch(() => []),
    getBestSellers(8).catch(() => []),
    getCategories().catch(() => []),
    getEventCategories().catch(() => []),
    getSiteSettings().catch(() => null),
  ]);
  const parents = categories.filter((c) => !c.parent_id);
  const wa = whatsappHref(settings?.whatsapp_number, bulkEnquiryMessage());

  return (
    <div>
      {/* HERO */}
      <section className="border-b bg-gradient-to-b from-accent/40 to-background">
        <div className="container-wide grid items-center gap-8 py-12 lg:grid-cols-2 lg:py-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-brand" /> Ready-made & custom fabrication · Bulk orders welcome
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Fabrication & Event Décor Products
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
              Shop fabrication structures, event decoration products and custom solutions for
              weddings, birthdays, parties and events. Real prices, ready to order.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="brand">
                <Link href="/shop">Shop Products <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/custom-fabrication">Custom Fabrication</Link>
              </Button>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { icon: PackageCheck, label: "37+ products" },
                { icon: IndianRupee, label: "Transparent INR pricing" },
                { icon: Wrench, label: "Custom sizes" },
                { icon: Truck, label: "Pan-India dispatch" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <f.icon className="h-5 w-5 text-brand" /> {f.label}
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {featured.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.slug}`}
                className="relative aspect-square overflow-hidden rounded-lg border bg-secondary"
              >
                {p.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.images[0].url} alt={p.name} className="h-full w-full object-cover" />
                ) : null}
                <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-xs font-medium text-white">
                  {p.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SHOP BY CATEGORY */}
      <Section title="Shop by Category" href="/shop" cta="View all">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {parents.map((c) => (
            <Link
              key={c.id}
              href={`/shop?category=${c.slug}`}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-card p-6 text-center transition-colors hover:border-brand hover:bg-accent/40"
            >
              <Layers className="h-7 w-7 text-brand" />
              <span className="text-sm font-semibold">{c.name}</span>
            </Link>
          ))}
        </div>
      </Section>

      {/* FEATURED */}
      {featured.length > 0 && (
        <Section title="Featured Products" href="/shop?sort=featured" cta="See more">
          <ProductRow products={featured} />
        </Section>
      )}

      {/* BEST SELLERS */}
      {bestSellers.length > 0 && (
        <Section title="Popular Products" href="/shop" cta="Shop all">
          <ProductRow products={bestSellers} />
        </Section>
      )}

      {/* SHOP BY EVENT */}
      {eventCategories.length > 0 && (
        <Section title="Shop by Event Type" subtitle="Find décor and structures for your occasion">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {eventCategories.map((e) => (
              <Link
                key={e.id}
                href={`/shop?event=${e.slug}`}
                className="rounded-lg border bg-card px-3 py-4 text-center text-sm font-medium transition-colors hover:border-brand hover:bg-accent/40"
              >
                {e.name.replace(" Events", "")}
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* CUSTOM FABRICATION + BULK */}
      <section className="container-wide py-10">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col justify-between rounded-xl border bg-primary p-8 text-primary-foreground">
            <div>
              <h3 className="text-2xl font-bold">Custom Fabrication</h3>
              <p className="mt-2 max-w-md text-sm text-primary-foreground/80">
                Need a specific size, shape or finish? Submit your requirement and our team will
                fabricate it to order and share a quote.
              </p>
            </div>
            <Button asChild variant="brand" className="mt-6 w-fit">
              <Link href="/custom-fabrication">Request Custom Quote <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="flex flex-col justify-between rounded-xl border bg-accent/50 p-8">
            <div>
              <h3 className="text-2xl font-bold">Bulk Orders Welcome</h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Need multiple pieces for an event or business? Contact us for bulk requirements and
                wholesale pricing.
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <Button asChild variant="default" className="w-fit">
                <Link href="/custom-fabrication?type=bulk">Request Bulk Quote</Link>
              </Button>
              {wa && (
                <Button asChild variant="outline" className="w-fit">
                  <a href={wa} target="_blank" rel="noopener"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <Section title="Why Choose Us">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Wrench, t: "Made-to-order fabrication", d: "Standard catalogue plus fully custom sizes and finishes." },
            { icon: IndianRupee, t: "Clear INR pricing", d: "Transparent prices — or request a quote where custom." },
            { icon: ShieldCheck, t: "Secure payments", d: "Pay 100% online or 50% advance + 50% on delivery." },
            { icon: Truck, t: "Reliable dispatch", d: "Careful packing and pan-India delivery for events." },
          ].map((f) => (
            <div key={f.t} className="rounded-lg border bg-card p-5">
              <f.icon className="h-7 w-7 text-brand" />
              <h4 className="mt-3 font-semibold">{f.t}</h4>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({
  title, subtitle, href, cta, children,
}: {
  title: string; subtitle?: string; href?: string; cta?: string; children: React.ReactNode;
}) {
  return (
    <section className="container-wide py-10">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {href && cta && (
          <Button asChild variant="link" className="shrink-0">
            <Link href={href}>{cta} <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        )}
      </div>
      {children}
    </section>
  );
}

function ProductRow({ products }: { products: Awaited<ReturnType<typeof getFeaturedProducts>> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
