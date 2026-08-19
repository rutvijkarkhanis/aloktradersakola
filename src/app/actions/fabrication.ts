"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  name: z.string().min(2, "Enter your name"),
  phone: z.string().regex(/^[0-9]{10}$/, "Enter a valid 10-digit mobile"),
  email: z.string().email().optional().or(z.literal("")),
  event_type: z.string().optional(),
  product_required: z.string().optional(),
  dimensions: z.string().optional(),
  quantity: z.coerce.number().int().positive().optional(),
  material: z.string().optional(),
  colour: z.string().optional(),
  finish: z.string().optional(),
  required_date: z.string().optional(),
  budget: z.coerce.number().nonnegative().optional(),
  description: z.string().optional(),
  reference_images: z.array(z.string().url()).optional(),
});

export async function submitFabricationRequest(input: unknown): Promise<{ ok: boolean; error?: string; requestNumber?: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Please check the form." };
  }
  const d = parsed.data;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("custom_fabrication_requests")
    .insert({
      user_id: user?.id ?? null,
      name: d.name,
      phone: d.phone,
      email: d.email || null,
      event_type: d.event_type || null,
      product_required: d.product_required || null,
      dimensions: d.dimensions || null,
      quantity: d.quantity ?? null,
      material: d.material || null,
      colour: d.colour || null,
      finish: d.finish || null,
      required_date: d.required_date || null,
      budget: d.budget ?? null,
      description: d.description || null,
      reference_images: d.reference_images && d.reference_images.length ? d.reference_images : null,
      status: "NEW",
    })
    .select("request_number")
    .single();

  if (error || !data) return { ok: false, error: "Could not submit your enquiry. Please try again." };
  return { ok: true, requestNumber: data.request_number };
}
