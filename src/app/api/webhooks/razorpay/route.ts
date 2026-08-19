import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { finalizePaidOrder } from "@/app/actions/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Razorpay webhook — idempotent. Handles success/failure and the
 * "payment succeeded but browser closed" case. Each event is recorded in
 * webhook_events so duplicate deliveries are ignored.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const eventId = req.headers.get("x-razorpay-event-id") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const admin = createAdminClient();
  const dedupeId = eventId || `${event?.event}:${event?.payload?.payment?.entity?.id ?? Date.now()}`;

  // Idempotency guard — insert first; unique violation => already processed.
  const { error: insertErr } = await admin
    .from("webhook_events")
    .insert({ event_id: dedupeId, type: event?.event ?? "unknown", payload: event });
  if (insertErr) {
    // Duplicate delivery — acknowledge without reprocessing.
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const type: string = event?.event ?? "";
  const paymentEntity = event?.payload?.payment?.entity;

  try {
    if (type === "payment.captured" || type === "order.paid") {
      const gatewayOrderId = paymentEntity?.order_id;
      const txnId = paymentEntity?.id;
      const internalOrderId = paymentEntity?.notes?.order_id;
      if (internalOrderId && gatewayOrderId && txnId) {
        await finalizePaidOrder(internalOrderId, gatewayOrderId, txnId);
      } else if (gatewayOrderId) {
        const { data: pay } = await admin
          .from("payments").select("order_id").eq("gateway_order_id", gatewayOrderId).maybeSingle();
        if (pay?.order_id) await finalizePaidOrder(pay.order_id, gatewayOrderId, txnId ?? gatewayOrderId);
      }
    } else if (type === "payment.failed") {
      const gatewayOrderId = paymentEntity?.order_id;
      if (gatewayOrderId) {
        await admin.from("payments").update({ status: "FAILED", raw_payload: paymentEntity })
          .eq("gateway_order_id", gatewayOrderId);
      }
    }
  } catch (e) {
    // Log & return 500 so Razorpay retries.
    console.error("razorpay webhook processing error", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
