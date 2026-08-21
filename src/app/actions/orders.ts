"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteSettings } from "@/lib/settings";
import { computeTotals, couponDiscount, type PricedLine } from "@/lib/pricing";
import {
  isRazorpayConfigured, createRazorpayOrder, verifyPaymentSignature, toPaise, RZP_PUBLIC_KEY_ID,
} from "@/lib/razorpay";
import { sendOrderConfirmation, sendAdminNewOrder } from "@/lib/email";
import type { Coupon } from "@/lib/types/database";

const addressSchema = z.object({
  full_name: z.string().min(2),
  mobile: z.string().min(8).max(15),
  email: z.string().email().optional().or(z.literal("")),
  address_line: z.string().min(4),
  area: z.string().optional().or(z.literal("")),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().min(4).max(10),
  landmark: z.string().optional().or(z.literal("")),
});

const createOrderSchema = z.object({
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.coerce.number().int().min(1) })).min(1),
  paymentType: z.enum(["FULL_PAYMENT", "ADVANCE_50_COD_50"]),
  couponCode: z.string().optional(),
  address: addressSchema,
  notes: z.string().optional(),
  saveAddress: z.boolean().optional(),
});

export type CreateOrderResult =
  | {
      ok: true;
      orderId: string;
      orderNumber: string;
      amountToPay: number; // rupees to collect now
      testMode: boolean;
      razorpayOrderId?: string;
      razorpayKeyId?: string;
    }
  | { ok: false; error: string };

/** Server-side coupon validation. Returns the discount in rupees. */
export async function validateCoupon(code: string, subtotal: number) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("coupons")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .eq("is_active", true)
    .maybeSingle();
  if (!data) return { ok: false as const, error: "Invalid or inactive coupon." };
  const now = new Date();
  if (data.starts_at && new Date(data.starts_at) > now) return { ok: false as const, error: "Coupon not yet active." };
  if (data.expires_at && new Date(data.expires_at) < now) return { ok: false as const, error: "Coupon expired." };
  if (data.usage_limit != null && data.used_count >= data.usage_limit)
    return { ok: false as const, error: "Coupon usage limit reached." };
  if (subtotal < Number(data.min_order_amount))
    return { ok: false as const, error: `Minimum order ₹${data.min_order_amount} required for this coupon.` };
  const discount = couponDiscount(data as Coupon, subtotal);
  return { ok: true as const, code: data.code, discount };
}

export async function createOrder(input: unknown): Promise<CreateOrderResult> {
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please complete all required fields correctly." };
  const { items, paymentType, couponCode, address, notes, saveAddress } = parsed.data;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const settings = await getSiteSettings();

  // Authoritative product fetch — never trust client prices.
  const ids = items.map((i) => i.productId);
  const { data: products, error: prodErr } = await admin
    .from("products")
    .select("id, name, sku, price, sale_price, is_quote_only, product_type, stock_quantity, is_active, delivery_charge")
    .in("id", ids);
  if (prodErr) return { ok: false, error: "Could not load products." };

  const lines: PricedLine[] = [];
  for (const item of items) {
    const p = products?.find((x) => x.id === item.productId);
    if (!p || !p.is_active) return { ok: false, error: "A product in your cart is no longer available." };
    if (p.is_quote_only || p.product_type === "QUOTE_ONLY" || p.product_type === "CUSTOM" || p.price == null)
      return { ok: false, error: `${p.name} is quote-only and cannot be purchased online.` };
    if (p.stock_quantity > 0 && item.quantity > p.stock_quantity)
      return { ok: false, error: `Only ${p.stock_quantity} of ${p.name} in stock.` };
    const unit = p.sale_price != null && p.sale_price < p.price ? Number(p.sale_price) : Number(p.price);
    // primary image for order snapshot
    const { data: img } = await admin
      .from("product_images").select("url").eq("product_id", p.id).eq("is_primary", true).maybeSingle();
    lines.push({
      product_id: p.id, product_name: p.name, sku: p.sku,
      image_url: img?.url ?? null, unit_price: unit, quantity: item.quantity,
      line_total: unit * item.quantity,
      delivery_charge: (p as any).delivery_charge ?? null,
    });
  }

  // Coupon (server-validated)
  let coupon: Coupon | null = null;
  if (couponCode) {
    const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
    const res = await validateCoupon(couponCode, subtotal);
    if (res.ok) {
      const { data } = await admin.from("coupons").select("*").eq("code", res.code).maybeSingle();
      coupon = (data as Coupon) ?? null;
    }
  }

  const totals = computeTotals(lines, settings, paymentType, coupon);
  const amountToPay = paymentType === "FULL_PAYMENT" ? totals.total : totals.advance_required;

  // Insert order (service role; RLS-safe)
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({
      customer_id: user?.id ?? null,
      subtotal: totals.subtotal,
      discount: totals.discount,
      coupon_code: coupon?.code ?? null,
      delivery_charge: totals.delivery_charge,
      tax: totals.tax,
      total_amount: totals.total,
      payment_type: paymentType,
      advance_required: totals.advance_required,
      advance_paid: 0,
      cod_amount: totals.cod_amount,
      payment_status: "PENDING",
      order_status: "PENDING_PAYMENT",
      cod_status: paymentType === "ADVANCE_50_COD_50" ? "COD_PENDING" : "NOT_APPLICABLE",
      shipping_address: address,
      customer_notes: notes ?? null,
      contact_email: address.email || null,
      contact_mobile: address.mobile,
    })
    .select("id, order_number")
    .single();
  if (orderErr || !order) return { ok: false, error: "Could not create your order. Please try again." };

  await admin.from("order_items").insert(
    lines.map((l) => ({
      order_id: order.id, product_id: l.product_id, product_name: l.product_name,
      sku: l.sku, image_url: l.image_url, unit_price: l.unit_price,
      quantity: l.quantity, line_total: l.line_total,
    })),
  );

  if (saveAddress && user) {
    await admin.from("addresses").insert({
      user_id: user.id, full_name: address.full_name, mobile: address.mobile,
      email: address.email || null, address_line: address.address_line, area: address.area || null,
      city: address.city, state: address.state, pincode: address.pincode, landmark: address.landmark || null,
    });
  }

  // Payment record for the amount collected now
  const paymentType2 = paymentType === "FULL_PAYMENT" ? "FULL" : "ADVANCE";
  const { data: payment } = await admin
    .from("payments")
    .insert({ order_id: order.id, amount: amountToPay, payment_type: paymentType2, gateway: "razorpay", status: "CREATED" })
    .select("id")
    .single();

  if (isRazorpayConfigured()) {
    try {
      const rzp = await createRazorpayOrder({
        amountPaise: toPaise(amountToPay),
        receipt: order.order_number,
        notes: { order_id: order.id, order_number: order.order_number },
      });
      if (payment) await admin.from("payments").update({ gateway_order_id: rzp.id }).eq("id", payment.id);
      return {
        ok: true, orderId: order.id, orderNumber: order.order_number,
        amountToPay, testMode: false, razorpayOrderId: rzp.id, razorpayKeyId: RZP_PUBLIC_KEY_ID,
      };
    } catch (e: any) {
      return { ok: false, error: "Payment gateway error. Please try again." };
    }
  }

  // Test mode: real order created, no live gateway configured.
  return { ok: true, orderId: order.id, orderNumber: order.order_number, amountToPay, testMode: true };
}

