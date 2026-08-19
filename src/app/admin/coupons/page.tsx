"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";
import { createClient } from "@/lib/supabase/client";
import { upsertCoupon, deleteCoupon } from "@/app/actions/admin";
import { formatINR, formatDate } from "@/lib/utils";
import type { Coupon } from "@/lib/types/database";

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<"PERCENT" | "FIXED">("PERCENT");

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    setCoupons((data as Coupon[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const res = await upsertCoupon({
      code: String(fd.get("code")), discount_type: type,
      discount_value: Number(fd.get("discount_value")),
      min_order_amount: Number(fd.get("min_order_amount") || 0),
      max_discount_amount: fd.get("max_discount_amount") ? Number(fd.get("max_discount_amount")) : null,
      expires_at: fd.get("expires_at") ? String(fd.get("expires_at")) : null,
      usage_limit: fd.get("usage_limit") ? Number(fd.get("usage_limit")) : null,
      is_active: true,
    });
    setSaving(false);
    if (res.ok) { toast.success("Coupon saved"); setOpen(false); load(); }
    else toast.error(res.error ?? "Failed");
  }

  async function remove(id: string) {
    const res = await deleteCoupon(id);
    if (res.ok) { toast.success("Deleted"); load(); }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Coupons</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="brand"><Plus className="h-4 w-4" /> Add coupon</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New coupon</DialogTitle></DialogHeader>
            <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
              <F label="Code"><Input name="code" required placeholder="SAVE10" /></F>
              <F label="Type">
                <select value={type} onChange={(e) => setType(e.target.value as any)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="PERCENT">Percentage</option>
                  <option value="FIXED">Fixed (₹)</option>
                </select>
              </F>
              <F label={type === "PERCENT" ? "Discount %" : "Discount ₹"}><Input name="discount_value" type="number" min={0} required /></F>
              <F label="Min order ₹"><Input name="min_order_amount" type="number" min={0} defaultValue={0} /></F>
              <F label="Max discount ₹ (optional)"><Input name="max_discount_amount" type="number" min={0} /></F>
              <F label="Usage limit (optional)"><Input name="usage_limit" type="number" min={0} /></F>
              <F label="Expires (optional)" full><Input name="expires_at" type="date" /></F>
              <DialogFooter className="col-span-2">
                <Button type="submit" variant="brand" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="mt-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : coupons.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-lg border border-dashed py-16 text-center">
          <Ticket className="h-10 w-10 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">No coupons yet.</p>
        </div>
      ) : (
        <div className="mt-5 rounded-lg border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Discount</TableHead><TableHead>Min order</TableHead><TableHead>Used</TableHead><TableHead>Expires</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {coupons.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-semibold">{c.code}</TableCell>
                  <TableCell>{c.discount_type === "PERCENT" ? `${c.discount_value}%` : formatINR(c.discount_value)}</TableCell>
                  <TableCell>{formatINR(c.min_order_amount)}</TableCell>
                  <TableCell>{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</TableCell>
                  <TableCell className="text-xs">{c.expires_at ? formatDate(c.expires_at) : "—"}</TableCell>
                  <TableCell>{c.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Off</Badge>}</TableCell>
                  <TableCell className="text-right"><Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function F({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={full ? "sm:col-span-2" : ""}><Label className="mb-1 block text-xs">{label}</Label>{children}</div>;
}
