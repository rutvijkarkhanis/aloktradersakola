"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { setProductActive, deleteProduct } from "@/app/actions/admin";

export function ProductActions({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [active, setActive] = useState(isActive);

  function toggle() {
    start(async () => {
      const res = await setProductActive(id, !active);
      if (res.ok) { setActive(!active); toast.success(!active ? "Product enabled" : "Product disabled"); }
      else toast.error(res.error ?? "Failed");
    });
  }
  function remove() {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    start(async () => {
      const res = await deleteProduct(id);
      if (res.ok) { toast.success("Product deleted"); router.refresh(); }
      else toast.error(res.error ?? "Failed");
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button asChild size="icon" variant="ghost" className="h-8 w-8"><Link href={`/admin/products/${id}/edit`}><Pencil className="h-4 w-4" /></Link></Button>
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={toggle} disabled={pending} title={active ? "Disable" : "Enable"}>
        {active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={remove} disabled={pending}><Trash2 className="h-4 w-4" /></Button>
    </div>
  );
}
