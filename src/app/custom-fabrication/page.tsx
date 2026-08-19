"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { CheckCircle2, Loader2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { EVENT_TYPES } from "@/lib/constants";
import { submitFabricationRequest } from "@/app/actions/fabrication";

type FabForm = {
  name: string; phone: string; email?: string; event_type?: string;
  product_required?: string; dimensions?: string; quantity?: number;
  material?: string; colour?: string; finish?: string;
  required_date?: string; budget?: number; description?: string;
};

function FabricationForm() {
  const params = useSearchParams();
  const isBulk = params.get("type") === "bulk";
  const prefillProduct = params.get("product") ?? "";
  const [done, setDone] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<FabForm>({
    defaultValues: { product_required: prefillProduct },
  });

  async function onSubmit(values: any) {
    const res = await submitFabricationRequest(values);
    if (res.ok) {
      setDone(res.requestNumber ?? "");
    } else {
      toast.error(res.error ?? "Something went wrong.");
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
        <h2 className="mt-4 text-xl font-bold">Enquiry received</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your reference is <span className="font-semibold text-foreground">{done}</span>. Our team will
          contact you shortly with a quote.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-3xl space-y-6 rounded-lg border bg-card p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <F label="Your name *"><Input {...register("name", { required: true })} /></F>
        <F label="Mobile number *"><Input {...register("phone", { required: true })} inputMode="numeric" placeholder="10-digit mobile" /></F>
        <F label="Email"><Input {...register("email")} type="email" /></F>
        <F label="Event type">
          <select {...register("event_type")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Select</option>
            {EVENT_TYPES.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </F>
        <F label="Product required" full><Input {...register("product_required")} placeholder="e.g. Backdrop stand, arch, custom frame" /></F>
        <F label="Dimensions / Size"><Input {...register("dimensions")} placeholder="e.g. 8ft x 6ft" /></F>
        <F label="Quantity"><Input {...register("quantity")} type="number" min={1} defaultValue={isBulk ? 10 : undefined} /></F>
        <F label="Material"><Input {...register("material")} placeholder="e.g. metal, wood" /></F>
        <F label="Colour"><Input {...register("colour")} /></F>
        <F label="Finish"><Input {...register("finish")} placeholder="e.g. golden, matte" /></F>
        <F label="Required by date"><Input {...register("required_date")} type="date" /></F>
        <F label="Budget (₹)" full><Input {...register("budget")} type="number" min={0} placeholder="Approximate budget" /></F>
        <F label="Describe your requirement" full>
          <Textarea {...register("description")} rows={4} placeholder="Share details, reference links or event context" />
        </F>
      </div>
      <Button type="submit" variant="brand" size="lg" disabled={formState.isSubmitting}>
        {formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isBulk ? "Request Bulk Quote" : "Submit Custom Fabrication Enquiry"}
      </Button>
    </form>
  );
}

function F({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <Label className="mb-1 block text-xs">{label}</Label>
      {children}
    </div>
  );
}

export default function CustomFabricationPage() {
  return (
    <div className="container-wide py-10">
      <div className="mx-auto mb-8 max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border bg-accent/40 px-3 py-1 text-xs font-medium">
          <Wrench className="h-3.5 w-3.5 text-brand" /> Made to order
        </span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Custom Fabrication</h1>
        <p className="mt-2 text-muted-foreground">
          Tell us what you need — sizes, materials, finishes, quantities — and our team will fabricate it to
          order and share a quote. Ideal for weddings, events and bulk requirements.
        </p>
      </div>
      <Suspense fallback={null}>
        <FabricationForm />
      </Suspense>
    </div>
  );
}
