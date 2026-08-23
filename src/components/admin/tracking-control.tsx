"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Truck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { updateOrderTracking } from "@/app/actions/admin";

const COURIERS = ["Big Ship (Delhivery)", "Delhivery", "Other"] as const;

export function TrackingControl({
  orderId, courier, trackingNumber, trackingUrl,
}: {
  orderId: string; courier: string | null; trackingNumber: string | null; trackingUrl: string | null;
}) {
  const router = useRouter();
  const initialCourier = courier && (COURIERS as readonly string[]).includes(courier) ? courier : courier ? "Other" : "Big Ship (Delhivery)";
  const [c, setC] = useState<string>(initialCourier);
  const [otherName, setOtherName] = useState(initialCourier === "Other" ? courier ?? "" : "");
  const [n, setN] = useState(trackingNumber ?? "");
  const [url, setUrl] = useState(trackingUrl ?? "");
  const [pending, start] = useTransition();

  const isOther = c === "Other";

  function save() {
    const courierName = isOther ? otherName.trim() : c;
    if (!n.trim()) return toast.error("Enter the waybill / AWB number");
    if (isOther && !courierName) return toast.error("Enter the courier name");
    start(async () => {
      const res = await updateOrderTracking(orderId, {
        courier: courierName,
        tracking_number: n.trim(),
        // For "Other" couriers we can't derive a URL — let the admin paste one.
        tracking_url: isOther ? url.trim() : undefined,
      });
      if (res.ok) { toast.success("Tracking updated"); router.refresh(); }
      else toast.error(res.error ?? "Failed");
    });
  }

  return (
    <div className="space-y-2">
      <div>
        <Label className="mb-1 block text-xs">Courier</Label>
        <select
          value={c}
          onChange={(e) => setC(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {COURIERS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
      {isOther && (
        <div>
          <Label className="mb-1 block text-xs">Courier name</Label>
          <Input value={otherName} onChange={(e) => setOtherName(e.target.value)} placeholder="e.g. Blue Dart" className="h-9" />
        </div>
      )}
      <div>
        <Label className="mb-1 block text-xs">Waybill / AWB no.</Label>
        <Input value={n} onChange={(e) => setN(e.target.value)} placeholder="AWB from Big Ship" className="h-9" />
      </div>
      {isOther && (
        <div>
          <Label className="mb-1 block text-xs">Tracking URL</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="h-9" />
        </div>
      )}
      {!isOther && (
        <p className="text-[11px] text-muted-foreground">
          Big Ship ships via Delhivery — the AWB is tracked on Delhivery&apos;s page automatically.
        </p>
      )}
      <Button size="sm" variant="brand" onClick={save} disabled={pending} className="w-full">
        <Truck className="h-4 w-4" /> Save tracking
      </Button>
      {trackingUrl && (
        <a href={trackingUrl} target="_blank" rel="noopener" className="flex items-center justify-center gap-1 text-xs text-brand hover:underline">
          Open tracking page <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
