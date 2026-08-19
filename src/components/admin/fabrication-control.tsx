"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { updateFabricationStatus } from "@/app/actions/admin";
import { FABRICATION_STATUSES, FABRICATION_STATUS_LABELS } from "@/lib/constants";

export function FabricationControl({ id, current, notes }: { id: string; current: string; notes: string | null }) {
  const router = useRouter();
  const [status, setStatus] = useState(current);
  const [note, setNote] = useState(notes ?? "");
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const res = await updateFabricationStatus(id, status, note);
      if (res.ok) { toast.success("Enquiry updated"); router.refresh(); }
      else toast.error(res.error ?? "Failed");
    });
  }

  return (
    <div className="space-y-2">
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          {FABRICATION_STATUSES.map((s) => <SelectItem key={s} value={s}>{FABRICATION_STATUS_LABELS[s]}</SelectItem>)}
        </SelectContent>
      </Select>
      <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Admin notes / quote" rows={2} />
      <Button size="sm" variant="brand" onClick={save} disabled={pending} className="w-full">Save</Button>
    </div>
  );
}
