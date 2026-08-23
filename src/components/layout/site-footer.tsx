"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Instagram, Facebook, MessageCircle, MapPin } from "lucide-react";
import type { Category, SiteSettings } from "@/lib/types/database";
import { whatsappHref } from "@/lib/whatsapp";
import { BUSINESS } from "@/lib/business";

export function SiteFooter({
  settings,
  categories,
}: {
  settings: SiteSettings | null;
  categories: Category[];
}) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  const name = settings?.business_name || "Alok Traders Akola";
  const parents = categories.filter((c) => !c.parent_id).slice(0, 6);
  const wa = whatsappHref(settings?.whatsapp_number, "Hello Alok Traders Akola");
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t bg-secondary/40">
      <div className="container-wide grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand text-brand-foreground font-bold">AT</span>
            <span className="text-base font-bold">{name}</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {settings?.description ||
              "Fabrication structures, event decoration products and custom solutions for weddings, birthdays, parties and events."}
          </p>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            {BUSINESS.branches.map((b) => (
              <a key={b.name} href={b.mapUrl} target="_blank" rel="noopener" className="flex items-start gap-2 hover:text-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <span><span className="font-medium text-foreground">{b.name}:</span> {b.address}</span>
              </a>
            ))}
            {wa && (
              <a href={wa} target="_blank" rel="noopener" className="flex items-center gap-2 hover:text-foreground">
                <MessageCircle className="h-4 w-4 text-brand" /> WhatsApp us
              </a>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Shop</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/shop" className="hover:text-foreground">All Products</Link></li>
            {parents.map((c) => (
              <li key={c.id}><Link href={`/shop?category=${c.slug}`} className="hover:text-foreground">{c.name}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Company</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/about" className="hover:text-foreground">About Us</Link></li>
            <li><Link href="/custom-fabrication" className="hover:text-foreground">Custom Fabrication</Link></li>
            <li><Link href="/contact" className="hover:text-foreground">Contact</Link></li>
            {wa && <li><a href={wa} target="_blank" rel="noopener" className="hover:text-foreground">WhatsApp Enquiry</a></li>}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Policies</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/shipping-policy" className="hover:text-foreground">Shipping</Link></li>
            <li><Link href="/refund-policy" className="hover:text-foreground">Returns & Refunds</Link></li>
            <li><Link href="/payment-policy" className="hover:text-foreground">Payment</Link></li>
            <li><Link href="/terms" className="hover:text-foreground">Terms & Conditions</Link></li>
            <li><Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
          </ul>
          <div className="mt-4 flex gap-3">
            {settings?.instagram_url && (
              <a href={settings.instagram_url} target="_blank" rel="noopener" aria-label="Instagram" className="text-muted-foreground hover:text-foreground">
                <Instagram className="h-5 w-5" />
              </a>
            )}
            {settings?.facebook_url && (
              <a href={settings.facebook_url} target="_blank" rel="noopener" aria-label="Facebook" className="text-muted-foreground hover:text-foreground">
                <Facebook className="h-5 w-5" />
              </a>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noopener" aria-label="WhatsApp" className="text-muted-foreground hover:text-foreground">
                <MessageCircle className="h-5 w-5" />
              </a>
            )}
          </div>
        </div>
      </div>
      <div className="border-t">
        <div className="container-wide flex flex-col items-center justify-between gap-2 py-4 text-xs text-muted-foreground sm:flex-row">
          <p>© {year} {name}. All rights reserved.</p>
          <p>Prices in INR (₹). Ready-made & custom fabrication.</p>
        </div>
      </div>
    </footer>
  );
}
