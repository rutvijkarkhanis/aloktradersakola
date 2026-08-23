import "server-only";

/**
 * FShip API client (fship.in) — a courier aggregator that dispatches through
 * Delhivery, Xpressbees, Bluedart etc. Runs alongside the Big Ship client;
 * the admin picks which aggregator to book each order with.
 *
 * Flow to ship a paid order:
 *   1. createforwardorder      -> waybill (AWB) + apiorderid
 *   2. registerpickup          -> pickupOrderId (schedules the courier pickup)
 *   3. shippinglabelbypickupid -> label/invoice/manifest file URLs
 *   4. trackinghistory / shipmentsummary for live status
 *
 * Auth: a single "signature" header carrying the account's security/client key
 * (FShip Dashboard → Settings → API Details → Client Key). No login round-trip.
 *
 * Env (all server-side; add in Vercel):
 *   FSHIP_BASE_URL          default https://capi.fship.in  (staging: https://capi-qc.fship.in)
 *   FSHIP_SIGNATURE         security/client key sent as the `signature` header
 *   FSHIP_WAREHOUSE_ID      default pickup address id (from Manage Warehouse)
 *   FSHIP_WAREHOUSE_AKOLA   optional per-branch pickup address id
 *   FSHIP_WAREHOUSE_PUNE    optional per-branch pickup address id
 */
const BASE_URL = (process.env.FSHIP_BASE_URL || "https://capi.fship.in").replace(/\/+$/, "");
const SIGNATURE = process.env.FSHIP_SIGNATURE || "";
const WAREHOUSE_ID = process.env.FSHIP_WAREHOUSE_ID || "";

/** FShip payment modes are the inverse of Big Ship's: 1 = COD, 2 = PREPAID. */
const PAYMENT_MODE = { COD: 1, PREPAID: 2 } as const;

export function isFshipConfigured(): boolean {
  return Boolean(
    SIGNATURE &&
      (WAREHOUSE_ID || process.env.FSHIP_WAREHOUSE_AKOLA || process.env.FSHIP_WAREHOUSE_PUNE),
  );
}

/** Pickup address ids configured for FShip, resolved from env (ids aren't secret). */
export function fshipWarehouses(): { id: string; label: string }[] {
  const akola = process.env.FSHIP_WAREHOUSE_AKOLA || "";
  const pune = process.env.FSHIP_WAREHOUSE_PUNE || "";
  const list: { id: string; label: string }[] = [];
  if (akola) list.push({ id: akola, label: "Akola (HQ)" });
  if (pune) list.push({ id: pune, label: "Pune" });
  if (!list.length && WAREHOUSE_ID) list.push({ id: WAREHOUSE_ID, label: "Default pickup" });
  return list;
}

/** An FShip API error carrying the gateway's own message so admins see the real reason. */
export class FshipError extends Error {
  constructor(message: string, readonly statusCode?: number) {
    super(message);
    this.name = "FshipError";
  }
}

/** Authenticated JSON POST. FShip authenticates every call with the signature header. */
async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}/api/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      signature: SIGNATURE,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  // FShip signals failure with HTTP status and/or a `status:false` / `error:true` body.
  const failed = !res.ok || json.status === false || json.error === true;
  if (failed) {
    const msg = (json.response as string) || (json.message as string) || `FShip error (${res.status})`;
    throw new FshipError(msg, res.status);
  }
  return json as T;
}

// ---------------------------------------------------------------------------
// Domain types (shared shape with the Big Ship client for a common control)
// ---------------------------------------------------------------------------

export type FshipConsignee = {
  name: string; mobile: string; email?: string | null;
  address: string; address2?: string | null; landmark?: string | null;
  city: string; state: string; pincode: string;
};

export type FshipProduct = {
  productName: string; qty: number; amount: number; hsn?: string; sku?: string;
};

export type FshipOrderInput = {
  orderNumber: string;
  paymentMode: "PREPAID" | "COD";
  invoiceAmount: number;   // total_Amount
  taxAmount?: number;
  codAmount: number;       // 0 for prepaid
  consignee: FshipConsignee;
  box: { length?: number; breadth?: number; height?: number; weightKg: number };
  products: FshipProduct[];
  warehouseId?: string;    // pickup address id; falls back to FSHIP_WAREHOUSE_ID
};

export type FshipBooking = {
  waybill: string;
  apiOrderId: string | null;
  courierName?: string;
  labelUrl?: string | null;
};

// ---------------------------------------------------------------------------
// API surface
// ---------------------------------------------------------------------------

