import "server-only";

/**
 * Big Ship shipping-aggregator client (Big Ship dispatches via Delhivery).
 *
 * SCAFFOLD — the exact endpoints, auth scheme and field names are filled in
 * from the Big Ship API docs once they enable API access on the account.
 * Everything here is env-gated: with no credentials set, isBigshipConfigured()
 * is false and nothing calls out, so the app runs exactly as today (manual
 * AWB paste). No behaviour changes until the endpoints below are completed and
 * wired into the order flow.
 *
 * Env (add in Vercel once obtained — all server-side secrets):
 *   BIGSHIP_BASE_URL     - API base, e.g. https://api.bigship.in
 *   BIGSHIP_API_KEY      - static API key/token  (if key-based auth)
 *   BIGSHIP_EMAIL        - login email           (if login-based auth)
 *   BIGSHIP_PASSWORD     - login password        (if login-based auth)
 *   BIGSHIP_WAREHOUSE_ID - pickup warehouse id to ship from
 */
const BASE_URL = process.env.BIGSHIP_BASE_URL || "";
const API_KEY = process.env.BIGSHIP_API_KEY || "";
const EMAIL = process.env.BIGSHIP_EMAIL || "";
const PASSWORD = process.env.BIGSHIP_PASSWORD || "";
const WAREHOUSE_ID = process.env.BIGSHIP_WAREHOUSE_ID || "";

export function isBigshipConfigured(): boolean {
  return Boolean(BASE_URL && (API_KEY || (EMAIL && PASSWORD)));
}

export type BigshipBooking = {
  awb: string;
  bigshipOrderId: string;
  labelUrl?: string;
  courier?: string; // usually "Delhivery"
};

export type BigshipStatus = {
  awb: string;
  status: string; // normalised courier status, e.g. "In-Transit"
  trackingUrl?: string;
  history?: { status: string; at: string; location?: string }[];
};

/**
 * Obtain an auth token. Some aggregators use a static API key (no call
 * needed); others require a login exchange. Completed from the docs.
 */
async function getToken(): Promise<string> {
  if (API_KEY) return API_KEY;
  // TODO(bigship-docs): POST {BASE_URL}/<login endpoint> {email,password} -> { token }
  throw new Error("Big Ship login-based auth not yet configured.");
}

/**
 * Book a shipment for a paid order and return the AWB.
 * TODO(bigship-docs): map our order/address/items to Big Ship's create-order
 * payload; use WAREHOUSE_ID as the pickup; return awb + bigshipOrderId + label.
 */
export async function bookShipment(_params: {
  orderNumber: string;
  paymentMode: "PREPAID" | "COD";
  codAmount: number;
  declaredValue: number;
  weightKg: number;
  dimensionsCm?: { l: number; b: number; h: number };
  consignee: {
    name: string; mobile: string; email?: string;
    address: string; city: string; state: string; pincode: string;
  };
  items: { name: string; quantity: number; unitPrice: number; sku?: string }[];
}): Promise<BigshipBooking> {
  await getToken();
  void WAREHOUSE_ID;
  throw new Error("bookShipment not yet implemented — awaiting Big Ship API docs.");
}

/**
 * Fetch live status for an AWB (used by a poll or a manual refresh).
 * TODO(bigship-docs): GET {BASE_URL}/<track endpoint>?awb=... -> status + history.
 */
export async function trackShipment(_awb: string): Promise<BigshipStatus> {
  await getToken();
  throw new Error("trackShipment not yet implemented — awaiting Big Ship API docs.");
}

/**
 * Cancel a booked shipment.
 * TODO(bigship-docs): POST {BASE_URL}/<cancel endpoint> { awb }.
 */
export async function cancelShipment(_awb: string): Promise<{ ok: boolean }> {
  await getToken();
  throw new Error("cancelShipment not yet implemented — awaiting Big Ship API docs.");
}
