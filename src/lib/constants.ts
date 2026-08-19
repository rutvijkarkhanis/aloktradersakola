// Domain enums & labels shared across the app. These MUST match the CHECK
// constraints defined in the Supabase migrations.

export const PRODUCT_TYPES = [
  "READY_MADE",
  "CUSTOM",
  "READY_MADE_AND_CUSTOM",
  "QUOTE_ONLY",
] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PAYMENT_TYPES = ["FULL_PAYMENT", "ADVANCE_50_COD_50"] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const PAYMENT_STATUSES = [
  "PENDING",
  "PARTIALLY_PAID",
  "PAID",
  "FAILED",
  "REFUND_PENDING",
  "REFUNDED",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PAYMENT_CONFIRMED",
  "PROCESSING",
  "FABRICATION",
  "READY",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "REFUND_PENDING",
  "REFUNDED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const COD_STATUSES = ["NOT_APPLICABLE", "COD_PENDING", "COD_COLLECTED"] as const;
export type CodStatus = (typeof COD_STATUSES)[number];

export const FABRICATION_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUOTED",
  "APPROVED",
  "IN_PRODUCTION",
  "COMPLETED",
  "CANCELLED",
] as const;
export type FabricationStatus = (typeof FABRICATION_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Pending payment",
  PAYMENT_CONFIRMED: "Payment confirmed",
  PROCESSING: "Processing",
  FABRICATION: "In fabrication",
  READY: "Ready",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUND_PENDING: "Refund pending",
  REFUNDED: "Refunded",
};

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "PENDING_PAYMENT",
  "PAYMENT_CONFIRMED",
  "PROCESSING",
  "FABRICATION",
  "READY",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  PARTIALLY_PAID: "Advance paid",
  PAID: "Paid in full",
  FAILED: "Failed",
  REFUND_PENDING: "Refund pending",
  REFUNDED: "Refunded",
};

export const FABRICATION_STATUS_LABELS: Record<FabricationStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUOTED: "Quoted",
  APPROVED: "Approved",
  IN_PRODUCTION: "In production",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const PRODUCT_SORTS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name", label: "Name (A–Z)" },
] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number]["value"];

export const AVAILABILITY_OPTIONS = [
  { value: "in_stock", label: "In stock" },
  { value: "made_to_order", label: "Made to order" },
  { value: "quote_only", label: "Quote only" },
] as const;

export const EVENT_TYPES = [
  "Birthday",
  "Wedding",
  "Engagement",
  "Baby Shower",
  "Anniversary",
  "Corporate Event",
  "Party / Other",
] as const;

export const PAGE_SIZE = 12;

export const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan",
  "Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Delhi","Jammu and Kashmir","Ladakh","Puducherry","Chandigarh",
] as const;
