"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ShieldCheck, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { useCart } from "@/lib/store/cart";
import { formatINR, cn } from "@/lib/utils";
import { computeTotalsWithDiscount, perProductDelivery } from "@/lib/pricing";
import { INDIAN_STATES } from "@/lib/constants";
import { createOrder, validateCoupon, verifyPayment, confirmTestPayment } from "@/app/actions/orders";
import type { SiteSettings, Address } from "@/lib/types/database";

declare global {
  interface Window { Razorpay: any }
}

const addressSchema = z.object({
  full_name: z.string().min(2, "Enter your name"),
  mobile: z.string().regex(/^[0-9]{10}$/, "Enter a valid 10-digit mobile"),
  email: z.string().email("Enter a valid email").or(z.literal("")),
  address_line: z.string().min(4, "Enter your address"),
  area: z.string().optional(),
  city: z.string().min(2, "Enter your city"),
  state: z.string().min(2, "Select your state"),
  pincode: z.string().regex(/^[0-9]{6}$/, "Enter a valid 6-digit pincode"),
  landmark: z.string().optional(),
  notes: z.string().optional(),
});
type AddressForm = z.infer<typeof addressSchema>;

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function CheckoutClient({
  settings, savedAddresses, loggedIn, defaultEmail, razorpayLive,
}: {
  settings: SiteSettings;
  savedAddresses: Address[];
  loggedIn: boolean;
  defaultEmail: string;
  razorpayLive: boolean;
}) {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const clear = useCart((s) => s.clear);

  const [paymentType, setPaymentType] = useState<"FULL_PAYMENT" | "ADVANCE_50_COD_50">("FULL_PAYMENT");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [saveAddress, setSaveAddress] = useState(loggedIn);
  const [submitting, setSubmitting] = useState(false);

  const defaultAddr = savedAddresses.find((a) => a.is_default) ?? savedAddresses[0];

  const form = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      full_name: defaultAddr?.full_name ?? "",
      mobile: defaultAddr?.mobile ?? "",
      email: defaultAddr?.email ?? defaultEmail ?? "",
      address_line: defaultAddr?.address_line ?? "",
      area: defaultAddr?.area ?? "",
      city: defaultAddr?.city ?? "",
      state: defaultAddr?.state ?? "",
      pincode: defaultAddr?.pincode ?? "",
      landmark: defaultAddr?.landmark ?? "",
      notes: "",
    },
  });

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + (l.salePrice && l.salePrice < l.price ? l.salePrice : l.price) * l.quantity, 0),
    [lines],
  );
  const delivery = useMemo(
    () => perProductDelivery(lines.map((l) => ({ delivery_charge: l.deliveryCharge, quantity: l.quantity }))),
    [lines],
  );
  const totals = useMemo(
    () =>
      computeTotalsWithDiscount(
        subtotal,
        coupon?.discount ?? 0,
        settings,
        paymentType,
        delivery > 0 ? delivery : undefined,
      ),
    [subtotal, coupon, settings, paymentType, delivery],
  );

  useEffect(() => {
    if (lines.length === 0 && !submitting) router.replace("/cart");
  }, [lines.length, submitting, router]);

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    const res = await validateCoupon(couponInput, subtotal);
    if (res.ok) {
      setCoupon({ code: res.code, discount: res.discount });
      setCouponMsg(`Coupon ${res.code} applied — you save ${formatINR(res.discount)}`);
    } else {
      setCoupon(null);
      setCouponMsg(res.error);
    }
  }

  async function onSubmit(values: AddressForm) {
    if (lines.length === 0) return;
    setSubmitting(true);
    try {
      const result = await createOrder({
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        paymentType,
        couponCode: coupon?.code,
        address: {
          full_name: values.full_name, mobile: values.mobile, email: values.email,
          address_line: values.address_line, area: values.area, city: values.city,
          state: values.state, pincode: values.pincode, landmark: values.landmark,
        },
        notes: values.notes,
        saveAddress,
      });

      if (!result.ok) {
        toast.error(result.error);
        setSubmitting(false);
        return;
      }

      if (result.testMode) {
        // No live gateway configured — real order exists; confirm in test mode.
        const confirm = await confirmTestPayment(result.orderId);
        if (confirm.ok) {
          clear();
          toast.success("Order placed (test mode)");
          router.push(`/checkout/success?order=${encodeURIComponent(result.orderNumber)}&id=${result.orderId}`);
        } else {
          toast.error(confirm.error ?? "Could not confirm test payment.");
          setSubmitting(false);
        }
        return;
      }

      // Live Razorpay
      const loaded = await loadRazorpay();
      if (!loaded) {
        toast.error("Could not load payment gateway. Please try again.");
        setSubmitting(false);
        return;
      }
      const rzp = new window.Razorpay({
        key: result.razorpayKeyId,
        order_id: result.razorpayOrderId,
        amount: Math.round(result.amountToPay * 100),
        currency: "INR",
        name: settings.business_name,
        description: `Order ${result.orderNumber}`,
        prefill: { name: values.full_name, email: values.email, contact: values.mobile },
        notes: { order_id: result.orderId },
        theme: { color: "#c86a1f" },
        handler: async (resp: any) => {
          const verify = await verifyPayment({
            orderId: result.orderId,
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          });
          if (verify.ok) {
            clear();
            toast.success("Payment successful");
            router.push(`/checkout/success?order=${encodeURIComponent(result.orderNumber)}&id=${result.orderId}`);
          } else {
            toast.error(verify.error ?? "Payment verification failed.");
            router.push(`/checkout/success?order=${encodeURIComponent(result.orderNumber)}&id=${result.orderId}&pending=1`);
          }
        },
        modal: { ondismiss: () => setSubmitting(false) },
      });
      rzp.on("payment.failed", () => {
        toast.error("Payment failed. You can retry from your orders.");
        setSubmitting(false);
      });
      rzp.open();
    } catch (e) {
      toast.error("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (lines.length === 0) return null;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 grid gap-8 lg:grid-cols-3">
      {/* Left: details */}
      <div className="space-y-6 lg:col-span-2">
        <section className="rounded-lg border bg-card p-5">
          <h2 className="font-semibold">Delivery Details</h2>
          {!loggedIn && (
            <p className="mt-1 text-xs text-muted-foreground">
              Checking out as guest. <Link href="/login?redirect=/checkout" className="text-brand underline">Log in</Link> to save addresses & track orders.
            </p>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Full name" error={form.formState.errors.full_name?.message}>
              <Input {...form.register("full_name")} />
            </Field>
            <Field label="Mobile number" error={form.formState.errors.mobile?.message}>
              <Input {...form.register("mobile")} placeholder="10-digit mobile" inputMode="numeric" />
            </Field>
            <Field label="Email" error={form.formState.errors.email?.message}>
              <Input {...form.register("email")} placeholder="you@example.com" />
            </Field>
            <Field label="Pincode" error={form.formState.errors.pincode?.message}>
              <Input {...form.register("pincode")} inputMode="numeric" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Address" error={form.formState.errors.address_line?.message}>
                <Input {...form.register("address_line")} placeholder="House / building, street" />
              </Field>
            </div>
            <Field label="Area / Locality">
              <Input {...form.register("area")} />
            </Field>
            <Field label="City" error={form.formState.errors.city?.message}>
              <Input {...form.register("city")} />
            </Field>
            <Field label="State" error={form.formState.errors.state?.message}>
              <select
                {...form.register("state")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select state</option>
                {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Landmark (optional)">
              <Input {...form.register("landmark")} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Order notes (optional)">
                <Textarea {...form.register("notes")} placeholder="Delivery instructions, event date, etc." />
              </Field>
            </div>
          </div>
          {loggedIn && (
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
              Save this address for future orders
            </label>
          )}
        </section>

        {/* Payment options */}
        <section className="rounded-lg border bg-card p-5">
          <h2 className="font-semibold">Payment Option</h2>
          <RadioGroup
            className="mt-4 gap-3"
            value={paymentType}
            onValueChange={(v) => setPaymentType(v as any)}
          >
            <PaymentOption
              value="FULL_PAYMENT"
              active={paymentType === "FULL_PAYMENT"}
              title="Pay Full Amount Online"
              desc="Pay 100% now via Razorpay. No cash on delivery."
              now={totals.total}
              cod={0}
            />
            <PaymentOption
              value="ADVANCE_50_COD_50"
              active={paymentType === "ADVANCE_50_COD_50"}
              title={`Pay ${settings.advance_percentage}% Advance + Balance on Delivery`}
              desc={`Pay ${settings.advance_percentage}% now to confirm; pay the rest as cash/UPI on delivery.`}
              now={totals.advance_required}
              cod={totals.cod_amount}
            />
          </RadioGroup>
        </section>
      </div>

      {/* Right: summary */}
      <div>
        <div className="sticky top-28 space-y-4 rounded-lg border bg-card p-5">
          <h2 className="font-semibold">Order Summary</h2>
          <ul className="space-y-2 text-sm">
            {lines.map((l) => {
              const unit = l.salePrice && l.salePrice < l.price ? l.salePrice : l.price;
              return (
                <li key={l.productId} className="flex justify-between gap-2">
                  <span className="min-w-0 truncate text-muted-foreground">{l.name} × {l.quantity}</span>
                  <span className="shrink-0 font-medium">{formatINR(unit * l.quantity)}</span>
                </li>
              );
            })}
          </ul>
          <Separator />

          {/* Coupon */}
          <div>
            <Label className="text-xs">Coupon code</Label>
            <div className="mt-1 flex gap-2">
              <Input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="ENTER CODE" />
              <Button type="button" variant="outline" onClick={applyCoupon}><Tag className="h-4 w-4" /></Button>
            </div>
            {couponMsg && (
              <p className={cn("mt-1 text-xs", coupon ? "text-success" : "text-destructive")}>{couponMsg}</p>
            )}
          </div>

          <Separator />
          <dl className="space-y-1.5 text-sm">
            <Row label="Subtotal" value={formatINR(totals.subtotal)} />
            {totals.discount > 0 && <Row label="Discount" value={`− ${formatINR(totals.discount)}`} accent />}
            <Row label="Delivery" value={totals.delivery_charge > 0 ? formatINR(totals.delivery_charge) : "Free"} />
            {settings.tax_enabled && totals.tax > 0 && <Row label={`${settings.tax_label} (${settings.tax_rate}%)`} value={formatINR(totals.tax)} />}
          </dl>
          <Separator />
          <div className="flex justify-between text-base font-bold">
            <span>Order Total</span><span>{formatINR(totals.total)}</span>
          </div>

          {/* Advance / COD split */}
          <div className="rounded-md bg-accent/40 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pay now</span>
              <span className="font-semibold text-brand">
                {formatINR(paymentType === "FULL_PAYMENT" ? totals.total : totals.advance_required)}
              </span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Pay on delivery (COD)</span>
              <span className="font-semibold">{formatINR(paymentType === "FULL_PAYMENT" ? 0 : totals.cod_amount)}</span>
            </div>
          </div>

          {!razorpayLive && (
            <Badge variant="warning" className="w-full justify-center">Test mode — no live gateway configured</Badge>
          )}
          <Button type="submit" variant="brand" size="lg" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {paymentType === "FULL_PAYMENT"
              ? `Pay ${formatINR(totals.total)}`
              : `Pay ${formatINR(totals.advance_required)} Advance`}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            Secure payment via Razorpay. By placing the order you agree to our{" "}
            <Link href="/terms" className="underline">Terms</Link>.
          </p>
        </div>
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block text-xs">{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-medium", accent && "text-success")}>{value}</dd>
    </div>
  );
}

function PaymentOption({
  value, active, title, desc, now, cod,
}: {
  value: string; active: boolean; title: string; desc: string; now: number; cod: number;
}) {
  return (
    <label className={cn("flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors", active ? "border-brand bg-accent/40" : "hover:bg-secondary")}>
      <RadioGroupItem value={value} className="mt-0.5" />
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
        <div className="mt-2 flex gap-4 text-xs">
          <span>Pay now: <strong className="text-brand">{formatINR(now)}</strong></span>
          <span>COD: <strong>{formatINR(cod)}</strong></span>
        </div>
      </div>
    </label>
  );
}
