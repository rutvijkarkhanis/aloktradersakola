import { LegalShell } from "@/components/legal/legal-shell";
export const metadata = { title: "Returns & Refund Policy" };
export default function Page() {
  return (
    <LegalShell title="Returns & Refund Policy">
      <p>We want you to be satisfied with your order. If an item arrives damaged or is not as described, contact us promptly with your order number and photos so we can help.</p>
      <h2>Custom & made-to-order items</h2>
      <p>Custom fabrication items are produced specifically to your requirement and may not be eligible for return unless they are defective or not as agreed.</p>
      <h2>Refunds</h2>
      <p>Where a refund is due, it is processed to your original payment method. For orders paid as advance + balance on delivery, any refund applies to the amount actually paid.</p>
      <h2>How to request</h2>
      <p>Contact the store using the details above with your order number to start a return or refund request.</p>
    </LegalShell>
  );
}
