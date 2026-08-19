import Link from "next/link";
import {
  IndianRupee, ShoppingCart, Clock, Wallet, Truck, Wrench, PackageCheck,
  Users, Package, AlertTriangle, CheckCircle2, Hammer,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatINR, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = createClient();

  const [ordersRes, productsRes, lowStockRes, customersRes, cfrRes, recentRes] = await Promise.all([
    supabase.from("orders").select("total_amount, payment_status, order_status, advance_paid, cod_amount, cod_status"),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id, name, stock_quantity, low_stock_threshold").eq("is_quote_only", false).gt("stock_quantity", 0),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
    supabase.from("custom_fabrication_requests").select("status"),
    supabase.from("orders").select("id, order_number, total_amount, order_status, created_at").order("created_at", { ascending: false }).limit(6),
  ]);

  const orders = ordersRes.data ?? [];
  const paid = orders.filter((o) => o.payment_status === "PAID" || o.payment_status === "PARTIALLY_PAID");
  const totalSales = paid.reduce((s, o) => s + Number(o.total_amount), 0);
  const advanceCollected = orders.reduce((s, o) => s + Number(o.advance_paid), 0);
  const codPending = orders
    .filter((o) => o.cod_status === "COD_PENDING")
    .reduce((s, o) => s + Number(o.cod_amount), 0);
  const pendingPayments = orders.filter((o) => o.payment_status === "PENDING").length;
  const inFabrication = orders.filter((o) => o.order_status === "FABRICATION").length;
  const ready = orders.filter((o) => o.order_status === "READY").length;
  const delivered = orders.filter((o) => o.order_status === "DELIVERED").length;
  const lowStock = (lowStockRes.data ?? []).filter((p) => p.stock_quantity <= p.low_stock_threshold);
  const newEnquiries = (cfrRes.data ?? []).filter((c) => c.status === "NEW").length;

  const stats = [
    { icon: IndianRupee, label: "Total Sales", value: formatINR(totalSales), href: "/admin/orders" },
    { icon: ShoppingCart, label: "Orders", value: String(orders.length), href: "/admin/orders" },
    { icon: Clock, label: "Pending Payments", value: String(pendingPayments), href: "/admin/orders?status=PENDING_PAYMENT" },
    { icon: Wallet, label: "Advance Collected", value: formatINR(advanceCollected), href: "/admin/orders" },
    { icon: Truck, label: "COD Pending", value: formatINR(codPending), href: "/admin/orders" },
    { icon: Hammer, label: "In Fabrication", value: String(inFabrication), href: "/admin/orders?status=FABRICATION" },
    { icon: PackageCheck, label: "Ready", value: String(ready), href: "/admin/orders?status=READY" },
    { icon: CheckCircle2, label: "Delivered", value: String(delivered), href: "/admin/orders?status=DELIVERED" },
    { icon: Users, label: "Customers", value: String(customersRes.count ?? 0), href: "/admin/customers" },
    { icon: Package, label: "Products", value: String(productsRes.count ?? 0), href: "/admin/products" },
    { icon: AlertTriangle, label: "Low Stock", value: String(lowStock.length), href: "/admin/products?filter=low" },
    { icon: Wrench, label: "New Enquiries", value: String(newEnquiries), href: "/admin/fabrication" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-lg border bg-card p-4 transition-colors hover:border-brand">
            <s.icon className="h-5 w-5 text-brand" />
            <p className="mt-2 text-xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-3 font-semibold">Recent Orders</h2>
        {recentRes.data && recentRes.data.length > 0 ? (
          <ul className="divide-y">
            {recentRes.data.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-3">
                <div>
                  <Link href={`/admin/orders/${o.id}`} className="text-sm font-semibold hover:text-brand">{o.order_number}</Link>
                  <p className="text-xs text-muted-foreground">{formatDate(o.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{ORDER_STATUS_LABELS[o.order_status as keyof typeof ORDER_STATUS_LABELS]}</Badge>
                  <span className="text-sm font-bold">{formatINR(o.total_amount)}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        )}
      </section>

      {lowStock.length > 0 && (
        <section className="rounded-lg border border-warning/40 bg-warning/5 p-5">
          <h2 className="mb-2 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-warning" /> Low Stock Alerts</h2>
          <ul className="text-sm">
            {lowStock.slice(0, 8).map((p) => (
              <li key={p.id} className="flex justify-between py-1">
                <span>{p.name}</span><span className="font-medium">{p.stock_quantity} left</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
