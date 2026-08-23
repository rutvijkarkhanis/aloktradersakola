"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isBigshipConfigured, bookShipment as bookBigship, trackShipment as trackBigship,
  getDocumentUrl, cancelShipment as cancelBigship, BigshipError, type BigshipProduct,
} from "@/lib/bigship";
import {
  isFshipConfigured, bookShipment as bookFship, trackShipment as trackFship,
  cancelShipment as cancelFship, FshipError, type FshipProduct,
} from "@/lib/fship";

export type ShippingProvider = "bigship" | "fship";

async function assertAdmin() {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Unauthorized");
  return admin;
}

/** Which aggregators are configured, so the UI only offers the ones that work. */
export async function shippingProviders(): Promise<{ bigship: boolean; fship: boolean }> {
  return { bigship: isBigshipConfigured(), fship: isFshipConfigured() };
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
  const drift = codTotal - shares.reduce((s, n) => s + n, 0);
  shares[shares.length - 1] += drift;
  return shares;
}

type OrderStatus = "SHIPPED" | "OUT_FOR_DELIVERY" | "DELIVERED";

/** Map an aggregator status string to our order_status, when it clearly advances. */
function mapOrderStatus(status: string): OrderStatus | null {
  const s = status.toLowerCase();
  if (s.includes("delivered") && !s.includes("undelivered")) return "DELIVERED";
  if (s.includes("out for delivery") || s.includes("dispatched")) return "OUT_FOR_DELIVERY";
  if (s.includes("transit") || s.includes("shipped") || s.includes("pickup") || s.includes("manifest")) return "SHIPPED";
  return null;
}

/** The order + shipment fields shared by both aggregators. */
type Prepared = {
  order: {
    id: string; order_number: string; payment_type: string; cod_amount: number;
    contact_mobile: string | null; contact_email: string | null; tax: number;
  };
  isCod: boolean;
  invoiceAmount: number;
  codTotal: number;
  codShares: number[];
  consignee: {
    name: string; mobile: string; email: string | null; address: string;
    address2: string | null; landmark: string | null; city: string; state: string; pincode: string;
  };
  items: { product_name: string; quantity: number; unit_price: number; line_total: number; sku: string | null }[];
};

/** Load + validate an order for shipping. Returns a common draft or an error message. */
async function prepareShipment(orderId: string): Promise<{ ok: true; data: Prepared } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, order_number, payment_type, cod_amount, tax, subtotal, shipping_address, contact_mobile, contact_email, tracking_number")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };
  if (order.tracking_number) return { ok: false, error: "This order already has an AWB. Cancel it first to re-book." };

  const { data: items } = await admin
    .from("order_items")
    .select("product_name, quantity, unit_price, line_total, sku")
    .eq("order_id", orderId);
  if (!items || !items.length) return { ok: false, error: "Order has no items to ship." };

  const addr = (order.shipping_address ?? {}) as Record<string, string>;
  const missing = ["full_name", "address_line", "city", "state", "pincode"].filter((k) => !addr[k]);
  if (missing.length) return { ok: false, error: `Shipping address is missing: ${missing.join(", ")}.` };

  const isCod = order.payment_type === "ADVANCE_50_COD_50";
  const lineTotals = items.map((i) => Number(i.line_total));
  const invoiceAmount = lineTotals.reduce((s, n) => s + n, 0);
  const codTotal = isCod ? Number(order.cod_amount) : 0;

  return {
    ok: true,
    data: {
      order: {
        id: order.id, order_number: order.order_number, payment_type: order.payment_type,
        cod_amount: Number(order.cod_amount), contact_mobile: order.contact_mobile,
        contact_email: order.contact_email, tax: Number(order.tax) || 0,
      },
      isCod,
      invoiceAmount,
      codTotal,
      codShares: distributeCod(codTotal, lineTotals),
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
      items,
    },
  };
}

type BookInput = {
  provider: ShippingProvider;
  weightKg: number;
  length?: number;
  breadth?: number;
  height?: number;
  courierId?: string;
  warehouseId?: string;
};

/**
 * Book a paid order with the chosen aggregator, then store the AWB, courier,
 * tracking link and label, record which provider handled it, and advance to SHIPPED.
 */
