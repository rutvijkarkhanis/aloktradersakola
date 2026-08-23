"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu, Search, ShoppingCart, Heart, User, MessageCircle, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetClose,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/lib/store/cart";
import { createClient } from "@/lib/supabase/client";
import { whatsappHref } from "@/lib/whatsapp";
import type { Category, SiteSettings } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/custom-fabrication", label: "Custom Fabrication" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({
  settings,
  categories,
}: {
  settings: SiteSettings | null;
  categories: Category[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isAdminArea = pathname?.startsWith("/admin") ?? false;
  const [q, setQ] = useState("");
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const count = useCart((s) => s.count());

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const supabase = createClient();
    const loadRole = async (uid: string | null) => {
      if (!uid) return setIsAdmin(false);
      const { data } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle();
      setIsAdmin(data?.role === "admin");
    };
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      loadRole(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
      loadRole(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const parents = categories.filter((c) => !c.parent_id);
  const childrenOf = (id: string) => categories.filter((c) => c.parent_id === id);
  const businessName = settings?.business_name || "Alok Traders Akola";
  const wa = whatsappHref(settings?.whatsapp_number, "Hello Alok Traders Akola, I have a query.");

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : "/shop");
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Announcement bar */}
      {!isAdminArea && (
      <div className="bg-primary text-primary-foreground">
        <div className="container-wide flex h-9 items-center justify-between text-xs sm:text-[13px]">
          <span className="truncate">Fabrication & Event Décor · Ready-made & custom · Bulk orders welcome</span>
          <div className="hidden items-center gap-4 sm:flex">
            {wa && (
              <a href={wa} target="_blank" rel="noopener" className="flex items-center gap-1 hover:underline">
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp us
              </a>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Main header */}
      <div className="container-wide flex h-16 items-center gap-3">
        {/* Mobile menu */}
        {!isAdminArea && (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] p-0">
            <SheetHeader className="border-b p-4 text-left">
              <SheetTitle>{businessName}</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col p-2">
              {NAV.map((n) => (
                <SheetClose asChild key={n.href}>
                  <Link href={n.href} className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-secondary">
                    {n.label}
                  </Link>
                </SheetClose>
              ))}
              <div className="mt-2 px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">Categories</div>
              {parents.map((p) => (
                <div key={p.id}>
                  <SheetClose asChild>
                    <Link href={`/shop?category=${p.slug}`} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary block">
                      {p.name}
                    </Link>
                  </SheetClose>
                  {childrenOf(p.id).map((c) => (
                    <SheetClose asChild key={c.id}>
                      <Link href={`/shop?category=${c.slug}`} className="block rounded-md px-6 py-1.5 text-sm text-muted-foreground hover:bg-secondary">
                        {c.name}
                      </Link>
                    </SheetClose>
                  ))}
                </div>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        )}

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          {settings?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logo_url} alt={businessName} className="h-9 w-auto" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand text-brand-foreground font-bold">
              AT
            </span>
          )}
          <span className="hidden text-base font-bold tracking-tight sm:block">{businessName}</span>
        </Link>

        {isAdminArea && (
          <span className="ml-2 hidden rounded-md bg-secondary px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:inline-block">
            Admin
          </span>
        )}

        {/* Desktop nav */}
        {!isAdminArea && (
        <nav className="hidden items-center gap-1 lg:flex">
          <Link
            href="/shop"
            className={cn("rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary", pathname === "/shop" && "text-brand")}
          >
            Shop
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary">
                Categories <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64">
              {parents.map((p) => (
                <div key={p.id}>
                  <DropdownMenuLabel>
                    <Link href={`/shop?category=${p.slug}`} className="hover:text-brand">{p.name}</Link>
                  </DropdownMenuLabel>
                  {childrenOf(p.id).map((c) => (
                    <DropdownMenuItem key={c.id} asChild>
                      <Link href={`/shop?category=${c.slug}`}>{c.name}</Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </div>
              ))}
              <DropdownMenuItem asChild>
                <Link href="/shop" className="font-medium text-brand">View all products →</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {NAV.slice(1).map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn("rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary", pathname === n.href && "text-brand")}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        )}

        {/* Search (desktop) */}
        {!isAdminArea && (
        <form onSubmit={onSearch} className="ml-auto hidden max-w-xs flex-1 md:flex">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products, SKU…"
              className="pl-9"
              aria-label="Search"
            />
          </div>
        </form>
        )}

        {/* Actions */}
        <div className="ml-auto flex items-center gap-0.5 md:ml-2">
          {!isAdminArea && (
          <Button variant="ghost" size="icon" asChild className="md:hidden" aria-label="Search">
            <Link href="/shop"><Search className="h-5 w-5" /></Link>
          </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Account"><User className="h-5 w-5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {email ? (
                <>
                  <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isAdmin && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="font-semibold text-brand">Admin Panel</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem asChild><Link href="/account">My Account</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/account/orders">My Orders</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/account/wishlist">Wishlist</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/account/addresses">Addresses</Link></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link href="/logout">Log out</Link></DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem asChild><Link href="/login">Log in</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/register">Create account</Link></DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {!isAdminArea && (
          <Button variant="ghost" size="icon" asChild aria-label="Wishlist">
            <Link href="/account/wishlist"><Heart className="h-5 w-5" /></Link>
          </Button>
          )}
          {!isAdminArea && (
          <Button variant="ghost" size="icon" asChild aria-label="Cart" className="relative">
            <Link href="/cart">
              <ShoppingCart className="h-5 w-5" />
              {mounted && count > 0 && (
                <Badge variant="brand" className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full px-1 text-[11px]">
                  {count}
                </Badge>
              )}
            </Link>
          </Button>
          )}
          {isAdminArea && (
            <Button variant="outline" size="sm" asChild className="ml-1">
              <Link href="/">View store</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