/** Step 1 — create the forward order; FShip assigns the AWB (waybill) + apiorderid. */
async function createForwardOrder(input: FshipOrderInput): Promise<{ waybill: string; apiOrderId: string | null }> {
  const pickAddressId = Number(input.warehouseId || WAREHOUSE_ID);
  const vol = input.box.length && input.box.breadth && input.box.height
    ? (input.box.length * input.box.breadth * input.box.height) / 5000
    : undefined;
  const payload = {
    customer_Name: input.consignee.name,
    customer_Mobile: input.consignee.mobile,
    customer_Emailid: input.consignee.email || "",
    customer_Address: input.consignee.address,
    landMark: input.consignee.landmark || "",
    customer_Address_Type: "Home",
    customer_PinCode: input.consignee.pincode,
    customer_City: input.consignee.city,
    orderId: input.orderNumber,
    invoice_Number: input.orderNumber,
    payment_Mode: PAYMENT_MODE[input.paymentMode],
    express_Type: "surface",
    is_Ndd: 0,
    order_Amount: input.invoiceAmount,
    tax_Amount: input.taxAmount ?? 0,
    extra_Charges: 0,
    total_Amount: input.invoiceAmount,
    cod_Amount: input.codAmount,
    shipment_Weight: input.box.weightKg,
    shipment_Length: input.box.length ?? 10,
    shipment_Width: input.box.breadth ?? 10,
    shipment_Height: input.box.height ?? 10,
    volumetric_Weight: vol,
    pick_Address_ID: pickAddressId,
    products: input.products.map((p) => ({
      productId: p.sku || "",
      productName: p.productName,
      unitPrice: p.amount,
      quantity: p.qty,
      hsnCode: p.hsn || "",
      sku: p.sku || "",
      taxRate: 0,
      productDiscount: 0,
    })),
    courierId: 0, // 0 = let FShip pick the serviceable courier
  };
  const data = await post<{ waybill?: string; apiorderid?: number | string }>("createforwardorder", payload);
  if (!data?.waybill) throw new FshipError("FShip did not return a waybill for this order.");
  return { waybill: String(data.waybill), apiOrderId: data.apiorderid != null ? String(data.apiorderid) : null };
}

/** Step 2 — register the pickup for the AWB. Returns the pickupOrderId (for labels). */
async function registerPickup(waybill: string): Promise<number | null> {
  try {
    const data = await post<{ apipickuporderids?: { pickupOrderId?: number }[] }>("registerpickup", {
      waybills: [waybill],
    });
    return data?.apipickuporderids?.[0]?.pickupOrderId ?? null;
  } catch {
    return null; // pickup can also be registered from the FShip dashboard
  }
}

/** Step 3 — fetch the printable label/manifest URL for a registered pickup. */
async function getLabelByPickupId(pickupOrderId: number): Promise<string | null> {
  try {
    const data = await post<{ labelfile?: string } | ({ labelfile?: string }[])>("shippinglabelbypickupid", {
      pickupOrderId: [pickupOrderId],
    });
    const row = Array.isArray(data) ? data[0] : data;
    return row?.labelfile || null;
  } catch {
    return null; // label may not be ready immediately
  }
}

/**
 * Book a shipment end-to-end: create order -> register pickup -> fetch label.
 * The AWB is assigned by FShip; pickup + label are best-effort (never block the AWB).
 */
export async function bookShipment(input: FshipOrderInput): Promise<FshipBooking> {
  const { waybill, apiOrderId } = await createForwardOrder(input);
  const pickupId = await registerPickup(waybill);
  const labelUrl = pickupId != null ? await getLabelByPickupId(pickupId) : null;
  return { waybill, apiOrderId, labelUrl };
}

export type FshipTracking = {
  status: string;
  courierName?: string;
  history: { status: string; message?: string; at?: string }[];
};

/** Live tracking for a booked AWB (full scan history). */
export async function trackShipment(waybill: string): Promise<FshipTracking> {
  const data = await post<{
    summary?: { status?: string; fulfilledby?: string };
    trackingdata?: { Status?: string; Remark?: string; Location?: string; DateandTime?: string }[];
  }>("trackinghistory", { waybill });
  const history = Array.isArray(data?.trackingdata)
    ? data.trackingdata.map((h) => ({
        status: h.Status || "",
        message: [h.Remark, h.Location].filter(Boolean).join(" — ") || undefined,
        at: h.DateandTime,
      }))
    : [];
  return {
    status: data?.summary?.status || history[0]?.status || "",
    courierName: data?.summary?.fulfilledby,
    history,
  };
}

/** Cancel a booked shipment (must be in Booked/Manifested state). */
export async function cancelShipment(waybill: string, reason = "Cancelled by seller"): Promise<void> {
  await post("cancelorder", { waybill, reason });
}
