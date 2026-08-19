import { formatINR } from "@/lib/utils";

export function whatsappHref(number: string | null | undefined, message: string): string | null {
  if (!number) return null;
  const clean = number.replace(/[^0-9]/g, "");
  if (!clean) return null;
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
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
