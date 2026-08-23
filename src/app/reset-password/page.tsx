"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/sonner";

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password"));
    if (password.length < 6) return toast.error("Password must be at least 6 characters.");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }
    toast.success("Password updated");
    window.location.assign("/account");
  }

  return (
    <div className="container-wide flex justify-center py-16">
      <div className="w-full max-w-md rounded-lg border bg-card p-6">
        <h1 className="text-xl font-bold">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter a new password for your account.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="password">New password</Label>
            <PasswordInput id="password" name="password" required minLength={6} autoComplete="new-password" />
          </div>
          <Button type="submit" variant="brand" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Update password
          </Button>
        </form>
      </div>
    </div>
  );
}
