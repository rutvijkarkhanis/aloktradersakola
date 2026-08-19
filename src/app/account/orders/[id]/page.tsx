import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Circle, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ReorderButton } from "@/components/account/reorder-button";
import { formatINR, formatDateTime, cn } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_FLOW, PAYMENT_STATUS_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*, items:order_items(*), payments(*)")
    .eq("id", params.id)
    .maybeSingle();
  if (!order) notFound();

  const o = order as any;
  const addr = o.shipping_address ?? {};
  const cancelled = o.order_status === "CANCELLED";
  const currentIdx = ORDER_STATUS_FLOW.indexOf(o.order_status);

  // Fetch slugs + stock for reorder
  const productIds = (o.items ?? []).map((i: any) => i.product_id).filter(Boolean);
  const { data: prods } = productIds.length
    ? await supabase.from("products").select("id, slug, stock_quantity").in("id", productIds)
    : { data: [] as any[] };
  const bySlug = new Map((prods ?? []).map((p: any) => [p.id, p]));
  const reorderItems = (o.items ?? []).map((i: any) => ({
    ...i,
    slug: bySlug.get(i.product_id)?.slug ?? null,
    stock: bySlug.get(i.product_id)?.stock_quantity ?? 0,
  }));

  return (
    <div>
      <Link href="/account/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{o.order_number}</h1>
          <p className="text-sm text-muted-foreground">Placed {formatDateTime(o.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{PAYMENT_STATUS_LABELS[o.payment_status as keyof typeof PAYMENT_STATUS_LABELS]}</Badge>
          <Badge variant={cancelled ? "destructive" : "secondary"}>{ORDER_STATUS_LABELS[o.order_status as keyof typeof ORDER_STATUS_LABELS]}</Badge>
          <ReorderButton items={reorderItems} />
        </div>
      </div>

      {/* Status timeline */}
      {!cancelled && (
        <div className="mt-6 rounded-lg border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold">Order Status</h2>
          <ol className="flex flex-wrap gap-y-4">
            {ORDER_STATUS_FLOW.map((s, i) => {
              const done = i <= currentIdx;
              return (
                <li key={s} className="flex min-w-[110px] flex-1 flex-col items-center text-center">
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", done ? "bg-brand text-brand-foreground" : "bg-secondary text-muted-foreground")}>
                    {done ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
                  </span>
                  <span className={cn("mt-1 text-[11px]", done ? "font-medium text-foreground" : "text-muted-foreground")}>
                    {ORDER_STATUS_LABELS[s]}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-lg border bg-card">
            <h2 className="border-b p-4 text-sm font-semibold">Items</h2>
            <ul className="divide-y">
              {(o.items ?? []).map((it: any) => (
                <li key={it.id} className="flex gap-3 p-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-secondary">
                    {it.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.image_url} alt={it.product_name} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{it.product_name}</p>
                    <p className="text-xs text-muted-foreground">SKU: {it.sku} · Qty {it.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold">{formatINR(it.line_total)}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold">Delivery Address</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {addr.full_name}, {addr.mobile}<br />
              {addr.address_line}{addr.area ? `, ${addr.area}` : ""}<br />
              {addr.city}, {addr.state} — {addr.pincode}
              {addr.landmark ? <><br />Landmark: {addr.landmark}</> : null}
            </p>
            {o.customer_notes && <p className="mt-2 text-xs text-muted-foreground">Notes: {o.customer_notes}</p>}
          </div>
        </div>

        {/* Payment summary */}
        <div>
          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold">Payment Summary</h2>
            <Separator className="my-3" />
            <dl className="space-y-1.5 text-sm">
              <Row label="Subtotal" value={formatINR(o.subtotal)} />
              {o.discount > 0 && <Row label="Discount" value={`− ${formatINR(o.discount)}`} />}
              <Row label="Delivery" value={o.delivery_charge > 0 ? formatINR(o.delivery_charge) : "Free"} />
              {o.tax > 0 && <Row label="Tax" value={formatINR(o.tax)} />}
            </dl>
            <Separator className="my-3" />
            <Row label="Order Total" value={formatINR(o.total_amount)} bold />
            <div className="mt-3 rounded-md bg-accent/40 p-3 text-sm">
              <Row label="Paid" value={formatINR(o.advance_paid)} />
              {o.payment_type === "ADVANCE_50_COD_50" && (
                <Row label="Balance (COD)" value={formatINR(o.cod_amount)} />
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Payment: {o.payment_type === "FULL_PAYMENT" ? "Full payment online" : `${Math.round((o.advance_paid / o.total_amount) * 100) || 50}% advance + balance on delivery`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={cn(bold ? "font-bold" : "text-muted-foreground")}>{label}</span>
      <span className={cn(bold ? "font-bold" : "font-medium")}>{value}</span>
    </div>
  );
}
