import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { SiteSettings } from "@/lib/types/database";

export const DEFAULT_SETTINGS: SiteSettings = {
  id: 1,
  business_name: "Alok Traders Akola",
  logo_url: null,
  tagline: "Fabrication & Event Décor Products",
  phone: null,
  whatsapp_number: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || null,
  email: null,
  address: null,
  instagram_url: null,
  facebook_url: null,
  description:
    "Fabrication structures, event decoration products and custom solutions for weddings, birthdays, parties and events.",
  currency: "INR",
  tax_enabled: false,
  tax_rate: 0,
  tax_label: "GST",
  delivery_flat_fee: 0,
  free_delivery_threshold: null,
  advance_percentage: 50,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/** Site settings with a safe default when the DB/env isn't configured yet. */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const supabase = createClient();
    const { data } = await supabase.from("site_settings").select("*").eq("id", 1).single();
    if (!data) return DEFAULT_SETTINGS;
    return {
      ...data,
      whatsapp_number: data.whatsapp_number || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || null,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
});
