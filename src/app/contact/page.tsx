import Link from "next/link";
import { MapPin, MessageCircle, Wrench, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSiteSettings } from "@/lib/settings";
import { whatsappHrefFor } from "@/lib/whatsapp";
import { BUSINESS } from "@/lib/business";

export const metadata = { title: "Contact Us" };

export default async function ContactPage() {
  const settings = await getSiteSettings().catch(() => null);
  const msg = "Hello Alok Traders Akola, I have an enquiry.";

  return (
    <div className="container-wide py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">Contact Us</h1>
        <p className="mt-2 text-muted-foreground">
          Questions about a product, a custom size, or a bulk order? Message us on WhatsApp — it&apos;s the
          fastest way to reach us.
        </p>

        {/* WhatsApp */}
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">WhatsApp</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {BUSINESS.whatsappNumbers.map((num) => (
              <a
                key={num}
                href={whatsappHrefFor(num, msg)}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-brand"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-success">
                  <MessageCircle className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Chat on WhatsApp</p>
                  <p className="text-sm text-muted-foreground">+91 {num}</p>
                </div>
              </a>
            ))}
          </div>
          {settings?.email && (
            <p className="mt-3 text-sm text-muted-foreground">
              Email: <a href={`mailto:${settings.email}`} className="text-brand underline">{settings.email}</a>
            </p>
          )}
        </div>

        {/* Branches */}
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Our Branches</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {BUSINESS.branches.map((b) => (
              <div key={b.name} className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-brand" />
                  <p className="font-semibold">{b.name}</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{b.address}</p>
                <a
                  href={b.mapUrl}
                  target="_blank"
                  rel="noopener"
                  className="mt-2 inline-flex items-center gap-1 text-sm text-brand hover:underline"
                >
                  View on Google Maps <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-lg border bg-accent/40 p-6">
          <div className="flex items-center gap-2"><Wrench className="h-5 w-5 text-brand" /><h2 className="font-semibold">Custom fabrication or bulk order?</h2></div>
          <p className="mt-1 text-sm text-muted-foreground">Share your requirement and we&apos;ll get back with a quote.</p>
          <Button asChild variant="brand" className="mt-4"><Link href="/custom-fabrication">Submit Enquiry</Link></Button>
        </div>
      </div>
    </div>
  );
}
