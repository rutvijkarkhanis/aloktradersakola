import { LegalShell } from "@/components/legal/legal-shell";
export const metadata = { title: "Payment Policy" };
export default function Page() {
  return (
    <LegalShell title="Payment Policy">
      <p>We offer two payment options at checkout:</p>
      <ul>
        <li><strong>Full payment online</strong> — pay 100% of the order total online to confirm your order.</li>
        <li><strong>Advance + balance on delivery</strong> — pay a percentage of the order total online now, and the remaining balance as cash / UPI on delivery.</li>
      </ul>
      <h2>Secure processing</h2>
      <p>Online payments are created and verified on our server through our payment gateway. Payment confirmation is validated before your order is marked as confirmed.</p>
      <h2>Balance on delivery</h2>
      <p>For advance orders, the remaining balance shown at checkout is collected at the time of delivery. Please keep the balance amount ready.</p>
      <h2>Failed or interrupted payments</h2>
      <p>If a payment fails or is interrupted, your order remains pending until payment is confirmed. Any amount deducted without confirmation is reconciled and refunded where applicable.</p>
    </LegalShell>
  );
}
