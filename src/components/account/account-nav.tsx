"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, MapPin, Heart, LogOut, LayoutDashboard, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, any> = { LayoutDashboard, Package, MapPin, Heart };

export function AccountNav({
  items,
  isAdmin,
}: {
  items: { href: string; label: string; icon: string }[];
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  return (
    <nav className="mt-4 flex flex-col gap-1">
      {items.map((it) => {
        const Icon = ICONS[it.icon] ?? Package;
        const active = pathname === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-brand text-brand-foreground" : "hover:bg-secondary",
            )}
          >
            <Icon className="h-4 w-4" /> {it.label}
          </Link>
        );
      })}
      {isAdmin && (
        <Link href="/admin" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary">
          <Shield className="h-4 w-4" /> Admin Dashboard
        </Link>
      )}
      <Link href="/logout" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10">
        <LogOut className="h-4 w-4" /> Log out
      </Link>
    </nav>
  );
}
