import type { Metadata } from "next";
import { PackageSearch } from "lucide-react";
import { ProductCard } from "@/components/commerce/product-card";
import { ShopFilters } from "@/components/shop/filters";
import { MobileFilters } from "@/components/shop/mobile-filters";
import { SortSelect } from "@/components/shop/sort-select";
import { Pagination } from "@/components/shop/pagination";
import { getProducts, getCategories, getCategoryBySlug } from "@/lib/queries";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Shop Fabrication & Event Décor Products",
  description:
    "Browse fabrication structures, backdrop stands, rings, arches, canopies, cake tables and more. Filter by category, price and availability.",
};

type SP = Record<string, string | undefined>;

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const page = Number(searchParams.page ?? "1") || 1;
  const [{ products, total, pageCount }, categories] = await Promise.all([
    getProducts({
      q: searchParams.q,
      category: searchParams.category,
      event: searchParams.event,
      minPrice: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
      maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
      availability: searchParams.availability,
      productType: searchParams.productType,
      material: searchParams.material,
      colour: searchParams.colour,
      sort: searchParams.sort,
      page,
    }),
    getCategories(),
  ]);

  const activeCat = searchParams.category ? await getCategoryBySlug(searchParams.category) : null;
  const heading = activeCat?.name ?? (searchParams.q ? `Search: “${searchParams.q}”` : "All Products");

  return (
    <div className="container-wide py-8">
      <div className="mb-6">
        <nav className="text-xs text-muted-foreground">
          <span>Home</span> <span className="mx-1">/</span> <span className="text-foreground">Shop</span>
        </nav>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{heading}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{total} product{total === 1 ? "" : "s"}</p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-28 rounded-lg border bg-card p-4">
            <h2 className="mb-2 text-sm font-semibold">Filters</h2>
            <ShopFilters categories={categories} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-5 flex items-center justify-between gap-3">
            <MobileFilters categories={categories} />
            <div className="ml-auto">
              <SortSelect />
            </div>
          </div>

          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
              <PackageSearch className="h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 font-semibold">No products match your filters</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Try clearing filters or browsing all products. If the catalogue hasn&apos;t been
                imported yet, run <code className="rounded bg-muted px-1">npm run db:import</code>.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              <Pagination page={page} pageCount={pageCount} searchParams={searchParams} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
