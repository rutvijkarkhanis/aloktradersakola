"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { updateSettings } from "@/app/actions/admin";
import type { SiteSettings } from "@/lib/types/database";

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [saving, setSaving] = useState(false);
  const [taxEnabled, setTaxEnabled] = useState(settings.tax_enabled);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const res = await updateSettings({
      business_name: String(fd.get("business_name")),
      tagline: String(fd.get("tagline") || ""),
      phone: String(fd.get("phone") || ""),
      whatsapp_number: String(fd.get("whatsapp_number") || ""),
      email: String(fd.get("email") || ""),
      address: String(fd.get("address") || ""),
      instagram_url: String(fd.get("instagram_url") || ""),
      facebook_url: String(fd.get("facebook_url") || ""),
      description: String(fd.get("description") || ""),
      tax_enabled: taxEnabled,
      tax_rate: Number(fd.get("tax_rate") || 0),
      tax_label: String(fd.get("tax_label") || "GST"),
      delivery_flat_fee: Number(fd.get("delivery_flat_fee") || 0),
      free_delivery_threshold: fd.get("free_delivery_threshold") ? Number(fd.get("free_delivery_threshold")) : null,
      advance_percentage: Number(fd.get("advance_percentage") || 50),
    });
    setSaving(false);
    if (res.ok) toast.success("Settings saved");
    else toast.error(res.error ?? "Failed");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Section title="Business">
        <div className="grid gap-4 sm:grid-cols-2">
          <F label="Business name"><Input name="business_name" defaultValue={settings.business_name} /></F>
          <F label="Tagline"><Input name="tagline" defaultValue={settings.tagline ?? ""} /></F>
          <F label="Description" full><Textarea name="description" defaultValue={settings.description ?? ""} /></F>
        </div>
      </Section>

      <Section title="Contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <F label="Phone"><Input name="phone" defaultValue={settings.phone ?? ""} /></F>
          <F label="WhatsApp number (with country code, digits only)"><Input name="whatsapp_number" defaultValue={settings.whatsapp_number ?? ""} placeholder="9198XXXXXXXX" /></F>
          <F label="Email"><Input name="email" type="email" defaultValue={settings.email ?? ""} /></F>
          <F label="Address"><Input name="address" defaultValue={settings.address ?? ""} /></F>
          <F label="Instagram URL"><Input name="instagram_url" defaultValue={settings.instagram_url ?? ""} /></F>
          <F label="Facebook URL"><Input name="facebook_url" defaultValue={settings.facebook_url ?? ""} /></F>
        </div>
      </Section>

      <Section title="Tax">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={taxEnabled} onChange={(e) => setTaxEnabled(e.target.checked)} /> Enable tax
        </label>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <F label="Tax label"><Input name="tax_label" defaultValue={settings.tax_label} /></F>
          <F label="Tax rate (%)"><Input name="tax_rate" type="number" step="0.01" min={0} max={100} defaultValue={settings.tax_rate} /></F>
        </div>
      </Section>

      <Section title="Delivery & Payment">
        <div className="grid gap-4 sm:grid-cols-3">
          <F label="Flat delivery fee (₹)"><Input name="delivery_flat_fee" type="number" min={0} defaultValue={settings.delivery_flat_fee} /></F>
          <F label="Free delivery over (₹)"><Input name="free_delivery_threshold" type="number" min={0} defaultValue={settings.free_delivery_threshold ?? ""} /></F>
          <F label="Advance % (50/50 orders)"><Input name="advance_percentage" type="number" min={1} max={100} defaultValue={settings.advance_percentage} /></F>
        </div>
      </Section>

      <Button type="submit" variant="brand" disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save settings
      </Button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-lg border bg-card p-5"><h2 className="mb-3 font-semibold">{title}</h2>{children}</div>;
}
function F({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={full ? "sm:col-span-2" : ""}><Label className="mb-1 block text-xs">{label}</Label>{children}</div>;
}
