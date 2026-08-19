import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { OrderStatusControl } from "@/components/admin/order-status-control";
import { formatINR, formatDateTime } from "@/lib/utils";
import { PAYMENT_STATUS_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*, items:order_items(*), payments(*)")
    .eq("id", params.id)
    .maybeSingle();
  if (!order) notFound();
  const o = order as any;
  const addr = o.shipping_address ?? {};
  const isCod = o.payment_type === "ADVANCE_50_COD_50";

  return (
    <div>
      <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{o.order_number}</h1>
        <Badge variant="outline">{PAYMENT_STATUS_LABELS[o.payment_status as keyof typeof PAYMENT_STATUS_LABELS]}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">{formatDateTime(o.created_at)}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg border bg-card">
            <h2 className="border-b p-4 text-sm font-semibold">Items</h2>
            <ul className="divide-y">
              {(o.items ?? []).map((it: any) => (
                <li key={it.id} className="flex items-center gap-3 p-4">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded border bg-secondary">
                    {it.image_url ? <img src={it.image_url} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="flex-1"><p className="text-sm font-medium">{it.product_name}</p><p className="text-xs text-muted-foreground">{it.sku} · Qty {it.quantity} · {formatINR(it.unit_price)}</p></div>
                  <p className="text-sm font-semibold">{formatINR(it.line_total)}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold">Customer & Delivery</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {addr.full_name}, {o.contact_mobile}{o.contact_email ? ` · ${o.contact_email}` : ""}<br />
              {addr.address_line}{addr.area ? `, ${addr.area}` : ""}<br />
              {addr.city}, {addr.state} — {addr.pincode}{addr.landmark ? ` (${addr.landmark})` : ""}
            </p>
            {o.customer_notes && <p className="mt-2 text-xs text-muted-foreground">Notes: {o.customer_notes}</p>}
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold">Payments</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {(o.payments ?? []).map((p: any) => (
                <li key={p.id} className="flex justify-between">
                  <span className="text-muted-foreground">{p.payment_type} · {p.status}{p.transaction_id ? ` · ${p.transaction_id}` : ""}</span>
                  <span className="font-medium">{formatINR(p.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Manage</h2>
            <OrderStatusControl orderId={o.id} current={o.order_status} currentCod={o.cod_status} isCod={isCod} />
          </div>
          <div className="rounded-lg border bg-card p-4 text-sm">
            <h2 className="mb-2 font-semibold">Summary</h2>
            <Row label="Subtotal" value={formatINR(o.subtotal)} />
            {o.discount > 0 && <Row label="Discount" value={`− ${formatINR(o.discount)}`} />}
            <Row label="Delivery" value={o.delivery_charge > 0 ? formatINR(o.delivery_charge) : "Free"} />
            {o.tax > 0 && <Row label="Tax" value={formatINR(o.tax)} />}
            <Separator className="my-2" />
            <Row label="Total" value={formatINR(o.total_amount)} bold />
            <Row label="Paid" value={formatINR(o.advance_paid)} />
            {isCod && <Row label="COD balance" value={formatINR(o.cod_amount)} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return <div className="flex justify-between py-0.5"><span className={bold ? "font-bold" : "text-muted-foreground"}>{label}</span><span className={bold ? "font-bold" : "font-medium"}>{value}</span></div>;
}
