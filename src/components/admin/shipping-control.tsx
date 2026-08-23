"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Truck, RefreshCw, FileText, XCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { bookShipment, refreshTracking, cancelShipment, type ShippingProvider } from "@/app/actions/shipping";

type Warehouse = { id: string; label: string };

const PROVIDER_LABELS: Record<ShippingProvider, string> = {
  bigship: "Big Ship",
  fship: "FShip",
};

export function ShippingControl({
  orderId, awb, courier, trackingUrl, labelUrl, trackingStatus, trackingSyncedAt,
  providers, bigshipWarehouses, fshipWarehouses,
}: {
  orderId: string;
  awb: string | null;
  courier: string | null;
  trackingUrl: string | null;
  labelUrl: string | null;
  trackingStatus: string | null;
  trackingSyncedAt: string | null;
  providers: { bigship: boolean; fship: boolean };
  bigshipWarehouses: Warehouse[];
  fshipWarehouses: Warehouse[];
}) {
  const router = useRouter();
  const available = useMemo(
    () => (["bigship", "fship"] as ShippingProvider[]).filter((p) => providers[p]),
    [providers],
  );
  const [provider, setProvider] = useState<ShippingProvider>(available[0] ?? "bigship");
  const warehouses = provider === "fship" ? fshipWarehouses : bigshipWarehouses;
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [weight, setWeight] = useState("");
  const [l, setL] = useState("");
  const [b, setB] = useState("");
  const [h, setH] = useState("");
  const [pending, start] = useTransition();

  const booked = Boolean(awb);

  function onProviderChange(p: ShippingProvider) {
    setProvider(p);
    const wh = p === "fship" ? fshipWarehouses : bigshipWarehouses;
    setWarehouseId(wh[0]?.id ?? "");
  }

  function book() {
    const weightKg = Number(weight);
    if (!weightKg || weightKg <= 0) return toast.error("Enter the parcel weight in kg");
    start(async () => {
      const res = await bookShipment(orderId, {
        provider,
        weightKg,
        warehouseId: warehouseId || undefined,
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
      const res = await refreshTracking(orderId);
      if (res.ok) { toast.success(res.status ? `Status: ${res.status}` : "Tracking refreshed"); router.refresh(); }
      else toast.error(res.error ?? "Could not refresh");
    });
  }

  function cancel() {
    if (!confirm("Cancel this shipment? The AWB will be released.")) return;
    start(async () => {
      const res = await cancelShipment(orderId);
      if (res.ok) { toast.success("Shipment cancelled"); router.refresh(); }
      else toast.error(res.error ?? "Could not cancel");
    });
  }

  if (booked) {
    return (
      <div className="space-y-2 text-sm">
        <div className="rounded-md bg-secondary/50 p-2">
          <div className="font-medium">{courier || "Shipment"}</div>
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
        Book this order — the AWB, tracking and label are created automatically.
      </p>
      {available.length > 1 && (
        <div>
          <Label className="mb-1 block text-xs">Carrier</Label>
          <select
            value={provider}
            onChange={(e) => onProviderChange(e.target.value as ShippingProvider)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {available.map((p) => (
              <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
            ))}
          </select>
        </div>
      )}
      {warehouses.length > 0 && (
        <div>
          <Label className="mb-1 block text-xs">Pickup branch</Label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.label}</option>
            ))}
          </select>
        </div>
      )}
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
        <Truck className="h-4 w-4" /> {pending ? "Booking…" : `Book with ${PROVIDER_LABELS[provider]}`}
      </Button>
    </div>
  );
}
