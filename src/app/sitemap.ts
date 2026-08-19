import type { MetadataRoute } from "next";
import { getAllProductSlugs, getCategories } from "@/lib/queries";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const staticRoutes = [
    "", "/shop", "/custom-fabrication", "/about", "/contact",
    "/terms", "/privacy", "/shipping-policy", "/refund-policy", "/payment-policy",
  ].map((p) => ({
    url: `${base}${p}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.6,
  }));

  let products: MetadataRoute.Sitemap = [];
  let categories: MetadataRoute.Sitemap = [];
  try {
    const slugs = await getAllProductSlugs();
    products = slugs.map((s) => ({
      url: `${base}/products/${s.slug}`,
      lastModified: new Date(s.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
    const cats = await getCategories(true);
    categories = cats.map((c) => ({
      url: `${base}/shop?category=${c.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));
  } catch {
    // DB not configured yet — return static routes only.
  }

  return [...staticRoutes, ...categories, ...products];
}
