import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/settings";
import { isRazorpayConfigured } from "@/lib/razorpay";
import { CheckoutClient } from "@/components/checkout/checkout-client";

export const metadata: Metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [settings, addressesRes] = await Promise.all([
    getSiteSettings(),
    user
      ? supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
  ]);

  return (
    <div className="container-wide py-8">
      <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
      <CheckoutClient
        settings={settings}
        savedAddresses={(addressesRes.data as any[]) ?? []}
        loggedIn={!!user}
        defaultEmail={user?.email ?? ""}
        razorpayLive={isRazorpayConfigured()}
      />
    </div>
  );
}
