import { LegalShell } from "@/components/legal/legal-shell";
export const metadata = { title: "Terms & Conditions" };
export default function Page() {
  return (
    <LegalShell title="Terms & Conditions">
      <p>These terms govern your use of this website and any purchase of products. By placing an order you agree to these terms. Product availability, specifications and prices are as listed and may be updated from time to time.</p>
      <h2>Products & Orders</h2>
      <p>Products include ready-made items and made-to-order / custom fabrication. Custom and quote-only items are confirmed after we share pricing and you approve. We may cancel an order if a product is unavailable or a pricing error occurs, in which case any amount paid is refunded.</p>
      <h2>Pricing</h2>
      <p>All prices are in Indian Rupees (₹). The final payable amount, including any delivery charge or applicable tax, is shown at checkout.</p>
      <h2>Payments</h2>
      <p>We accept full online payment, or a partial advance with the balance payable on delivery, as offered at checkout. See our Payment Policy for details.</p>
      <h2>Customer Responsibilities</h2>
      <p>Please provide accurate delivery and contact details. You are responsible for the information submitted for custom fabrication (sizes, materials, finishes).</p>
      <h2>Contact</h2>
      <p>For any questions about these terms, contact the store using the details above.</p>
    </LegalShell>
  );
}
