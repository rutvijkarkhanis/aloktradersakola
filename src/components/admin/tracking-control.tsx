"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Truck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { updateOrderTracking } from "@/app/actions/admin";

export function TrackingControl({
  orderId, courier, trackingNumber, trackingUrl,
}: {
  orderId: string; courier: string | null; trackingNumber: string | null; trackingUrl: string | null;
}) {
  const router = useRouter();
  const [c, setC] = useState(courier ?? "Delhivery");
  const [n, setN] = useState(trackingNumber ?? "");
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const res = await updateOrderTracking(orderId, { courier: c, tracking_number: n });
      if (res.ok) { toast.success("Tracking updated"); router.refresh(); }
      else toast.error(res.error ?? "Failed");
    });
  }

  return (
    <div className="space-y-2">
      <div>
        <Label className="mb-1 block text-xs">Courier</Label>
        <Input value={c} onChange={(e) => setC(e.target.value)} placeholder="Delhivery" className="h-9" />
      </div>
      <div>
        <Label className="mb-1 block text-xs">Waybill / Tracking no.</Label>
        <Input value={n} onChange={(e) => setN(e.target.value)} placeholder="Delhivery AWB" className="h-9" />
      </div>
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
