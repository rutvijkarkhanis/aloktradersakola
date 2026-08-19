"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Wrench, Upload, Settings, Ticket, Home, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/products/import", label: "Import Catalogue", icon: Upload },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/fabrication", label: "Fabrication Enquiries", icon: Wrench },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((n) => {
        const active = pathname === n.href || (n.href !== "/admin" && pathname.startsWith(n.href));
        return (
          <Link
            key={n.href}
            href={n.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-brand text-brand-foreground" : "hover:bg-secondary",
            )}
          >
            <n.icon className="h-4 w-4" /> {n.label}
          </Link>
        );
      })}
      <Link href="/" className="mt-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary">
        <Home className="h-4 w-4" /> View Store
      </Link>
    </nav>
  );
}
