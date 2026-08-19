"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { updateOrderStatus } from "@/app/actions/admin";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, COD_STATUSES } from "@/lib/constants";

export function OrderStatusControl({
  orderId, current, currentCod, isCod,
}: {
  orderId: string; current: string; currentCod: string; isCod: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(current);
  const [cod, setCod] = useState(currentCod);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const res = await updateOrderStatus(orderId, status, isCod ? cod : undefined);
      if (res.ok) { toast.success("Order updated"); router.refresh(); }
      else toast.error(res.error ?? "Failed");
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium">Order status</label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{ORDER_STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {isCod && (
        <div>
          <label className="mb-1 block text-xs font-medium">COD status</label>
          <Select value={cod} onValueChange={setCod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {COD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replaceAll("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <Button onClick={save} variant="brand" className="w-full" disabled={pending}>Update order</Button>
    </div>
  );
}
