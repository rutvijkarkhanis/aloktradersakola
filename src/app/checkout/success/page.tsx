import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { order?: string; id?: string; pending?: string };
}) {
  const orderNumber = searchParams.order ?? "";
  const pending = searchParams.pending === "1";

  let order: any = null;
  if (searchParams.id) {
    const supabase = createClient();
    const { data } = await supabase.from("orders").select("*").eq("id", searchParams.id).maybeSingle();
    order = data;
  }

  return (
    <div className="container-wide flex flex-col items-center py-16 text-center">
      {pending ? (
        <Clock className="h-14 w-14 text-warning" />
      ) : (
        <CheckCircle2 className="h-14 w-14 text-success" />
      )}
      <h1 className="mt-4 text-2xl font-bold">
        {pending ? "Order received — payment confirming" : "Thank you! Your order is confirmed"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        Order number <span className="font-semibold text-foreground">{orderNumber}</span>
        {pending && " — we'll confirm your payment shortly via our payment gateway."}
      </p>

      {order && (
        <div className="mt-6 w-full max-w-md rounded-lg border bg-card p-5 text-left text-sm">
          <div className="flex justify-between py-1"><span className="text-muted-foreground">Order total</span><span className="font-semibold">{formatINR(order.total_amount)}</span></div>
          <div className="flex justify-between py-1"><span className="text-muted-foreground">Paid now</span><span className="font-semibold text-brand">{formatINR(order.advance_paid)}</span></div>
          {order.payment_type === "ADVANCE_50_COD_50" && (
            <div className="flex justify-between py-1"><span className="text-muted-foreground">Balance (COD)</span><span className="font-semibold">{formatINR(order.cod_amount)}</span></div>
          )}
        </div>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild variant="brand">
          {searchParams.id ? <Link href={`/account/orders/${searchParams.id}`}>View Order</Link> : <Link href="/account/orders">My Orders</Link>}
        </Button>
        <Button asChild variant="outline"><Link href="/shop">Continue Shopping</Link></Button>
      </div>
    </div>
  );
}
