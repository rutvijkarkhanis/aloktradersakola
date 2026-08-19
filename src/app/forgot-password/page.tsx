"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/sonner";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(String(fd.get("email")), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
  }

  return (
    <div className="container-wide flex justify-center py-16">
      <div className="w-full max-w-md rounded-lg border bg-card p-6">
        {sent ? (
          <div className="text-center">
            <MailCheck className="mx-auto h-10 w-10 text-success" />
            <h1 className="mt-3 text-xl font-bold">Reset link sent</h1>
            <p className="mt-1 text-sm text-muted-foreground">Check your email for a link to reset your password.</p>
            <Button asChild className="mt-6" variant="outline"><Link href="/login">Back to login</Link></Button>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold">Reset password</h1>
            <p className="mt-1 text-sm text-muted-foreground">Enter your email and we&apos;ll send a reset link.</p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <Button type="submit" variant="brand" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Send reset link
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
