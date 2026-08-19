import Link from "next/link";
import { Wrench, Truck, Users, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSiteSettings } from "@/lib/settings";

export const metadata = { title: "About Us" };

export default async function AboutPage() {
  const settings = await getSiteSettings().catch(() => null);
  const name = settings?.business_name || "Alok Traders Akola";
  return (
    <div className="container-wide py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">About {name}</h1>
        <p className="mt-4 text-muted-foreground">
          {name} supplies fabrication structures and event decoration products for weddings, birthdays,
          parties and events. We offer a ready-made catalogue of backdrop stands, rings, arches, canopies,
          frames, cake tables and display stands — and we fabricate custom pieces to order in the sizes,
          materials and finishes you need.
        </p>
        <p className="mt-3 text-muted-foreground">
          We work with event decorators, wedding and event planners, party decorators, businesses,
          resellers and individual customers. Bulk and event orders are welcome.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {[
            { icon: PackageCheck, t: "Ready-made catalogue", d: "Browse products with clear INR pricing and order online." },
            { icon: Wrench, t: "Custom fabrication", d: "Made-to-order pieces built to your exact requirement." },
            { icon: Users, t: "For trade & individuals", d: "Decorators, planners, resellers and retail customers." },
            { icon: Truck, t: "Reliable dispatch", d: "Careful packing and delivery for your event timelines." },
          ].map((f) => (
            <div key={f.t} className="rounded-lg border bg-card p-5">
              <f.icon className="h-6 w-6 text-brand" />
              <h3 className="mt-2 font-semibold">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex gap-3">
          <Button asChild variant="brand"><Link href="/shop">Shop Products</Link></Button>
          <Button asChild variant="outline"><Link href="/custom-fabrication">Custom Fabrication</Link></Button>
        </div>
      </div>
    </div>
  );
}
