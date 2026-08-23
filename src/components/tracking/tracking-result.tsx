"use client";

import { Package, CheckCircle2, ExternalLink } from "lucide-react";
import type { TrackingResult } from "@/app/actions/tracking";

/** Presentational view of a tracking result (shared by public + account pages). */
export function TrackingResultView({ result }: { result: Extract<TrackingResult, { ok: true }> }) {
  const { orderNumber, orderStatus, courier, awb, trackingUrl, live } = result;
  const history = live?.history ?? [];

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Order</p>
          <p className="font-mono text-sm font-semibold">{orderNumber}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand">
          <Package className="h-4 w-4" />
          {live?.status || orderStatus}
        </span>
      </div>

      {(courier || awb) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {courier && <span><span className="text-muted-foreground">Courier:</span> {courier}</span>}
          {awb && <span><span className="text-muted-foreground">AWB:</span> <span className="font-mono">{awb}</span></span>}
          {trackingUrl && (
            <a href={trackingUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-brand hover:underline">
              Courier page <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {history.length > 0 ? (
        <ol className="mt-5 space-y-4 border-l pl-4">
          {history.map((h, i) => (
            <li key={i} className="relative">
              <span className={`absolute -left-[22px] top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full ${i === 0 ? "bg-brand" : "bg-muted-foreground/40"}`}>
                {i === 0 && <CheckCircle2 className="h-3.5 w-3.5 text-brand-foreground" />}
              </span>
              <p className="text-sm font-medium">{h.status}</p>
              {h.message && <p className="text-xs text-muted-foreground">{h.message}</p>}
              {h.at && <p className="text-[11px] text-muted-foreground">{new Date(h.at).toLocaleString("en-IN")}</p>}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          {awb ? "Your shipment is booked. Detailed checkpoints will appear here as it moves." : "Your order is being prepared. Tracking details will appear once it ships."}
        </p>
      )}
    </div>
  );
}
