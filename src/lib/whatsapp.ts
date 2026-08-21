import { formatINR } from "@/lib/utils";
import { BUSINESS, waNumber } from "@/lib/business";

export function whatsappHref(number: string | null | undefined, message: string): string | null {
  // Fall back to the business primary WhatsApp when settings doesn't set one.
  const raw = number || BUSINESS.primaryWhatsapp;
  const clean = waNumber(raw);
  if (!clean) return null;
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

/** Build a wa.me link for a specific local number with a message. */
export function whatsappHrefFor(localNumber: string, message: string): string {
  return `https://wa.me/${waNumber(localNumber)}?text=${encodeURIComponent(message)}`;
}

export function productEnquiryMessage(p: {
  name: string;
  sku: string | null;
  price: number | null;
  quantity?: number;
}): string {
  const lines = [
    `Hello Alok Traders Akola, I'm enquiring about this product:`,
    ``,
    `Product: ${p.name}`,
    p.sku ? `SKU: ${p.sku}` : ``,
    p.price != null ? `Price: ${formatINR(p.price)}` : `Price: On request`,
    p.quantity ? `Quantity: ${p.quantity}` : ``,
    ``,
    `Please share availability and details.`,
  ].filter(Boolean);
  return lines.join("\n");
}

export function bulkEnquiryMessage(): string {
  return `Hello Alok Traders Akola, I would like a bulk / wholesale quote. Please share pricing for multiple pieces.`;
}
