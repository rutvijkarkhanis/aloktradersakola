// Hand-maintained Supabase schema types. Kept in sync with supabase/migrations.
// Used to type the supabase-js client: createClient<Database>().
//
// Row interfaces are defined standalone (no self-reference into `Database`) so
// the schema satisfies supabase-js's GenericTable constraint — otherwise the
// whole client silently falls back to `never` rows.

export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: "customer" | "admin";
  created_at: string;
  updated_at: string;
}

export type SiteSettings = {
  id: number;
  business_name: string;
  logo_url: string | null;
  tagline: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  email: string | null;
  address: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  description: string | null;
  currency: string;
  tax_enabled: boolean;
  tax_rate: number;
  tax_label: string;
  delivery_flat_fee: number;
  free_delivery_threshold: number | null;
  advance_percentage: number;
  created_at: string;
  updated_at: string;
}

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  image_url: string | null;
  is_event_category: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  short_description: string | null;
  description: string | null;
  category_id: string | null;
  price: number | null;
  sale_price: number | null;
  currency: string;
  stock_quantity: number;
  low_stock_threshold: number;
  material: string | null;
  dimensions: string | null;
  weight: string | null;
  shipping_weight: number | null;
  length_cm: number | null;
  breadth_cm: number | null;
  height_cm: number | null;
  colour: string | null;
  finish: string | null;
  product_type: "READY_MADE" | "CUSTOM" | "READY_MADE_AND_CUSTOM" | "QUOTE_ONLY";
  is_customizable: boolean;
  is_active: boolean;
  is_featured: boolean;
  is_quote_only: boolean;
  needs_review: boolean;
  delivery_charge: number | null;
  source_pdf: string | null;
  source_pages: number[] | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

export type ProductImage = {
  id: string;
  product_id: string;
  url: string;
  storage_path: string | null;
  alt: string | null;
  is_primary: boolean;
  sort_order: number;
  source_page: number | null;
  created_at: string;
}

