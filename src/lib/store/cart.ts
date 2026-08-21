"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  sku: string | null;
  price: number; // display snapshot; server re-fetches authoritative price at checkout
  salePrice: number | null;
  image: string | null;
  quantity: number;
  stock: number; // 0 => made to order (no hard cap)
  deliveryCharge?: number | null; // per-unit delivery charge (INR)
};

type CartState = {
  lines: CartLine[];
  add: (line: Omit<CartLine, "quantity">, qty?: number) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      add: (line, qty = 1) =>
        set((s) => {
          const existing = s.lines.find((l) => l.productId === line.productId);
          if (existing) {
            const max = line.stock > 0 ? line.stock : Infinity;
            const nextQty = Math.min(existing.quantity + qty, max);
            return {
              lines: s.lines.map((l) =>
                l.productId === line.productId ? { ...l, ...line, quantity: nextQty } : l,
              ),
            };
          }
          const max = line.stock > 0 ? line.stock : Infinity;
          return { lines: [...s.lines, { ...line, quantity: Math.min(qty, max) }] };
        }),
      remove: (productId) => set((s) => ({ lines: s.lines.filter((l) => l.productId !== productId) })),
      setQty: (productId, qty) =>
        set((s) => ({
          lines: s.lines
            .map((l) => {
              if (l.productId !== productId) return l;
              const max = l.stock > 0 ? l.stock : Infinity;
              return { ...l, quantity: Math.max(1, Math.min(qty, max)) };
            })
            .filter((l) => l.quantity > 0),
        })),
      clear: () => set({ lines: [] }),
      count: () => get().lines.reduce((n, l) => n + l.quantity, 0),
      subtotal: () =>
        get().lines.reduce(
          (s, l) => s + (l.salePrice && l.salePrice < l.price ? l.salePrice : l.price) * l.quantity,
          0,
        ),
    }),
    { name: "ata-cart-v1" },
  ),
);
