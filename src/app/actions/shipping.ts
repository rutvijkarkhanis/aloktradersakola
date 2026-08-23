"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isBigshipConfigured, bookShipment, trackShipment, getDocumentUrl, cancelShipment,
  BigshipError, type BigshipProduct,
} from "@/lib/bigship";

async function assertAdmin() {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Unauthorized");
  return admin;
}

export async function bigshipEnabled(): Promise<boolean> {
  return isBigshipConfigured();
}

/** Delhivery public page for a waybill (Big Ship dispatches via Delhivery). */
function delhiveryUrl(awb: string) {
  return `https://www.delhivery.com/track/package/${encodeURIComponent(awb)}`;
}

/** Distribute a COD total across line items so per-product collectable sums to it. */
function distributeCod(codTotal: number, lineTotals: number[]): number[] {
  const subtotal = lineTotals.reduce((s, n) => s + n, 0);
  if (codTotal <= 0 || subtotal <= 0) return lineTotals.map(() => 0);
  const shares = lineTotals.map((lt) => Math.round((codTotal * lt) / subtotal));
  // Fix rounding drift on the last item.
  const drift = codTotal - shares.reduce((s, n) => s + n, 0);
  shares[shares.length - 1] += drift;
  return shares;
}

type BookInput = {
  weightKg: number;
  length?: number;
  breadth?: number;
  height?: number;
  courierId?: string;
  warehouseId?: string;
};

/**
 * Book a paid order with Big Ship (create -> rate -> place), then store the
 * AWB, Delhivery tracking link and shipping label, and advance to SHIPPED.
 */
export async function bookBigshipShipment(orderId: string, input: BookInput) {
  await assertAdmin();
  if (!isBigshipConfigured()) return { ok: false as const, error: "Big Ship API is not configured." };
  if (!input.weightKg || input.weightKg <= 0) return { ok: false as const, error: "Enter the parcel weight in kg." };

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, order_number, payment_type, cod_amount, subtotal, shipping_address, contact_mobile, contact_email, tracking_number")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false as const, error: "Order not found." };
  if (order.tracking_number) return { ok: false as const, error: "This order already has an AWB. Cancel it first to re-book." };

  const { data: items } = await admin
    .from("order_items")
    .select("product_name, quantity, unit_price, line_total, sku")
    .eq("order_id", orderId);
  if (!items || !items.length) return { ok: false as const, error: "Order has no items to ship." };

  const addr = (order.shipping_address ?? {}) as Record<string, string>;
  const missing = ["full_name", "address_line", "city", "state", "pincode"].filter((k) => !addr[k]);
  if (missing.length) return { ok: false as const, error: `Shipping address is missing: ${missing.join(", ")}.` };

  const isCod = order.payment_type === "ADVANCE_50_COD_50";
  const lineTotals = items.map((i) => Number(i.line_total));
  const invoiceAmount = lineTotals.reduce((s, n) => s + n, 0); // must equal sum of product totalAmount
  const codShares = distributeCod(isCod ? Number(order.cod_amount) : 0, lineTotals);

  const products: BigshipProduct[] = items.map((i, idx) => ({
    productName: i.product_name,
    hsn: undefined,
    qty: Number(i.quantity),
    amount: Number(i.unit_price),
    totalAmount: Number(i.line_total),
    collectableAmount: codShares[idx],
    categoryId: "1",
  }));

  try {
    const booking = await bookShipment(
      {
        orderNumber: order.order_number,
        paymentMode: isCod ? "COD" : "PREPAID",
        invoiceAmount,
        consignee: {
          name: addr.full_name,
          mobile: addr.mobile || order.contact_mobile || "",
          email: addr.email || order.contact_email || null,
          address: addr.address_line,
          address2: addr.area || null,
          landmark: addr.landmark || null,
          city: addr.city,
          state: addr.state,
          pincode: addr.pincode,
        },
        box: { length: input.length, breadth: input.breadth, height: input.height, weightKg: input.weightKg },
        products,
        warehouseId: input.warehouseId,
      },
      input.courierId,
    );

    const labelUrl = await getDocumentUrl(booking.customGlobalOrderId, "label");
    await admin
      .from("orders")
      .update({
        bigship_order_id: booking.customGlobalOrderId,
        tracking_number: booking.awb,
        courier: booking.courierName ? `Big Ship (${booking.courierName})` : "Big Ship (Delhivery)",
        tracking_url: delhiveryUrl(booking.awb),
        shipping_label_url: labelUrl,
        tracking_status: "Manifested",
        tracking_synced_at: new Date().toISOString(),
        order_status: "SHIPPED",
      })
      .eq("id", orderId);

    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true as const, awb: booking.awb, courier: booking.courierName, labelUrl };
  } catch (e) {
    const msg = e instanceof BigshipError ? e.message : "Big Ship booking failed. Please try again.";
    return { ok: false as const, error: msg };
  }
}

type OrderStatus = "SHIPPED" | "OUT_FOR_DELIVERY" | "DELIVERED";

/** Map a Big Ship status string to our order_status, when it clearly advances. */
function mapOrderStatus(bigshipStatus: string): OrderStatus | null {
  const s = bigshipStatus.toLowerCase();
  if (s.includes("delivered") && !s.includes("undelivered")) return "DELIVERED";
  if (s.includes("out for delivery")) return "OUT_FOR_DELIVERY";
  if (s.includes("transit") || s.includes("shipped") || s.includes("pickup")) return "SHIPPED";
  return null;
}

/** Pull live status from Big Ship onto the order. */
export async function refreshBigshipTracking(orderId: string) {
  await assertAdmin();
  if (!isBigshipConfigured()) return { ok: false as const, error: "Big Ship API is not configured." };
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("bigship_order_id, order_status").eq("id", orderId).maybeSingle();
  if (!order?.bigship_order_id) return { ok: false as const, error: "This order was not booked through Big Ship." };

  try {
    const t = await trackShipment(order.bigship_order_id);
    const patch: { tracking_status: string; tracking_synced_at: string; order_status?: OrderStatus } = {
      tracking_status: t.status || "Unknown",
      tracking_synced_at: new Date().toISOString(),
    };
    const mapped = t.status ? mapOrderStatus(t.status) : null;
    // Only advance status forward — never regress a delivered/cancelled order.
    if (mapped && !["DELIVERED", "CANCELLED", "REFUNDED"].includes(order.order_status)) patch.order_status = mapped;
    await admin.from("orders").update(patch).eq("id", orderId);
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true as const, status: t.status, history: t.history };
  } catch (e) {
    const msg = e instanceof BigshipError ? e.message : "Could not fetch tracking.";
    return { ok: false as const, error: msg };
  }
}

/** Cancel a Big Ship shipment and clear the AWB so it can be re-booked. */
export async function cancelBigshipShipment(orderId: string) {
  await assertAdmin();
  if (!isBigshipConfigured()) return { ok: false as const, error: "Big Ship API is not configured." };
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("bigship_order_id").eq("id", orderId).maybeSingle();
  if (!order?.bigship_order_id) return { ok: false as const, error: "This order was not booked through Big Ship." };

  try {
    await cancelShipment(order.bigship_order_id);
    await admin
      .from("orders")
      .update({
        tracking_number: null, tracking_url: null, shipping_label_url: null,
        tracking_status: "Cancelled", tracking_synced_at: new Date().toISOString(),
        order_status: "PROCESSING",
      })
      .eq("id", orderId);
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof BigshipError ? e.message : "Could not cancel the shipment.";
    return { ok: false as const, error: msg };
  }
}