export type ProductVariant = {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price: number | null;
  stock_quantity: number;
  attributes: Json;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type Inventory = {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  reserved: number;
  status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "MADE_TO_ORDER" | "QUOTE_ONLY";
  updated_at: string;
}

export type ProductAttribute = {
  id: string;
  product_id: string;
  name: string;
  value: string;
  sort_order: number;
}

export type ProductTag = {
  id: string;
  product_id: string;
  tag: string;
}

export type WishlistItem = {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}

export type Review = {
  id: string;
  product_id: string;
  user_id: string;
  order_id: string | null;
  rating: number;
  title: string | null;
  comment: string | null;
  images: string[] | null;
  is_verified_purchase: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export type Address = {
  id: string;
  user_id: string;
  full_name: string;
  mobile: string;
  email: string | null;
  address_line: string;
  area: string | null;
  city: string;
  state: string;
  pincode: string;
  landmark: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type Coupon = {
  id: string;
  code: string;
  discount_type: "PERCENT" | "FIXED";
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type Order = {
  id: string;
  order_number: string;
  customer_id: string | null;
  subtotal: number;
  discount: number;
  coupon_code: string | null;
  delivery_charge: number;
  tax: number;
  total_amount: number;
  payment_type: "FULL_PAYMENT" | "ADVANCE_50_COD_50";
  advance_required: number;
  advance_paid: number;
  cod_amount: number;
  payment_status: "PENDING" | "PARTIALLY_PAID" | "PAID" | "FAILED" | "REFUND_PENDING" | "REFUNDED";
  order_status:
    | "PENDING_PAYMENT" | "PAYMENT_CONFIRMED" | "PROCESSING" | "FABRICATION"
    | "READY" | "SHIPPED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED"
    | "REFUND_PENDING" | "REFUNDED";
  cod_status: "NOT_APPLICABLE" | "COD_PENDING" | "COD_COLLECTED";
  shipping_address: Json;
  customer_notes: string | null;
  contact_email: string | null;
  contact_mobile: string | null;
  courier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  bigship_order_id: string | null;
  fship_order_id: string | null;
  shipping_provider: string | null;
  shipping_label_url: string | null;
  tracking_status: string | null;
  tracking_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  sku: string | null;
  image_url: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export type Payment = {
  id: string;
  order_id: string;
  amount: number;
  payment_type: "ADVANCE" | "FULL" | "COD" | "REFUND";
  gateway: string;
  gateway_order_id: string | null;
  transaction_id: string | null;
  status: "CREATED" | "AUTHORIZED" | "CAPTURED" | "FAILED" | "REFUNDED" | "PENDING";
  raw_payload: Json | null;
  created_at: string;
  updated_at: string;
}

export type WebhookEvent = {
  id: string;
  event_id: string;
  type: string;
  payload: Json;
  processed_at: string;
}

export type CustomFabricationRequest = {
  id: string;
  request_number: string;
  user_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  event_type: string | null;
  product_required: string | null;
  dimensions: string | null;
  quantity: number | null;
  material: string | null;
  colour: string | null;
  finish: string | null;
  required_date: string | null;
  budget: number | null;
  description: string | null;
  reference_images: string[] | null;
  status: "NEW" | "CONTACTED" | "QUOTED" | "APPROVED" | "IN_PRODUCTION" | "COMPLETED" | "CANCELLED";
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

type TableDef<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<Profile, Partial<Profile> & { id: string }, Partial<Profile>>;
      site_settings: TableDef<SiteSettings, Partial<SiteSettings>, Partial<SiteSettings>>;
      categories: TableDef<Category, Partial<Category> & { name: string; slug: string }, Partial<Category>>;
      products: TableDef<Product, Partial<Product> & { name: string; slug: string; sku: string }, Partial<Product>>;
      product_images: TableDef<ProductImage, Partial<ProductImage> & { product_id: string; url: string }, Partial<ProductImage>>;
      product_variants: TableDef<ProductVariant, Partial<ProductVariant> & { product_id: string; name: string }, Partial<ProductVariant>>;
      inventory: TableDef<Inventory, Partial<Inventory> & { product_id: string }, Partial<Inventory>>;
      product_attributes: TableDef<ProductAttribute, Partial<ProductAttribute> & { product_id: string; name: string; value: string }, Partial<ProductAttribute>>;
      product_tags: TableDef<ProductTag, { product_id: string; tag: string; id?: string }, Partial<ProductTag>>;
      product_event_categories: TableDef<
        { product_id: string; category_id: string },
        { product_id: string; category_id: string },
        Partial<{ product_id: string; category_id: string }>
      >;
      wishlist_items: TableDef<WishlistItem, { user_id: string; product_id: string; id?: string; created_at?: string }, Partial<WishlistItem>>;
      reviews: TableDef<Review, Partial<Review> & { product_id: string; user_id: string; rating: number }, Partial<Review>>;
      addresses: TableDef<Address, Partial<Address> & { user_id: string; full_name: string; mobile: string; address_line: string; city: string; state: string; pincode: string }, Partial<Address>>;
      coupons: TableDef<Coupon, Partial<Coupon> & { code: string; discount_type: "PERCENT" | "FIXED"; discount_value: number }, Partial<Coupon>>;
      orders: TableDef<Order, Partial<Order>, Partial<Order>>;
      order_items: TableDef<OrderItem, Partial<OrderItem> & { order_id: string; product_name: string; unit_price: number; quantity: number; line_total: number }, Partial<OrderItem>>;
      payments: TableDef<Payment, Partial<Payment> & { order_id: string; amount: number }, Partial<Payment>>;
      webhook_events: TableDef<WebhookEvent, { event_id: string; type: string; payload: Json; id?: string; processed_at?: string }, Partial<WebhookEvent>>;
      custom_fabrication_requests: TableDef<CustomFabricationRequest, Partial<CustomFabricationRequest> & { name: string; phone: string }, Partial<CustomFabricationRequest>>;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      generate_order_number: { Args: Record<string, never>; Returns: string };
      decrement_stock: { Args: { p_product_id: string; p_qty: number }; Returns: undefined };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Composite shapes used in the UI
export type ProductWithImages = Product & {
  images: ProductImage[];
  category: Category | null;
};
export type ProductFull = ProductWithImages & {
  attributes: ProductAttribute[];
};
export type OrderWithItems = Order & { items: OrderItem[]; payments?: Payment[] };
