import Link from "next/link";
import { Package, MapPin, Heart, ArrowRight } from "lucide-react";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/account/profile-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR, formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const profile = await getCurrentProfile();
  const supabase = createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, total_amount, order_status, created_at")
    .order("created_at", { ascending: false })
    .limit(3);
  const { count: wishlistCount } = await supabase
    .from("wishlist_items").select("id", { count: "exact", head: true });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard href="/account/orders" icon={<Package className="h-5 w-5" />} label="Orders" value={String(orders?.length ?? 0)} />
        <StatCard href="/account/wishlist" icon={<Heart className="h-5 w-5" />} label="Wishlist" value={String(wishlistCount ?? 0)} />
        <StatCard href="/account/addresses" icon={<MapPin className="h-5 w-5" />} label="Addresses" value="Manage" />
      </div>

      <section className="rounded-lg border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Recent Orders</h2>
          <Button asChild variant="link" size="sm"><Link href="/account/orders">View all <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
        {orders && orders.length > 0 ? (
          <ul className="divide-y">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-3">
                <div>
                  <Link href={`/account/orders/${o.id}`} className="text-sm font-semibold hover:text-brand">{o.order_number}</Link>
                  <p className="text-xs text-muted-foreground">{formatDate(o.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatINR(o.total_amount)}</p>
                  <Badge variant="secondary">{ORDER_STATUS_LABELS[o.order_status]}</Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No orders yet. <Link href="/shop" className="text-brand underline">Start shopping</Link>.</p>
        )}
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-4 font-semibold">Profile</h2>
        {profile && <ProfileForm profile={profile} />}
      </section>
    </div>
  );
}

function StatCard({ href, icon, label, value }: { href: string; icon: React.ReactNode; label: string; value: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-brand">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">{icon}</span>
      <div>
        <p className="text-lg font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </Link>
  );
}
