import "server-only";

/**
 * Big Ship "Unified Outbound" API client (Big Ship dispatches via Delhivery
 * and other couriers). Docs: api.bigship.direct — domestic_b2c segment.
 *
 * Flow to ship a paid order:
 *   1. create-order (draft)              -> CustomGlobalOrderId
 *   2. courier-wise-shipment-cost (rate) -> calculatedRates[] (must run before place)
 *   3. place-order (multipart)           -> awb_assigned (the AWB)
 *   4. track-order / download label
 *
 * Env (all server-side; add in Vercel):
 *   BIGSHIP_BASE_URL      default https://api.bigship.direct/
 *   BIGSHIP_USERNAME      Big Ship login email
 *   BIGSHIP_PASSWORD      Big Ship login password
 *   BIGSHIP_ACCESS_KEY    API access key
 *   BIGSHIP_WAREHOUSE_ID  pickup warehouse id to ship from
 *   BIGSHIP_RISK_TYPE_ID  default 2 (Owner Risk); 1=Third-Party, 3=Carrier
 */
const BASE_URL = (process.env.BIGSHIP_BASE_URL || "https://api.bigship.direct/").replace(/\/?$/, "/");
const USERNAME = process.env.BIGSHIP_USERNAME || "";
const PASSWORD = process.env.BIGSHIP_PASSWORD || "";
const ACCESS_KEY = process.env.BIGSHIP_ACCESS_KEY || "";
const WAREHOUSE_ID = process.env.BIGSHIP_WAREHOUSE_ID || "";
const RISK_TYPE_ID = process.env.BIGSHIP_RISK_TYPE_ID || "2";
const SEGMENT = "domestic_b2c";

export function isBigshipConfigured(): boolean {
  return Boolean(USERNAME && PASSWORD && ACCESS_KEY && WAREHOUSE_ID);
}

/** A Big Ship API error carrying the gateway's own message so admins see the real reason. */
export class BigshipError extends Error {
  constructor(message: string, readonly statusCode?: number) {
    super(message);
    this.name = "BigshipError";
  }
}

type ApiResponse<T> = { status: boolean; message?: string; status_code?: number; data?: T; errors?: Record<string, string[]> };

// In-memory token cache (per serverless instance). Re-login when near expiry.
let cachedToken: { token: string; expMs: number } | null = null;

