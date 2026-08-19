import Link from "next/link";
import { Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINR, formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const supabase = createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*, items:order_items(id)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold">My Orders</h1>
      {!orders || orders.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-lg border border-dashed py-16 text-center">
          <Package className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">You haven&apos;t placed any orders yet.</p>
          <Button asChild className="mt-4" variant="brand"><Link href="/shop">Shop now</Link></Button>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((o: any) => (
            <li key={o.id}>
              <Link href={`/account/orders/${o.id}`} className="block rounded-lg border bg-card p-4 transition-colors hover:border-brand">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{o.order_number}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(o.created_at)} · {o.items?.length ?? 0} item(s)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{PAYMENT_STATUS_LABELS[o.payment_status as keyof typeof PAYMENT_STATUS_LABELS]}</Badge>
                    <Badge variant="secondary">{ORDER_STATUS_LABELS[o.order_status as keyof typeof ORDER_STATUS_LABELS]}</Badge>
                    <span className="text-sm font-bold">{formatINR(o.total_amount)}</span>
                  </div>
                </div>
                {o.payment_type === "ADVANCE_50_COD_50" && o.cod_amount > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Paid {formatINR(o.advance_paid)} · Balance on delivery {formatINR(o.cod_amount)}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