export async function bookShipment(orderId: string, input: BookInput) {
  await assertAdmin();
  if (input.provider === "bigship" && !isBigshipConfigured()) return { ok: false as const, error: "Big Ship API is not configured." };
  if (input.provider === "fship" && !isFshipConfigured()) return { ok: false as const, error: "FShip API is not configured." };
  if (!input.weightKg || input.weightKg <= 0) return { ok: false as const, error: "Enter the parcel weight in kg." };

  const prep = await prepareShipment(orderId);
  if (!prep.ok) return { ok: false as const, error: prep.error };
  const { consignee, items, isCod, invoiceAmount, codShares, codTotal, order } = prep.data;
  const box = { length: input.length, breadth: input.breadth, height: input.height, weightKg: input.weightKg };
  const admin = createAdminClient();

  try {
    if (input.provider === "fship") {
      const products: FshipProduct[] = items.map((i) => ({
        productName: i.product_name, qty: Number(i.quantity), amount: Number(i.unit_price), sku: i.sku || undefined,
      }));
      const booking = await bookFship({
        orderNumber: order.order_number,
        paymentMode: isCod ? "COD" : "PREPAID",
        invoiceAmount,
        taxAmount: order.tax,
        codAmount: codTotal,
        consignee,
        box,
        products,
        warehouseId: input.warehouseId,
      });
      await admin.from("orders").update({
        shipping_provider: "fship",
        fship_order_id: booking.apiOrderId,
        bigship_order_id: null,
        tracking_number: booking.waybill,
        courier: booking.courierName ? `FShip (${booking.courierName})` : "FShip",
        tracking_url: null, // underlying courier varies; live status shown in-app
        shipping_label_url: booking.labelUrl ?? null,
        tracking_status: "Manifested",
        tracking_synced_at: new Date().toISOString(),
        order_status: "SHIPPED",
      }).eq("id", orderId);
      revalidatePath(`/admin/orders/${orderId}`);
      return { ok: true as const, awb: booking.waybill, courier: booking.courierName, labelUrl: booking.labelUrl };
    }

    // Big Ship
    const products: BigshipProduct[] = items.map((i, idx) => ({
      productName: i.product_name,
      hsn: undefined,
      qty: Number(i.quantity),
      amount: Number(i.unit_price),
      totalAmount: Number(i.line_total),
      collectableAmount: codShares[idx],
      categoryId: "1",
    }));
    const booking = await bookBigship(
      {
        orderNumber: order.order_number,
        paymentMode: isCod ? "COD" : "PREPAID",
        invoiceAmount,
        consignee,
        box,
        products,
        warehouseId: input.warehouseId,
      },
      input.courierId,
    );
    const labelUrl = await getDocumentUrl(booking.customGlobalOrderId, "label");
    await admin.from("orders").update({
      shipping_provider: "bigship",
      bigship_order_id: booking.customGlobalOrderId,
      fship_order_id: null,
      tracking_number: booking.awb,
      courier: booking.courierName ? `Big Ship (${booking.courierName})` : "Big Ship (Delhivery)",
      tracking_url: delhiveryUrl(booking.awb),
      shipping_label_url: labelUrl,
      tracking_status: "Manifested",
      tracking_synced_at: new Date().toISOString(),
      order_status: "SHIPPED",
    }).eq("id", orderId);
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true as const, awb: booking.awb, courier: booking.courierName, labelUrl };
  } catch (e) {
    const msg = e instanceof BigshipError || e instanceof FshipError ? e.message : "Shipment booking failed. Please try again.";
    return { ok: false as const, error: msg };
  }
}

/** Resolve which aggregator an order was booked with (back-compat for pre-provider rows). */
function providerOf(row: { shipping_provider: string | null; bigship_order_id: string | null; tracking_number: string | null }): ShippingProvider | null {
  if (row.shipping_provider === "bigship" || row.shipping_provider === "fship") return row.shipping_provider;
  if (row.bigship_order_id) return "bigship";
  return null;
}

/** Pull live status from the order's aggregator onto the order. */
export async function refreshTracking(orderId: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("shipping_provider, bigship_order_id, tracking_number, order_status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false as const, error: "Order not found." };
  const provider = providerOf(order);
  if (!provider) return { ok: false as const, error: "This order was not booked through an aggregator." };

  try {
    const t = provider === "fship"
      ? await trackFship(order.tracking_number as string)
      : await trackBigship(order.bigship_order_id as string);

    const patch: { tracking_status: string; tracking_synced_at: string; order_status?: OrderStatus; courier?: string } = {
      tracking_status: t.status || "Unknown",
      tracking_synced_at: new Date().toISOString(),
    };
    // FShip only reveals the underlying courier once tracking starts — capture it.
    if (provider === "fship" && t.courierName) patch.courier = `FShip (${t.courierName})`;
    const mapped = t.status ? mapOrderStatus(t.status) : null;
    if (mapped && !["DELIVERED", "CANCELLED", "REFUNDED"].includes(order.order_status)) patch.order_status = mapped;

    await admin.from("orders").update(patch).eq("id", orderId);
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true as const, status: t.status, history: t.history };
  } catch (e) {
    const msg = e instanceof BigshipError || e instanceof FshipError ? e.message : "Could not fetch tracking.";
    return { ok: false as const, error: msg };
  }
}

/** Cancel the order's shipment (via its aggregator) and clear the AWB so it can be re-booked. */
export async function cancelShipment(orderId: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("shipping_provider, bigship_order_id, tracking_number")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false as const, error: "Order not found." };
  const provider = providerOf(order);
  if (!provider) return { ok: false as const, error: "This order was not booked through an aggregator." };

  try {
    if (provider === "fship") await cancelFship(order.tracking_number as string);
    else await cancelBigship(order.bigship_order_id as string);

    await admin.from("orders").update({
      tracking_number: null, tracking_url: null, shipping_label_url: null,
      bigship_order_id: null, fship_order_id: null, shipping_provider: null,
      tracking_status: "Cancelled", tracking_synced_at: new Date().toISOString(),
      order_status: "PROCESSING",
    }).eq("id", orderId);
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof BigshipError || e instanceof FshipError ? e.message : "Could not cancel the shipment.";
    return { ok: false as const, error: msg };
  }
}
