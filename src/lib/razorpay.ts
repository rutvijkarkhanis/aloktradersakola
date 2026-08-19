import "server-only";
import crypto from "node:crypto";

export const RZP_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
export const RZP_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
export const RZP_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "";
export const RZP_PUBLIC_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || RZP_KEY_ID;

/** Razorpay is "configured" only when we have server-side keys. */
export function isRazorpayConfigured(): boolean {
  return Boolean(RZP_KEY_ID && RZP_KEY_SECRET);
}

type RzpOrder = { id: string; amount: number; currency: string; status: string };

/** Create a Razorpay order server-side. Amounts are in paise. */
export async function createRazorpayOrder(params: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RzpOrder> {
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(`${RZP_KEY_ID}:${RZP_KEY_SECRET}`).toString("base64"),
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: "INR",
      receipt: params.receipt,
      notes: params.notes ?? {},
      payment_capture: 1,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Razorpay order creation failed (${res.status}): ${text}`);
  }
  return (await res.json()) as RzpOrder;
}

/** Verify the checkout handler signature: HMAC_SHA256(order_id|payment_id, secret). */
export function verifyPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): boolean {
  const expected = crypto
    .createHmac("sha256", RZP_KEY_SECRET)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest("hex");
  return timingSafeEqual(expected, params.signature);
}

/** Verify a webhook payload signature against RAZORPAY_WEBHOOK_SECRET. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!RZP_WEBHOOK_SECRET) return false;
  const expected = crypto.createHmac("sha256", RZP_WEBHOOK_SECRET).update(rawBody).digest("hex");
  return timingSafeEqual(expected, signature);
}

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export const toPaise = (rupees: number) => Math.round(rupees * 100);
export const toRupees = (paise: number) => Math.round(paise) / 100;
