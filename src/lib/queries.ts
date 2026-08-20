import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE } from "@/lib/constants";
import type {
  Category,
  Product,
  ProductImage,
  ProductWithImages,
  ProductFull,
} from "@/lib/types/database";

// Disambiguate the category embed: products relate to categories via BOTH the
// category_id FK and the product_event_categories junction, so PostgREST needs
// the explicit FK name (PGRST201 otherwise).
const LIST_SELECT =
  "*, category:categories!products_category_id_fkey(*), images:product_images(*)";

// Nested selects (images:product_images(*)) aren't typed by supabase-js without
// full Relationships metadata, so these read helpers accept the raw row and
// return our hand-written composite types.
function attachPrimary(row: any): ProductWithImages {
  const images: ProductImage[] = ((row?.images as ProductImage[]) ?? []).slice().sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return a.sort_order - b.sort_order;
  });
  return { ...(row as Product), category: (row?.category as Category) ?? null, images };
}

export async function getCategories(includeEvent = false): Promise<Category[]> {
  const supabase = createClient();
  let q = supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
  if (!includeEvent) q = q.eq("is_event_category", false);
  const { data } = await q;
  return data ?? [];
}

export async function getEventCategories(): Promise<Category[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .eq("is_event_category", true)
    .order("sort_order");
  return data ?? [];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = createClient();
  const { data } = await supabase.from("categories").select("*").eq("slug", slug).maybeSingle();
  return data;
}

export type ShopFilters = {
  q?: string;
  category?: string; // slug
  event?: string; // event category slug
  minPrice?: number;
  maxPrice?: number;
  availability?: string; // in_stock | made_to_order | quote_only
  productType?: string;
  material?: string;
  colour?: string;
  sort?: string;
  page?: number;
};

export async function getProducts(filters: ShopFilters = {}): Promise<{
  products: ProductWithImages[];
  total: number;
  page: number;
  pageCount: number;
}> {
  const supabase = createClient();
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("products")
    .select(LIST_SELECT, { count: "exact" })
    .eq("is_active", true);

  if (filters.category) {
    const cat = await getCategoryBySlug(filters.category);
    if (cat) {
      // include direct children of a parent category
      const { data: children } = await supabase
        .from("categories")
        .select("id")
        .eq("parent_id", cat.id);
      const ids = [cat.id, ...(children?.map((c) => c.id) ?? [])];
      query = query.in("category_id", ids);
    }
  }

  if (filters.event) {
    const ev = await getCategoryBySlug(filters.event);
    if (ev) {
      const { data: links } = await supabase
        .from("product_event_categories")
        .select("product_id")
        .eq("category_id", ev.id);
      const ids = links?.map((l) => l.product_id) ?? ["00000000-0000-0000-0000-000000000000"];
      query = query.in("id", ids);
    }
  }

  if (filters.q) {
    const term = `%${filters.q}%`;
    query = query.or(
      `name.ilike.${term},sku.ilike.${term},short_description.ilike.${term},description.ilike.${term}`,
    );
  }

  if (typeof filters.minPrice === "number") query = query.gte("price", filters.minPrice);
  if (typeof filters.maxPrice === "number") query = query.lte("price", filters.maxPrice);
  if (filters.productType) query = query.eq("product_type", filters.productType as Product["product_type"]);
  if (filters.material) query = query.ilike("material", `%${filters.material}%`);
  if (filters.colour) query = query.ilike("colour", `%${filters.colour}%`);

  if (filters.availability === "quote_only") query = query.eq("is_quote_only", true);
  if (filters.availability === "in_stock") query = query.gt("stock_quantity", 0).eq("is_quote_only", false);
  if (filters.availability === "made_to_order")
    query = query.eq("stock_quantity", 0).eq("is_quote_only", false);

  switch (filters.sort) {
    case "price_asc":
      query = query.order("price", { ascending: true, nullsFirst: false });
      break;
    case "price_desc":
      query = query.order("price", { ascending: false, nullsFirst: false });
      break;
    case "name":
      query = query.order("name", { ascending: true });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    case "featured":
    default:
      query = query.order("is_featured", { ascending: false }).order("created_at", { ascending: false });
  }

  const { data, count } = await query.range(from, to);
  const products = (data ?? []).map(attachPrimary) as ProductWithImages[];
  const total = count ?? 0;
  return { products, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getFeaturedProducts(limit = 8): Promise<ProductWithImages[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("products")
    .select(LIST_SELECT)
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map(attachPrimary) as ProductWithImages[];
}

export async function getBestSellers(limit = 8): Promise<ProductWithImages[]> {
  // Without sales history yet, surface priced, in-stock products deterministically.
  const supabase = createClient();
  const { data } = await supabase
    .from("products")
    .select(LIST_SELECT)
    .eq("is_active", true)
    .eq("is_quote_only", false)
    .order("price", { ascending: true, nullsFirst: false })
    .limit(limit);
  return (data ?? []).map(attachPrimary) as ProductWithImages[];
}

export async function getProductBySlug(slug: string): Promise<ProductFull | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("products")
    .select(
      "*, category:categories!products_category_id_fkey(*), images:product_images(*), attributes:product_attributes(*)",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  const withPrimary = attachPrimary(data as any);
  (withPrimary as any).attributes = ((data as any).attributes ?? []).sort(
    (a: any, b: any) => a.sort_order - b.sort_order,
  );
  return withPrimary as ProductFull;
}

export async function getRelatedProducts(
  productId: string,
  categoryId: string | null,
  limit = 4,
): Promise<ProductWithImages[]> {
  const supabase = createClient();
  let q = supabase
    .from("products")
    .select(LIST_SELECT)
    .eq("is_active", true)
    .neq("id", productId)
    .limit(limit);
  if (categoryId) q = q.eq("category_id", categoryId);
  const { data } = await q;
  return (data ?? []).map(attachPrimary) as ProductWithImages[];
}

export async function getProductByIds(ids: string[]): Promise<ProductWithImages[]> {
  if (!ids.length) return [];
  const supabase = createClient();
  const { data } = await supabase.from("products").select(LIST_SELECT).in("id", ids);
  return (data ?? []).map(attachPrimary) as ProductWithImages[];
}

export async function getAllProductSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  const supabase = createClient();
  const { data } = await supabase.from("products").select("slug, updated_at").eq("is_active", true);
  return data ?? [];
}

export async function getApprovedReviews(productId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("reviews")
    .select("*")
    .eq("product_id", productId)
    .eq("is_approved", true)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export function primaryImage(p: { images?: ProductImage[] }): ProductImage | null {
  if (!p.images?.length) return null;
  return p.images.find((i) => i.is_primary) ?? p.images[0];
}
