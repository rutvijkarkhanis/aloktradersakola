import { LegalShell } from "@/components/legal/legal-shell";
export const metadata = { title: "Privacy Policy" };
export default function Page() {
  return (
    <LegalShell title="Privacy Policy">
      <p>We collect the information you provide to process orders and enquiries — such as your name, contact details, delivery address and order history.</p>
      <h2>How we use your information</h2>
      <ul>
        <li>To process and deliver your orders and custom fabrication enquiries.</li>
        <li>To communicate about your order status and payments.</li>
        <li>To provide customer support and improve our services.</li>
      </ul>
      <h2>Payments</h2>
      <p>Online payments are processed by our payment gateway. We do not store your full card or banking details on our servers.</p>
      <h2>Data storage</h2>
      <p>Your account, order and address data is stored securely and access is restricted. You can view and manage your saved addresses and profile from your account.</p>
      <h2>Your choices</h2>
      <p>You may request access to or deletion of your personal data by contacting the store using the details above.</p>
    </LegalShell>
  );
}
