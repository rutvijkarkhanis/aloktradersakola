// Real business contact details (provided by the owner). Rendered across the
// site. WhatsApp number in Admin → Settings, when set, overrides the primary.
export const BUSINESS = {
  whatsappNumbers: ["9665713561", "7798410384"] as string[],
  primaryWhatsapp: "9665713561",
  countryCode: "91",
  branches: [
    {
      name: "Akola (Branch 1)",
      address:
        "Beside PNB Bank, Shrowgi Tower, Tilak Road, Akola, Maharashtra 444001",
      mapUrl: "https://maps.app.goo.gl/tnPkmfiuuDvLX9di7",
    },
    {
      name: "Pune (Branch 2)",
      address:
        "Sai Park Phase 5, Mhasoba Wasti, Mundhwa - Manjari Rd, near Mhasoba Mandir, Manjari Budruk, Pune, Maharashtra 412307",
      mapUrl: "https://maps.app.goo.gl/BY6wEar3MW5SDP1CA",
    },
  ],
};

/**
 * Big Ship pickup warehouses (from the Big Ship dashboard warehouse list).
 * The admin picks one per order when booking a shipment. The first entry is
 * the default. Update the ids here if a warehouse changes in Big Ship.
 */
export const SHIPPING_WAREHOUSES: { id: string; label: string }[] = [
  { id: "893", label: "Akola (HQ)" },
  { id: "173115", label: "Pune" },
];

/**
 * Origin pincode used for the live delivery estimate on the storefront
 * (parcels dispatch from Akola HQ by default). Override with SHIP_ORIGIN_PINCODE.
 */
export const SHIP_ORIGIN_PINCODE = process.env.SHIP_ORIGIN_PINCODE || "444001";

/** Fallback parcel weight (kg) when a product has no shipping_weight set yet. */
export const DEFAULT_SHIPPING_WEIGHT_KG = Number(process.env.DEFAULT_SHIPPING_WEIGHT_KG || "2");

/** Full international WhatsApp number (countryCode + local), digits only. */
export function waNumber(local: string): string {
  const digits = local.replace(/[^0-9]/g, "");
  return digits.startsWith(BUSINESS.countryCode) ? digits : BUSINESS.countryCode + digits;
}
