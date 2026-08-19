import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a paise-free INR amount (rupees) as ₹1,23,456. */
export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "Price on request";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatDate(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Discounted display price: sale_price if valid and lower than price. */
export function effectivePrice(price: number | null, salePrice: number | null): number | null {
  if (price === null) return null;
  if (salePrice !== null && salePrice > 0 && salePrice < price) return salePrice;
  return price;
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n - 1).trimEnd() + "…" : str;
}
