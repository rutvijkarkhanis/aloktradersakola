"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { setReviewApproved } from "@/app/actions/admin";

export function ReviewActions({ id, approved }: { id: string; approved: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function set(v: boolean) {
    start(async () => {
      const res = await setReviewApproved(id, v);
      if (res.ok) { toast.success(v ? "Approved" : "Hidden"); router.refresh(); }
      else toast.error(res.error ?? "Failed");
    });
  }
  return (
    <div className="flex gap-2">
      {!approved && <Button size="sm" variant="success" onClick={() => set(true)} disabled={pending}><Check className="h-4 w-4" /> Approve</Button>}
      {approved && <Button size="sm" variant="outline" onClick={() => set(false)} disabled={pending}><X className="h-4 w-4" /> Hide</Button>}
    </div>
  );
}
