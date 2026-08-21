import type { PaymentType } from "@/lib/constants";
import type { SiteSettings, Coupon } from "@/lib/types/database";

export type PricedLine = {
  product_id: string;
  product_name: string;
  sku: string | null;
  image_url: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  delivery_charge?: number | null; // per-unit; null => contributes to flat-fee fallback
};

/** Sum of per-product delivery charges (per unit x qty). 0 if none set. */
export function perProductDelivery(lines: { delivery_charge?: number | null; quantity: number }[]): number {
  return lines.reduce((s, l) => s + (Number(l.delivery_charge ?? 0) * l.quantity), 0);
}

export type OrderTotals = {
  subtotal: number;
  discount: number;
  delivery_charge: number;
  tax: number;
  total: number;
  advance_required: number;
  cod_amount: number;
};

export function couponDiscount(coupon: Coupon | null, subtotal: number): number {
  if (!coupon) return 0;
  if (subtotal < Number(coupon.min_order_amount)) return 0;
  let d =
    coupon.discount_type === "PERCENT"
      ? (subtotal * Number(coupon.discount_value)) / 100
      : Number(coupon.discount_value);
  if (coupon.max_discount_amount != null) d = Math.min(d, Number(coupon.max_discount_amount));
  return Math.min(Math.round(d), subtotal);
}

/**
 * The single source of truth for order money. Prices for lines MUST be fetched
 * from the DB server-side before calling this — never trust client amounts.
 */
export function computeTotals(
  lines: PricedLine[],
  settings: SiteSettings,
  paymentType: PaymentType,
  coupon: Coupon | null = null,
): OrderTotals {
  const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
  const discount = couponDiscount(coupon, subtotal);
  const perProduct = perProductDelivery(lines);
  return computeTotalsWithDiscount(
    subtotal,
    discount,
    settings,
    paymentType,
    perProduct > 0 ? perProduct : undefined,
  );
}

/**
 * Same money math but from an already-resolved subtotal + discount (UI display).
 * deliveryOverride: sum of per-product delivery charges; when > 0 it replaces the
 * site flat fee. Free-delivery threshold still applies to either.
 */
export function computeTotalsWithDiscount(
  subtotal: number,
  discount: number,
  settings: SiteSettings,
  paymentType: PaymentType,
  deliveryOverride?: number,
): OrderTotals {
  const taxable = Math.max(subtotal - discount, 0);

  let delivery_charge =
    deliveryOverride != null && deliveryOverride > 0
      ? deliveryOverride
      : Number(settings.delivery_flat_fee) || 0;
  if (
    settings.free_delivery_threshold != null &&
    taxable >= Number(settings.free_delivery_threshold)
  ) {
    delivery_charge = 0;
  }

  const tax =
    settings.tax_enabled && Number(settings.tax_rate) > 0
      ? Math.round((taxable * Number(settings.tax_rate)) / 100)
      : 0;

  const total = taxable + delivery_charge + tax;

  let advance_required = total;
  let cod_amount = 0;
  if (paymentType === "ADVANCE_50_COD_50") {
    const pct = Number(settings.advance_percentage) || 50;
    advance_required = Math.round((total * pct) / 100);
    cod_amount = total - advance_required;
  }

  return { subtotal, discount, delivery_charge, tax, total, advance_required, cod_amount };
}

export function isPurchasable(product: {
  product_type: string;
  is_quote_only: boolean;
  price: number | null;
}): boolean {
  return (
    !product.is_quote_only &&
    product.product_type !== "QUOTE_ONLY" &&
    product.product_type !== "CUSTOM" &&
    product.price != null
  );
}

export function showsCustomQuote(product: { product_type: string; is_customizable: boolean }): boolean {
  return (
    product.product_type === "CUSTOM" ||
    product.product_type === "READY_MADE_AND_CUSTOM" ||
    product.is_customizable
  );
}
