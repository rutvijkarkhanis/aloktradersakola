import Link from "next/link";
import { redirect } from "next/navigation";
import { User, Package, MapPin, Heart, LogOut, LayoutDashboard } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/server";
import { AccountNav } from "@/components/account/account-nav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?redirect=/account");

  const items = [
    { href: "/account", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/account/orders", label: "My Orders", icon: "Package" },
    { href: "/account/addresses", label: "Addresses", icon: "MapPin" },
    { href: "/account/wishlist", label: "Wishlist", icon: "Heart" },
  ];

  return (
    <div className="container-wide py-8">
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-brand-foreground">
                <User className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{profile.full_name || "My account"}</p>
                <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
              </div>
            </div>
            <AccountNav items={items} isAdmin={profile.role === "admin"} />
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
