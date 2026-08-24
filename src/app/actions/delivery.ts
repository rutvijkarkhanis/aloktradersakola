"use server";

import { createClient } from "@/lib/supabase/server";
import { isFshipRatingConfigured, rateCalculator, FshipError } from "@/lib/fship";
import { getSiteSettings } from "@/lib/settings";
import { SHIP_ORIGIN_PINCODE, DEFAULT_SHIPPING_WEIGHT_KG } from "@/lib/business";

export type DeliveryEstimate =
  | {
      ok: true;
      serviceable: boolean;
      /** Estimated delivery charge in INR (0 when the store ships free). */
      amount: number;
      /** true when this is the store's standard estimate rather than a live courier quote. */
      approximate: boolean;
      courier: string | null;
      pincode: string;
      note?: string;
    }
  | { ok: false; error: string };

type EstimateItem = { productId: string; quantity: number };

const VOLUMETRIC_DIVISOR = 5000; // cm³ per kg (industry standard for surface)

// Small per-instance cache so repeated checks for the same pincode+weight band
// don't re-hit the paid rate API. Serverless: per-lambda, best-effort.
const cache = new Map<string, { at: number; value: DeliveryEstimate }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Estimate delivery for a set of cart items to a destination pincode.
 * Uses FShip's rate calculator when configured (real courier price), else
 * falls back to the store's per-product / flat delivery charge.
 */
export async function estimateDelivery(input: { pincode: string; items: EstimateItem[] }): Promise<DeliveryEstimate> {
  const pincode = (input.pincode || "").replace(/[^0-9]/g, "");
  if (pincode.length !== 6) return { ok: false, error: "Enter a valid 6-digit pincode." };
  const items = (input.items || []).filter((i) => i.productId && i.quantity > 0);
  if (!items.length) return { ok: false, error: "No items to estimate." };

  const supabase = createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, price, sale_price, delivery_charge, shipping_weight, length_cm, breadth_cm, height_cm")
    .in("id", items.map((i) => i.productId));
  if (!products || !products.length) return { ok: false, error: "Products not found." };

  const byId = new Map(products.map((p) => [p.id, p]));

  // Aggregate goods value + billable weight (max of actual and volumetric per item).
  let amount = 0;
  let billableWeight = 0;
  let flatDelivery = 0;
  for (const it of items) {
    const p = byId.get(it.productId);
    if (!p) continue;
    const unit = Number(p.sale_price ?? p.price ?? 0);
    amount += unit * it.quantity;
    flatDelivery += Number(p.delivery_charge ?? 0) * it.quantity;
    const actual = Number(p.shipping_weight) || DEFAULT_SHIPPING_WEIGHT_KG;
    const vol =
      p.length_cm && p.breadth_cm && p.height_cm
        ? (Number(p.length_cm) * Number(p.breadth_cm) * Number(p.height_cm)) / VOLUMETRIC_DIVISOR
        : 0;
    billableWeight += Math.max(actual, vol) * it.quantity;
  }
  billableWeight = Math.max(0.5, Math.round(billableWeight * 100) / 100);

  const settings = await getSiteSettings().catch(() => null);
  const freeOver = settings?.free_delivery_threshold != null ? Number(settings.free_delivery_threshold) : null;
  const flatFallback = flatDelivery > 0 ? flatDelivery : Number(settings?.delivery_flat_fee) || 0;

  const applyFreeThreshold = (charge: number): { amount: number; note?: string } =>
    freeOver != null && amount >= freeOver
      ? { amount: 0, note: `Free delivery on orders over ₹${freeOver.toLocaleString("en-IN")}.` }
      : { amount: charge };

  // Live quote via FShip when configured.
  if (isFshipRatingConfigured()) {
    const weightBand = Math.ceil(billableWeight * 2) / 2; // round to 0.5kg for cache hits
    const key = `${pincode}:${weightBand}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

    try {
      const rates = await rateCalculator({
        sourcePincode: SHIP_ORIGIN_PINCODE,
        destPincode: pincode,
        paymentMode: "PREPAID",
        amount: Math.round(amount),
        weightKg: billableWeight,
      });
      let value: DeliveryEstimate;
      if (!rates.length) {
        value = {
          ok: true, serviceable: false, amount: 0, approximate: false, courier: null, pincode,
          note: "We don't have a courier for this pincode yet — message us on WhatsApp and we'll arrange delivery.",
        };
      } else {
        const cheapest = rates.reduce((a, b) => (b.shippingCharge < a.shippingCharge ? b : a));
        const free = applyFreeThreshold(cheapest.shippingCharge);
        value = {
          ok: true, serviceable: true, amount: free.amount, approximate: false,
          courier: cheapest.courierName, pincode, note: free.note,
        };
      }
      cache.set(key, { at: Date.now(), value });
      return value;
    } catch (e) {
      // Fall through to the flat estimate on any API error.
      if (!(e instanceof FshipError)) { /* network/other — still fall back */ }
    }
  }

  // Fallback: store's standard delivery charge.
  const free = applyFreeThreshold(flatFallback);
  return {
    ok: true, serviceable: true, amount: free.amount, approximate: true, courier: null, pincode,
    note: free.note ?? "Standard estimate — the exact charge is confirmed at checkout.",
  };
}
