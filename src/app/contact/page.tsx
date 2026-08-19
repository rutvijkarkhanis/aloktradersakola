import Link from "next/link";
import { Phone, Mail, MapPin, MessageCircle, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSiteSettings } from "@/lib/settings";
import { whatsappHref } from "@/lib/whatsapp";

export const metadata = { title: "Contact Us" };

export default async function ContactPage() {
  const settings = await getSiteSettings().catch(() => null);
  const wa = whatsappHref(settings?.whatsapp_number, "Hello Alok Traders Akola, I have an enquiry.");

  return (
    <div className="container-wide py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">Contact Us</h1>
        <p className="mt-2 text-muted-foreground">
          Questions about a product, a custom size, or a bulk order? Reach us through any of the options below.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {settings?.phone && (
            <a href={`tel:${settings.phone}`} className="flex items-center gap-3 rounded-lg border bg-card p-4 hover:border-brand">
              <Phone className="h-5 w-5 text-brand" /><div><p className="text-sm font-semibold">Call us</p><p className="text-sm text-muted-foreground">{settings.phone}</p></div>
            </a>
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noopener" className="flex items-center gap-3 rounded-lg border bg-card p-4 hover:border-brand">
              <MessageCircle className="h-5 w-5 text-brand" /><div><p className="text-sm font-semibold">WhatsApp</p><p className="text-sm text-muted-foreground">Chat with us</p></div>
            </a>
          )}
          {settings?.email && (
            <a href={`mailto:${settings.email}`} className="flex items-center gap-3 rounded-lg border bg-card p-4 hover:border-brand">
              <Mail className="h-5 w-5 text-brand" /><div><p className="text-sm font-semibold">Email</p><p className="text-sm text-muted-foreground">{settings.email}</p></div>
            </a>
          )}
          {settings?.address && (
            <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
              <MapPin className="h-5 w-5 text-brand" /><div><p className="text-sm font-semibold">Visit</p><p className="text-sm text-muted-foreground">{settings.address}</p></div>
            </div>
          )}
        </div>

        {!settings?.phone && !settings?.email && !wa && (
          <p className="mt-6 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Contact details can be configured by the store admin under Settings.
          </p>
        )}

        <div className="mt-8 rounded-lg border bg-accent/40 p-6">
          <div className="flex items-center gap-2"><Wrench className="h-5 w-5 text-brand" /><h2 className="font-semibold">Custom fabrication or bulk order?</h2></div>
          <p className="mt-1 text-sm text-muted-foreground">Share your requirement and we&apos;ll get back with a quote.</p>
          <Button asChild variant="brand" className="mt-4"><Link href="/custom-fabrication">Submit Enquiry</Link></Button>
        </div>
      </div>
    </div>
  );
}
