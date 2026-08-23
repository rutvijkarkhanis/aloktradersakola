"use client";

import { useEffect, useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackOwnedOrder, type TrackingResult } from "@/app/actions/tracking";
import { TrackingResultView } from "@/components/tracking/tracking-result";

/** Live shipment tracking for an order the signed-in customer owns. */
export function OwnedOrderTracking({ orderId }: { orderId: string }) {
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [pending, start] = useTransition();

  const load = () => start(async () => setResult(await trackOwnedOrder(orderId)));
  useEffect(load, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!result) {
    return <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">Loading tracking…</div>;
  }
  if (!result.ok) {
    return <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">{result.error}</div>;
  }
  return (
    <div>
      <TrackingResultView result={result} />
      <Button size="sm" variant="ghost" onClick={load} disabled={pending} className="mt-2">
        <RefreshCw className="h-3.5 w-3.5" /> {pending ? "Refreshing…" : "Refresh status"}
      </Button>
    </div>
  );
}
