"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/sonner";
import type { Profile } from "@/lib/types/database";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: String(fd.get("full_name")), phone: String(fd.get("phone")) })
      .eq("id", profile.id);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" name="full_name" defaultValue={profile.full_name ?? ""} />
      </div>
      <div>
        <Label htmlFor="phone">Mobile</Label>
        <Input id="phone" name="phone" defaultValue={profile.phone ?? ""} inputMode="numeric" />
      </div>
      <div>
        <Label>Email</Label>
        <Input value={profile.email ?? ""} disabled />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" variant="brand" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
        </Button>
      </div>
    </form>
  );
}
