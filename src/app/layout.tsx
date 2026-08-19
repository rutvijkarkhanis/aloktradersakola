import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getSiteSettings } from "@/lib/settings";
import { getCategories } from "@/lib/queries";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings().catch(() => null);
  const name = s?.business_name || "Alok Traders Akola";
  const url = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return {
    metadataBase: new URL(url),
    title: {
      default: `${name} — Fabrication & Event Décor Products`,
      template: `%s | ${name}`,
    },
    description:
      s?.description ||
      "Shop fabrication structures, event decoration products and custom solutions for weddings, birthdays, parties and events.",
    keywords: [
      "fabrication products", "event decoration", "wedding decoration", "backdrop stands",
      "balloon rings", "arches", "canopies", "cake tables", "Akola", "custom fabrication",
    ],
    openGraph: { title: name, description: s?.description || "", type: "website", url },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, categories] = await Promise.all([
    getSiteSettings().catch(() => null),
    getCategories().catch(() => []),
  ]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased flex flex-col">
        <SiteHeader settings={settings} categories={categories} />
        <main className="flex-1">{children}</main>
        <SiteFooter settings={settings} categories={categories} />
        <Toaster />
      </body>
    </html>
  );
}
