import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, ORDER_STATUSES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = createClient();
  let query = supabase.from("orders").select("*").order("created_at", { ascending: false });
  if (searchParams.status && (ORDER_STATUSES as readonly string[]).includes(searchParams.status)) {
    query = query.eq("order_status", searchParams.status as any);
  }
  const { data: orders } = await query;

  return (
    <div>
      <h1 className="text-2xl font-bold">Orders</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/admin/orders" className={`rounded-full border px-3 py-1 text-xs ${!searchParams.status ? "bg-brand text-brand-foreground" : ""}`}>All</Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={`/admin/orders?status=${s}`} className={`rounded-full border px-3 py-1 text-xs ${searchParams.status === s ? "bg-brand text-brand-foreground" : ""}`}>
            {ORDER_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      <div className="mt-5 rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(orders ?? []).map((o: any) => (
              <TableRow key={o.id}>
                <TableCell><Link href={`/admin/orders/${o.id}`} className="text-sm font-semibold hover:text-brand">{o.order_number}</Link></TableCell>
                <TableCell className="text-sm">{o.contact_mobile ?? "—"}</TableCell>
                <TableCell className="text-sm font-medium">{formatINR(o.total_amount)}</TableCell>
                <TableCell><Badge variant="outline">{PAYMENT_STATUS_LABELS[o.payment_status as keyof typeof PAYMENT_STATUS_LABELS]}</Badge></TableCell>
                <TableCell><Badge variant="secondary">{ORDER_STATUS_LABELS[o.order_status as keyof typeof ORDER_STATUS_LABELS]}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(o.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {(!orders || orders.length === 0) && <div className="p-10 text-center text-sm text-muted-foreground">No orders.</div>}
      </div>
    </div>
  );
}