async function login(): Promise<string> {
  if (cachedToken && cachedToken.expMs - Date.now() > 60_000) return cachedToken.token;
  const res = await fetch(`${BASE_URL}api/outbound/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD, access_key: ACCESS_KEY }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as ApiResponse<{ token: string; tokenExpiringAt?: string }>;
  if (!res.ok || !json.status || !json.data?.token) {
    throw new BigshipError(json.message || `Big Ship login failed (${res.status})`, res.status);
  }
  const expMs = json.data.tokenExpiringAt ? Date.parse(json.data.tokenExpiringAt) : Date.now() + 30 * 60_000;
  cachedToken = { token: json.data.token, expMs: Number.isFinite(expMs) ? expMs : Date.now() + 30 * 60_000 };
  return cachedToken.token;
}

function firstValidationError(json: ApiResponse<unknown>): string | undefined {
  if (json.errors) {
    const k = Object.keys(json.errors)[0];
    if (k) return json.errors[k]?.[0];
  }
  return undefined;
}

/** Authenticated JSON call. Retries once on 401 with a fresh token. */
async function api<T>(
  path: string,
  opts: { method?: string; json?: unknown; query?: Record<string, string>; _retry?: boolean } = {},
): Promise<T> {
  const token = await login();
  const qs = opts.query ? "?" + new URLSearchParams(opts.query).toString() : "";
  const res = await fetch(`${BASE_URL}${path}${qs}`, {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: opts.json !== undefined ? JSON.stringify(opts.json) : undefined,
    cache: "no-store",
  });
  if (res.status === 401 && !opts._retry) {
    cachedToken = null;
    return api<T>(path, { ...opts, _retry: true });
  }
  const body = (await res.json().catch(() => ({}))) as ApiResponse<T>;
  if (!res.ok || !body.status) {
    throw new BigshipError(firstValidationError(body) || body.message || `Big Ship error (${res.status})`, res.status);
  }
  return body.data as T;
}

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type BigshipConsignee = {
  name: string; mobile: string; email?: string | null;
  address: string; address2?: string | null; landmark?: string | null;
  city: string; state: string; pincode: string;
};

export type BigshipProduct = {
  productName: string; qty: number; amount: number; totalAmount: number;
  collectableAmount: number; hsn?: string; categoryId?: string;
};

export type BigshipOrderInput = {
  orderNumber: string;         // our OrderInvoiceNo
  paymentMode: "PREPAID" | "COD";
  invoiceAmount: number;       // must equal sum of product totalAmount
  consignee: BigshipConsignee;
  box: { length?: number; breadth?: number; height?: number; weightKg: number };
  products: BigshipProduct[];
  warehouseId?: string;        // pickup warehouse; falls back to BIGSHIP_WAREHOUSE_ID
};

export type BigshipRate = { courierId: string | number; courierName: string; total?: string | number; tat?: string | number };

export type BigshipBooking = { customGlobalOrderId: string; awb: string; referenceNumber?: string; courierName?: string };

const PAYMENT_MODE_ID = { PREPAID: 1, COD: 2 } as const;

// ---------------------------------------------------------------------------
// API surface
// ---------------------------------------------------------------------------

/** Step 1 — create a draft order. Returns Big Ship's CustomGlobalOrderId. */
async function createDraftOrder(input: BigshipOrderInput): Promise<string> {
  const nowUtc = new Date().toISOString().slice(0, 19).replace("T", " "); // Y-m-d H:i:s
  const pickupId = Number(input.warehouseId || WAREHOUSE_ID);
  const payload = {
    segment_type: SEGMENT,
    MasterOrderPickUpLocation: pickupId,
    MasterOrderReturnLocation: pickupId,
    MasterOrderDate: nowUtc,
    MasterOrderPaymentMode: PAYMENT_MODE_ID[input.paymentMode],
    OrderInvoiceNo: input.orderNumber,
    MasterOrderInvoiceAmount: input.invoiceAmount,
    MasterOrderShippingEmail: input.consignee.email || undefined,
    MasterOrderShippingName: input.consignee.name,
    MasterOrderShippingMobileNo: input.consignee.mobile,
    MasterOrderShippingAddress: input.consignee.address,
    MasterOrderShippingAddress2: input.consignee.address2 || "",
    MasterOrderShippingLandmark: input.consignee.landmark || "",
    MasterOrderShippingZipCode: input.consignee.pincode,
    MasterOrderShippingCountry: "India",
    MasterOrderShippingState: input.consignee.state,
    MasterOrderShippingCity: input.consignee.city,
    totalNumOfBoxes: 1,
    boxes: [
      {
        weight_unit: "kg",
        dimension_unit: "cm",
        noOfBoxes: 1,
        dimensions: [
          {
            length: input.box.length ?? 10,
            breadth: input.box.breadth ?? 10,
            height: input.box.height ?? 10,
            weight: input.box.weightKg,
          },
        ],
        products: input.products.map((p) => ({
          productName: p.productName,
          hsn: p.hsn || undefined,
          qty: String(p.qty),
          amount: String(p.amount),
          totalAmount: p.totalAmount,
          collectableAmount: p.collectableAmount,
          categoryId: p.categoryId || "1",
        })),
      },
    ],
  };
  const data = await api<{ CustomGlobalOrderId: string }>("api/outbound/create-order", { method: "POST", json: payload });
  if (!data?.CustomGlobalOrderId) throw new BigshipError("Big Ship did not return an order id.");
  return String(data.CustomGlobalOrderId);
}

/** Step 2 — serviceable couriers + rates for a draft order (must run before place). */
async function getRates(customGlobalOrderId: string): Promise<BigshipRate[]> {
  const data = await api<{ calculatedRates?: BigshipRate[] }>("api/outbound/courier-wise-shipment-cost", {
    method: "POST",
    json: { MasterCustomOrderId: customGlobalOrderId },
  });
  return data?.calculatedRates ?? [];
}

/** Step 3 — manifest/place the order with the chosen courier. Returns the AWB. */
async function placeOrder(customGlobalOrderId: string, courierId: string | number): Promise<{ awb: string; referenceNumber?: string }> {
  // domestic_b2c place-order is multipart/form-data (no invoice file needed for B2C).
  const token = await login();
  const form = new FormData();
  form.set("MasterCustomOrderId", customGlobalOrderId);
  form.set("courierId", String(courierId));
  form.set("riskTypeId", RISK_TYPE_ID);
  const res = await fetch(`${BASE_URL}api/outbound/place-order`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }, // let fetch set multipart boundary
    body: form,
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as ApiResponse<{ awb_assigned?: string | number; reference_number?: string | number }>;
  if (!res.ok || !body.status || !body.data?.awb_assigned) {
    throw new BigshipError(firstValidationError(body) || body.message || `Big Ship place-order failed (${res.status})`, res.status);
  }
  return { awb: String(body.data.awb_assigned), referenceNumber: body.data.reference_number != null ? String(body.data.reference_number) : undefined };
}

/**
 * Book a shipment end-to-end: create -> rate -> place.
 * Picks the cheapest serviceable courier unless preferredCourierId is given.
 */
export async function bookShipment(input: BigshipOrderInput, preferredCourierId?: string | number): Promise<BigshipBooking> {
  const customGlobalOrderId = await createDraftOrder(input);
  const rates = await getRates(customGlobalOrderId);
  if (!rates.length) throw new BigshipError("No serviceable courier for this shipment. Check the destination pincode/weight.");
  const chosen =
    (preferredCourierId != null && rates.find((r) => String(r.courierId) === String(preferredCourierId))) ||
    rates.slice().sort((a, b) => Number(a.total ?? Infinity) - Number(b.total ?? Infinity))[0];
  const placed = await placeOrder(customGlobalOrderId, chosen.courierId);
  return { customGlobalOrderId, awb: placed.awb, referenceNumber: placed.referenceNumber, courierName: chosen.courierName };
}

export type BigshipTracking = {
  status: string;
  awb?: string;
  courierName?: string;
  history: { status: string; message?: string; at?: string }[];
};

/** Live tracking for a booked order (by CustomGlobalOrderId). */
export async function trackShipment(customGlobalOrderId: string): Promise<BigshipTracking> {
  // Documented as GET with a JSON body; we pass the id as a query param for GET compatibility.
  const data = await api<any>("api/outbound/track-order", { method: "GET", query: { CustomGlobalOrderId: customGlobalOrderId } });
  const history = Array.isArray(data?.tracking_histories)
    ? data.tracking_histories.map((h: any) => ({ status: h.order_status || h.tag || "", message: h.message, at: h.checkpoint_time }))
    : [];
  return {
    status: data?.order_status || data?.tracking_current_status?.tracking_status || "",
    awb: data?.tracking_number != null ? String(data.tracking_number) : undefined,
    courierName: data?.courier_name,
    history,
  };
}

/** Download a shipment document URL (label/invoice/manifest/ewaybill). */
export async function getDocumentUrl(customGlobalOrderId: string, documentType: "label" | "invoice" | "manifest" | "ewaybill" = "label"): Promise<string | null> {
  try {
    const data = await api<{ AttachmentData?: string }>("api/outbound/download-shipment-documents", {
      method: "GET",
      query: { CustomGlobalOrderId: customGlobalOrderId, document_type: documentType },
    });
    return data?.AttachmentData || null;
  } catch {
    return null; // document may not be ready yet
  }
}

/** Cancel a booked order (only before pickup/rider-assigned). */
export async function cancelShipment(customGlobalOrderId: string): Promise<void> {
  await api("api/outbound/cancel-order", { method: "POST", json: { CustomGlobalOrderId: customGlobalOrderId } });
}