const verifySchema = z.object({
  orderId: z.string().uuid(),
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

export async function verifyPayment(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid payment data." };
  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  const valid = verifyPaymentSignature({
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });
  const admin = createAdminClient();
  if (!valid) {
    await admin.from("payments").update({ status: "FAILED" }).eq("gateway_order_id", razorpay_order_id);
    return { ok: false, error: "Payment verification failed. If money was deducted it will be refunded." };
  }
  return finalizePaidOrder(orderId, razorpay_order_id, razorpay_payment_id);
}

/** Shared finalisation used by verifyPayment and the webhook (idempotent). */
export async function finalizePaidOrder(orderId: string, gatewayOrderId: string, txnId: string) {
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };
  if (order.payment_status === "PAID" || order.payment_status === "PARTIALLY_PAID") {
    return { ok: true }; // already finalised — idempotent
  }

  await admin
    .from("payments")
    .update({ status: "CAPTURED", transaction_id: txnId })
    .eq("gateway_order_id", gatewayOrderId);

  const isFull = order.payment_type === "FULL_PAYMENT";
  await admin
    .from("orders")
    .update({
      payment_status: isFull ? "PAID" : "PARTIALLY_PAID",
      advance_paid: isFull ? order.total_amount : order.advance_required,
      order_status: "PAYMENT_CONFIRMED",
      cod_status: isFull ? "NOT_APPLICABLE" : "COD_PENDING",
    })
    .eq("id", orderId);

  // Decrement stock for tracked products
  const { data: items } = await admin
    .from("order_items")
    .select("product_id, quantity, product_name, line_total")
    .eq("order_id", orderId);
  for (const it of items ?? []) {
    if (it.product_id) await admin.rpc("decrement_stock", { p_product_id: it.product_id, p_qty: it.quantity });
  }

  // Increment coupon usage
  if (order.coupon_code) {
    const { data: c } = await admin.from("coupons").select("id, used_count").eq("code", order.coupon_code).maybeSingle();
    if (c) await admin.from("coupons").update({ used_count: c.used_count + 1 }).eq("id", c.id);
  }

  // Notifications (best-effort; never fail the order)
  try {
    const payload = {
      order_number: order.order_number,
      total_amount: Number(order.total_amount),
      advance_paid: isFull ? Number(order.total_amount) : Number(order.advance_required),
      cod_amount: Number(order.cod_amount),
      payment_type: order.payment_type,
      contact_email: order.contact_email,
      contact_mobile: order.contact_mobile,
      items: (items ?? []).map((it: any) => ({
        product_name: it.product_name ?? "Item",
        quantity: it.quantity ?? 1,
        line_total: Number(it.line_total ?? 0),
      })),
    };
    await Promise.allSettled([sendOrderConfirmation(payload as any), sendAdminNewOrder(payload as any)]);
  } catch (e) {
    console.error("order email error", e);
  }
  return { ok: true };
}

/** TEST-MODE ONLY confirmation. Refuses to run when real Razorpay keys exist. */
export async function confirmTestPayment(orderId: string): Promise<{ ok: boolean; error?: string }> {
  if (isRazorpayConfigured()) {
    return { ok: false, error: "Live payments are configured — use the payment gateway." };
  }
  const admin = createAdminClient();
  const { data: payment } = await admin.from("payments").select("id").eq("order_id", orderId).maybeSingle();
  const gatewayOrderId = `test_${orderId}`;
  if (payment) await admin.from("payments").update({ gateway_order_id: gatewayOrderId }).eq("id", payment.id);
  return finalizePaidOrder(orderId, gatewayOrderId, `test_txn_${Date.now()}`);
}
