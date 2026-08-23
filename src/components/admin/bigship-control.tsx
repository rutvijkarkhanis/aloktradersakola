"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Truck, RefreshCw, FileText, XCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { bookBigshipShipment, refreshBigshipTracking, cancelBigshipShipment } from "@/app/actions/shipping";

export function BigshipControl({
  orderId, bigshipOrderId, awb, courier, trackingUrl, labelUrl, trackingStatus, trackingSyncedAt,
}: {
  orderId: string;
  bigshipOrderId: string | null;
  awb: string | null;
  courier: string | null;
  trackingUrl: string | null;
  labelUrl: string | null;
  trackingStatus: string | null;
  trackingSyncedAt: string | null;
}) {
  const router = useRouter();
  const [weight, setWeight] = useState("");
  const [l, setL] = useState("");
  const [b, setB] = useState("");
  const [h, setH] = useState("");
  const [pending, start] = useTransition();

  const booked = Boolean(bigshipOrderId && awb);

  function book() {
    const weightKg = Number(weight);
    if (!weightKg || weightKg <= 0) return toast.error("Enter the parcel weight in kg");
    start(async () => {
      const res = await bookBigshipShipment(orderId, {
        weightKg,
        length: l ? Number(l) : undefined,
        breadth: b ? Number(b) : undefined,
        height: h ? Number(h) : undefined,
      });
      if (res.ok) { toast.success(`Booked — AWB ${res.awb}`); router.refresh(); }
      else toast.error(res.error ?? "Booking failed");
    });
  }

  function refresh() {
    start(async () => {
      const res = await refreshBigshipTracking(orderId);
      if (res.ok) { toast.success(res.status ? `Status: ${res.status}` : "Tracking refreshed"); router.refresh(); }
      else toast.error(res.error ?? "Could not refresh");
    });
  }

  function cancel() {
    if (!confirm("Cancel this Big Ship shipment? The AWB will be released.")) return;
    start(async () => {
      const res = await cancelBigshipShipment(orderId);
      if (res.ok) { toast.success("Shipment cancelled"); router.refresh(); }
      else toast.error(res.error ?? "Could not cancel");
    });
  }

  if (booked) {
    return (
      <div className="space-y-2 text-sm">
        <div className="rounded-md bg-secondary/50 p-2">
          <div className="font-medium">{courier || "Big Ship"}</div>
          <div className="text-muted-foreground">AWB <span className="font-mono">{awb}</span></div>
          {trackingStatus && (
            <div className="mt-1">
              Status: <span className="font-medium text-foreground">{trackingStatus}</span>
              {trackingSyncedAt && (
                <span className="text-[11px] text-muted-foreground"> · {new Date(trackingSyncedAt).toLocaleString("en-IN")}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={refresh} disabled={pending}>
            <RefreshCw className="h-4 w-4" /> Refresh status
          </Button>
          {trackingUrl && (
            <Button size="sm" variant="outline" asChild>
              <a href={trackingUrl} target="_blank" rel="noopener"><ExternalLink className="h-4 w-4" /> Track</a>
            </Button>
          )}
          {labelUrl && (
            <Button size="sm" variant="outline" asChild>
              <a href={labelUrl} target="_blank" rel="noopener"><FileText className="h-4 w-4" /> Label</a>
            </Button>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={cancel} disabled={pending} className="text-destructive hover:text-destructive">
          <XCircle className="h-4 w-4" /> Cancel shipment
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">
        Book this order with Big Ship — the AWB, tracking link and label are created automatically.
      </p>
      <div>
        <Label className="mb-1 block text-xs">Parcel weight (kg) *</Label>
        <Input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" placeholder="e.g. 2" className="h-9" />
      </div>
      <div>
        <Label className="mb-1 block text-xs">Dimensions (cm) — optional</Label>
        <div className="grid grid-cols-3 gap-2">
          <Input value={l} onChange={(e) => setL(e.target.value)} inputMode="numeric" placeholder="L" className="h-9" />
          <Input value={b} onChange={(e) => setB(e.target.value)} inputMode="numeric" placeholder="B" className="h-9" />
          <Input value={h} onChange={(e) => setH(e.target.value)} inputMode="numeric" placeholder="H" className="h-9" />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Defaults to 10×10×10 if left blank.</p>
      </div>
      <Button size="sm" variant="brand" onClick={book} disabled={pending} className="w-full">
        <Truck className="h-4 w-4" /> {pending ? "Booking…" : "Book with Big Ship"}
      </Button>
    </div>
  );
}
