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

/** Full international WhatsApp number (countryCode + local), digits only. */
export function waNumber(local: string): string {
  const digits = local.replace(/[^0-9]/g, "");
  return digits.startsWith(BUSINESS.countryCode) ? digits : BUSINESS.countryCode + digits;
}
