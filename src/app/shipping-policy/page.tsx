import { LegalShell } from "@/components/legal/legal-shell";
export const metadata = { title: "Shipping Policy" };
export default function Page() {
  return (
    <LegalShell title="Shipping Policy">
      <p>We dispatch ready-made items after order confirmation. Made-to-order and custom fabrication items are produced to schedule and dispatched once ready.</p>
      <h2>Delivery charges</h2>
      <p>Any delivery charge is shown at checkout before you pay. Charges depend on the store's current delivery settings and your order value.</p>
      <h2>Timelines</h2>
      <p>Delivery timelines vary by product, quantity and location, and for custom fabrication by the agreed production schedule. We will share expected timelines for your order.</p>
      <h2>Bulk & event orders</h2>
      <p>For bulk or event orders, please coordinate delivery dates with us in advance so items arrive in time for your event.</p>
    </LegalShell>
  );
}
