"use client";

import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackByOrder, type TrackingResult } from "@/app/actions/tracking";
import { TrackingResultView } from "@/components/tracking/tracking-result";

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [contact, setContact] = useState("");
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => setResult(await trackByOrder({ orderNumber, contact })));
  }

  return (
    <div className="container-wide max-w-xl py-10">
      <h1 className="text-2xl font-bold">Track your order</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your order number and the phone number or email you used at checkout.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <Label className="mb-1 block text-sm">Order number</Label>
          <Input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="e.g. ATA-2026-000123" required />
        </div>
        <div>
          <Label className="mb-1 block text-sm">Phone or email</Label>
          <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone number or email used on the order" required />
        </div>
        <Button type="submit" variant="brand" disabled={pending} className="w-full sm:w-auto">
          <Search className="h-4 w-4" /> {pending ? "Checking…" : "Track order"}
        </Button>
      </form>

      <div className="mt-6">
        {result && !result.ok && (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {result.error}
          </p>
        )}
        {result && result.ok && <TrackingResultView result={result} />}
      </div>
    </div>
  );
}
