import "server-only";
import { formatINR } from "@/lib/utils";

/**
 * Transactional email via Resend (https://resend.com). Env-gated: if
 * RESEND_API_KEY is unset the functions no-op (log only), so the app runs fine
 * without email configured. All sends are best-effort and never throw into the
 * caller (a failed email must not fail an order).
 *
 * Env:
 *   RESEND_API_KEY            - Resend API key (server only)
 *   EMAIL_FROM                - e.g. "Alok Traders Akola <orders@yourdomain.com>"
 *   ADMIN_NOTIFICATION_EMAIL  - where new-order / enquiry alerts go
 */
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "Alok Traders Akola <onboarding@resend.dev>";
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || "";

export function isEmailConfigured() {
  return Boolean(RESEND_API_KEY);
}

async function send(to: string | string[], subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.log(`[email disabled] would send "${subject}" to`, to);
    return { ok: false, skipped: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: EMAIL_FROM, to: Array.isArray(to) ? to : [to], subject, html }),
    });
    if (!res.ok) {
      console.error("Resend send failed", res.status, await res.text());
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error("Resend send error", e);
    return { ok: false };
  }
}

const wrap = (title: string, body: string) => `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1a1614">
    <div style="background:#1a1614;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0">
      <strong style="font-size:16px">Alok Traders Akola</strong>
      <div style="font-size:12px;opacity:.8">Fabrication &amp; Event Decor</div>
    </div>
    <div style="border:1px solid #eee;border-top:0;padding:20px;border-radius:0 0 8px 8px">
      <h2 style="margin:0 0 12px;font-size:18px">${title}</h2>
      ${body}
    </div>
    <p style="font-size:11px;color:#999;text-align:center;margin-top:12px">This is an automated message from Alok Traders Akola.</p>
  </div>`;

type OrderEmail = {
  order_number: string;
  total_amount: number;
  advance_paid: number;
  cod_amount: number;
  payment_type: string;
  contact_email?: string | null;
  contact_mobile?: string | null;
  items?: { product_name: string; quantity: number; line_total: number }[];
};

export async function sendOrderConfirmation(order: OrderEmail) {
  if (!order.contact_email) return;
  const rows = (order.items ?? [])
    .map(
      (i) =>
        `<tr><td style="padding:4px 0">${i.product_name} x ${i.quantity}</td><td style="padding:4px 0;text-align:right">${formatINR(i.line_total)}</td></tr>`,
    )
    .join("");
  const split =
    order.payment_type === "ADVANCE_50_COD_50"
      ? `<p>Paid now: <strong>${formatINR(order.advance_paid)}</strong><br/>Balance on delivery (COD): <strong>${formatINR(order.cod_amount)}</strong></p>`
      : `<p>Paid: <strong>${formatINR(order.advance_paid)}</strong> (full payment)</p>`;
  const html = wrap(
    "Your order is confirmed",
    `<p>Thank you for your order <strong>${order.order_number}</strong>.</p>
     <table style="width:100%;border-collapse:collapse;font-size:14px;margin:8px 0">${rows}</table>
     <p style="border-top:1px solid #eee;padding-top:8px">Order total: <strong>${formatINR(order.total_amount)}</strong></p>
     ${split}
     <p>We'll notify you as your order progresses. You can track it anytime in your account.</p>`,
  );
  await send(order.contact_email, `Order confirmed - ${order.order_number}`, html);
}

export async function sendAdminNewOrder(order: OrderEmail) {
  if (!ADMIN_EMAIL) return;
  const html = wrap(
    "New order received",
    `<p><strong>${order.order_number}</strong> - ${formatINR(order.total_amount)}</p>
     <p>Paid now: ${formatINR(order.advance_paid)} ${order.payment_type === "ADVANCE_50_COD_50" ? `(COD balance ${formatINR(order.cod_amount)})` : "(full)"}</p>
     <p>Contact: ${order.contact_mobile ?? "-"} ${order.contact_email ? `/ ${order.contact_email}` : ""}</p>
     <p>Open the admin dashboard to process it.</p>`,
  );
  await send(ADMIN_EMAIL, `New order ${order.order_number} - ${formatINR(order.total_amount)}`, html);
}

export async function sendAdminFabricationEnquiry(req: {
  request_number: string;
  name: string;
  phone: string;
  product_required?: string | null;
  event_type?: string | null;
}) {
  if (!ADMIN_EMAIL) return;
  const html = wrap(
    "New custom fabrication enquiry",
    `<p><strong>${req.request_number}</strong></p>
     <p>Name: ${req.name}<br/>Phone: ${req.phone}<br/>
     Product: ${req.product_required ?? "-"}<br/>Event: ${req.event_type ?? "-"}</p>
     <p>Open the admin dashboard (Fabrication Enquiries) to respond.</p>`,
  );
  await send(ADMIN_EMAIL, `New enquiry ${req.request_number} - ${req.name}`, html);
}
