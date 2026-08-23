"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isBigshipConfigured, trackShipment as trackBigship } from "@/lib/bigship";
import { isFshipConfigured, trackShipment as trackFship } from "@/lib/fship";
import { ORDER_STATUS_LABELS } from "@/lib/constants";

export type TrackingResult =
  | {
      ok: true;
      orderNumber: string;
      orderStatus: string;
      courier: string | null;
      awb: string | null;
      trackingUrl: string | null;
      live: { status: string; history: { status: string; message?: string; at?: string }[] } | null;
    }
  | { ok: false; error: string };

const onlyDigits = (s: string) => (s || "").replace(/[^0-9]/g, "");

type OrderRow = {
  id: string;
  order_number: string;
  order_status: string;
  courier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  bigship_order_id: string | null;
  shipping_provider: string | null;
};

/** Shared: build the result for an order row, pulling live aggregator status if booked. */
async function buildResult(o: OrderRow): Promise<TrackingResult> {
  let liveData: { status: string; history: { status: string; message?: string; at?: string }[] } | null = null;

  // Route to whichever aggregator booked the order (Big Ship rows may predate
  // shipping_provider, so fall back to the presence of bigship_order_id).
  const provider =
    o.shipping_provider === "fship" ? "fship" :
    o.shipping_provider === "bigship" || o.bigship_order_id ? "bigship" : null;

  try {
    if (provider === "fship" && o.tracking_number && isFshipConfigured()) {
      const t = await trackFship(o.tracking_number);
      liveData = { status: t.status, history: t.history };
    } else if (provider === "bigship" && o.bigship_order_id && isBigshipConfigured()) {
      const t = await trackBigship(o.bigship_order_id);
      liveData = { status: t.status, history: t.history };
    }
    if (liveData) {
      // Best-effort: persist latest status so admin views stay fresh too.
      const admin = createAdminClient();
      await admin
        .from("orders")
        .update({ tracking_status: liveData.status || "Unknown", tracking_synced_at: new Date().toISOString() })
        .eq("id", o.id);
    }
  } catch {
    liveData = null; // live fetch failed — fall back to stored info
  }

  return {
    ok: true,
    orderNumber: o.order_number,
    orderStatus: ORDER_STATUS_LABELS[o.order_status as keyof typeof ORDER_STATUS_LABELS] ?? o.order_status,
    courier: o.courier,
    awb: o.tracking_number,
    trackingUrl: o.tracking_url,
    live: liveData,
  };
}

const SELECT = "id, order_number, order_status, courier, tracking_number, tracking_url, bigship_order_id, shipping_provider";

/** Public: track by order number + the phone or email used on the order. */
export async function trackByOrder(input: { orderNumber: string; contact: string }): Promise<TrackingResult> {
  const orderNumber = (input.orderNumber || "").trim();
  const contact = (input.contact || "").trim();
  if (!orderNumber || !contact) return { ok: false, error: "Enter your order number and the phone or email on the order." };

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(`${SELECT}, contact_mobile, contact_email`)
    .ilike("order_number", orderNumber)
    .maybeSingle();
  if (!order) return { ok: false, error: "No order found with that number." };

  const o = order as unknown as OrderRow & { contact_mobile: string | null; contact_email: string | null };
  const contactDigits = onlyDigits(contact);
  const mobileMatch =
    contactDigits.length >= 10 && o.contact_mobile && onlyDigits(o.contact_mobile).endsWith(contactDigits.slice(-10));
  const emailMatch =
    contact.includes("@") && o.contact_email && o.contact_email.toLowerCase() === contact.toLowerCase();
  if (!mobileMatch && !emailMatch) {
    return { ok: false, error: "Those details don't match this order. Check the phone/email you used at checkout." };
  }
  return buildResult(o);
}

/** Logged-in: live tracking for an order the current user owns. */
export async function trackOwnedOrder(orderId: string): Promise<TrackingResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in to track this order." };

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(`${SELECT}, customer_id`)
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };
  const o = order as unknown as OrderRow & { customer_id: string | null };
  if (o.customer_id !== user.id) return { ok: false, error: "You can only track your own orders." };
  return buildResult(o);
}
