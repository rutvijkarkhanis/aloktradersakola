"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Star, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/sonner";
import { INDIAN_STATES } from "@/lib/constants";
import type { Address } from "@/lib/types/database";

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("addresses").select("*").order("is_default", { ascending: false });
    setAddresses((data as Address[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const makeDefault = addresses.length === 0 || fd.get("is_default") === "on";
    if (makeDefault) await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    const { error } = await supabase.from("addresses").insert({
      user_id: user.id,
      full_name: String(fd.get("full_name")), mobile: String(fd.get("mobile")),
      email: String(fd.get("email") || "") || null,
      address_line: String(fd.get("address_line")), area: String(fd.get("area") || "") || null,
      city: String(fd.get("city")), state: String(fd.get("state")), pincode: String(fd.get("pincode")),
      landmark: String(fd.get("landmark") || "") || null, is_default: makeDefault,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Address added");
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    const supabase = createClient();
    await supabase.from("addresses").delete().eq("id", id);
    toast.success("Address removed");
    load();
  }

  async function setDefault(id: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Addresses</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="brand"><Plus className="h-4 w-4" /> Add address</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add new address</DialogTitle></DialogHeader>
            <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
              <F label="Full name"><Input name="full_name" required /></F>
              <F label="Mobile"><Input name="mobile" required inputMode="numeric" /></F>
              <F label="Email" full><Input name="email" type="email" /></F>
              <F label="Address" full><Input name="address_line" required /></F>
              <F label="Area"><Input name="area" /></F>
              <F label="City"><Input name="city" required /></F>
              <F label="State">
                <select name="state" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Select</option>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </F>
              <F label="Pincode"><Input name="pincode" required inputMode="numeric" /></F>
              <F label="Landmark" full><Input name="landmark" /></F>
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" name="is_default" /> Set as default address
              </label>
              <DialogFooter className="col-span-2">
                <Button type="submit" variant="brand" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save address
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="mt-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : addresses.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-lg border border-dashed py-16 text-center">
          <MapPin className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No saved addresses yet.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <div key={a.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between">
                <p className="font-semibold">{a.full_name}</p>
                {a.is_default && <Badge variant="brand">Default</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {a.mobile}<br />{a.address_line}{a.area ? `, ${a.area}` : ""}<br />
                {a.city}, {a.state} — {a.pincode}
              </p>
              <div className="mt-3 flex gap-2">
                {!a.is_default && (
                  <Button size="sm" variant="outline" onClick={() => setDefault(a.id)}><Star className="h-3.5 w-3.5" /> Set default</Button>
                )}
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(a.id)}><Trash2 className="h-3.5 w-3.5" /> Remove</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function F({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <Label className="mb-1 block text-xs">{label}</Label>
      {children}
    </div>
  );
}
