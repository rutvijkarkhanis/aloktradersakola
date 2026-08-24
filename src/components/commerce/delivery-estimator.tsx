"use client";

import { useEffect, useState, useTransition } from "react";
import { Truck, MapPin, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { estimateDelivery, type DeliveryEstimate } from "@/app/actions/delivery";
import { formatINR } from "@/lib/utils";

const PIN_KEY = "ata_pincode";

/**
 * "Check delivery to your pincode" — shows a live courier estimate (or the
 * store's standard estimate) before the customer commits. Used on the product
 * and cart pages.
 */
export function DeliveryEstimator({
  items,
  className = "",
}: {
  items: { productId: string; quantity: number }[];
  className?: string;
}) {
  const [pincode, setPincode] = useState("");
  const [result, setResult] = useState<DeliveryEstimate | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PIN_KEY);
      if (saved) setPincode(saved);
    } catch { /* ignore */ }
  }, []);

  function check(e?: React.FormEvent) {
    e?.preventDefault();
    const pin = pincode.replace(/[^0-9]/g, "").slice(0, 6);
    if (pin.length !== 6) {
      setResult({ ok: false, error: "Enter a valid 6-digit pincode." });
      return;
    }
    try { localStorage.setItem(PIN_KEY, pin); } catch { /* ignore */ }
    start(async () => setResult(await estimateDelivery({ pincode: pin, items })));
  }

  return (
    <div className={`rounded-lg border bg-secondary/30 p-3 ${className}`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <Truck className="h-4 w-4 text-brand" /> Check delivery &amp; time
      </div>
      <form onSubmit={check} className="mt-2 flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="Enter 6-digit pincode"
            aria-label="Delivery pincode"
            className="h-9 pl-8"
          />
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={pending} className="shrink-0">
          {pending ? "Checking…" : "Check"}
        </Button>
      </form>

      {result && !result.ok && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" /> {result.error}
        </p>
      )}

      {result && result.ok && (
        <div className="mt-2 text-sm">
          {result.serviceable ? (
            <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
              <span className="font-medium">
                Delivery to {result.pincode}:{" "}
                {result.amount > 0 ? formatINR(result.amount) : "Free"}
              </span>
              {result.courier && <span className="text-xs text-muted-foreground">via {result.courier}</span>}
            </p>
          ) : (
            <p className="flex items-start gap-1.5 text-warning">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="text-xs">{result.note}</span>
            </p>
          )}
          {result.serviceable && result.note && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{result.note}</p>
          )}
          {result.serviceable && result.approximate && !result.note && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Estimate — the exact charge is confirmed at checkout.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
