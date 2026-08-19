import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles email-confirmation and OAuth code exchange.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect") || "/account";

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}${redirect}`);
}
