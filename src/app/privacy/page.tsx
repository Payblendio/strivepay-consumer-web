import type { Metadata } from "next";
import Link from "next/link";
import "./legal.css";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How StrivePay collects, uses, shares and protects your personal data.",
};

const UPDATED = "5 October 2026";
const CONTACT = "privacy@strivepay.io";

export default function PrivacyPolicyPage() {
  return (
    <main className="legal-page">
      <article className="legal-article">
        <header>
          <Link className="legal-brand" href="/">StrivePay</Link>
          <h1>Privacy policy</h1>
          <p className="legal-updated">Last updated {UPDATED}</p>
        </header>

        <section>
          <h2>1. Who we are</h2>
          <p>
            StrivePay is operated by ApexLogic Innovations LTD (“StrivePay”, “we”, “us”), Suite M4, Along Chief G U Ake Road,
            Rumodome, Port Harcourt 500101, Rivers State, Nigeria. We are responsible for the personal data described in this policy.
          </p>
          <p>
            This policy applies to the StrivePay mobile app for Android and iOS, the website at strivepay.io and its subdomains, and
            the related services that let you move money between fiat currencies and digital assets (together, the “Services”).
          </p>
        </section>

        <section>
          <h2>2. Information we collect</h2>
          <h3>Information you give us</h3>
          <ul>
            <li><strong>Account details:</strong> name, email address, phone number, country of residence, account type and your password (stored only as a secure hash).</li>
            <li><strong>Business details:</strong> for business accounts, company name, registration number, country of incorporation and details of owners and team members.</li>
            <li><strong>Identity verification:</strong> date of birth, residential address, nationality, government ID numbers (for example BVN, NIN or tax identifiers), photos of identity documents and a selfie or liveness check.</li>
            <li><strong>Financial information:</strong> bank account details for payouts, crypto wallet addresses, transaction amounts, currencies, counterparties and your transaction history.</li>
            <li><strong>Communications:</strong> messages and files you send to our support team, and your feedback.</li>
          </ul>
          <h3>Information collected automatically</h3>
          <ul>
            <li><strong>Device and technical data:</strong> IP address, device type, operating system, app version, browser user agent and sign-in session records.</li>
            <li><strong>Approximate location:</strong> the country and region we estimate from your IP address. We do not collect precise GPS location.</li>
            <li><strong>Push notification token:</strong> if you allow notifications, a token that lets us send alerts to your device.</li>
            <li><strong>Cookies:</strong> our website uses essential cookies to keep you signed in and secure. We do not use advertising cookies.</li>
          </ul>
          <h3>Information from third parties</h3>
          <p>
            Our identity verification, banking and payment partners send us the results of checks they perform, such as verification
            status, sanctions and fraud screening results, and the status of payments you make or receive.
          </p>
          <p>
            We do not access your contacts, photos (other than ones you choose to upload), microphone, calendar or other apps.
            The app does not contain advertising or third-party analytics tools.
          </p>
        </section>

        <section>
          <h2>3. How we use your information</h2>
          <ul>
            <li>To create and manage your account and provide the Services, including quotes, conversions, deposits and payouts.</li>
            <li>To verify your identity and meet our legal obligations, including know-your-customer, anti-money-laundering, counter-terrorist-financing and sanctions rules.</li>
            <li>To detect and prevent fraud, abuse and unauthorised access, and to keep the Services secure.</li>
            <li>To send you service messages such as security codes, transaction updates and account notices.</li>
            <li>To respond to support requests and improve how the Services work.</li>
            <li>To comply with legal process and requests from regulators and law enforcement, and to establish or defend legal claims.</li>
          </ul>
          <p>We do not sell your personal data, and we do not use it for advertising or share it with advertisers.</p>
        </section>

        <section>
          <h2>4. Legal bases</h2>
          <p>Where data protection laws such as the Nigeria Data Protection Act, the UK GDPR or the EU GDPR apply, we rely on:</p>
          <ul>
            <li><strong>Contract:</strong> to provide the Services you ask for.</li>
            <li><strong>Legal obligation:</strong> for identity verification, financial record-keeping and regulatory reporting.</li>
            <li><strong>Legitimate interests:</strong> for security, fraud prevention and improving the Services, where these are not overridden by your rights.</li>
            <li><strong>Consent:</strong> for push notifications and any optional features. You can withdraw consent at any time.</li>
          </ul>
        </section>

        <section>
          <h2>5. Who we share your information with</h2>
          <p>We share personal data only as needed to provide the Services, with these types of parties:</p>
          <ul>
            <li><strong>Identity verification providers</strong> that check your identity documents, selfie and screening results.</li>
            <li><strong>Regulated banking, payment and digital asset partners</strong> that hold funds, process payments and payouts, and execute conversions on your behalf.</li>
            <li><strong>Service providers</strong> that host our infrastructure, deliver email and push notifications, estimate location from IP addresses and help us operate the Services. They may use the data only to provide services to us.</li>
            <li><strong>Regulators, law enforcement and courts</strong> where the law requires it or to protect our users, the public or StrivePay.</li>
            <li><strong>Professional advisers</strong> such as auditors and lawyers, under confidentiality obligations.</li>
            <li><strong>A buyer or successor</strong> if StrivePay is involved in a merger, acquisition or sale of assets, who must protect your data as described in this policy.</li>
          </ul>
          <p>For business accounts, the account owner and administrators can see activity and team members within that business.</p>
        </section>

        <section>
          <h2>6. International transfers</h2>
          <p>
            Our partners and service providers operate in several countries, including Nigeria, the United Kingdom, the European Union
            and the United States. When we transfer personal data across borders we use appropriate safeguards, such as contractual
            protections required by applicable data protection laws.
          </p>
        </section>

        <section>
          <h2>7. How long we keep your information</h2>
          <ul>
            <li>We keep your account information while your account is open.</li>
            <li>After you close your account, we keep transaction, payment, ledger, identity verification and anti-money-laundering records for <strong>5 years</strong>, as financial regulations require, and then delete them.</li>
            <li>Other personal data, such as your profile, contact details, devices and support history, is deleted after your account closure is reviewed.</li>
            <li>Security logs are kept for as long as needed to protect the Services and investigate incidents.</li>
          </ul>
        </section>

        <section>
          <h2>8. How we protect your information</h2>
          <p>
            All data sent between your device and StrivePay is encrypted in transit using TLS. Sensitive data such as identity numbers
            is encrypted at rest, passwords are stored as one-way hashes, and access to personal data is limited to authorised staff
            who need it. You can add an authenticator app for extra sign-in protection. No system is completely secure, so please keep
            your password private and tell us straight away if you think your account has been compromised.
          </p>
        </section>

        <section>
          <h2>9. Your rights and choices</h2>
          <p>Depending on where you live, you may have the right to access, correct, delete or receive a copy of your personal data, and to object to or restrict certain processing.</p>
          <ul>
            <li><strong>Correct your details:</strong> update your profile in the app or contact support.</li>
            <li><strong>Delete your account:</strong> in the app go to Profile → Delete account, or use <Link href="/delete-account">strivepay.io/delete-account</Link>.</li>
            <li><strong>Delete some of your data</strong> without closing your account: use <Link href="/delete-data">strivepay.io/delete-data</Link>.</li>
            <li><strong>Notifications:</strong> turn off push notifications in your device settings. Security and transaction emails are part of the Services.</li>
            <li><strong>Other requests:</strong> email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. We may ask you to verify your identity first.</li>
          </ul>
          <p>You can also complain to your local data protection authority, such as the Nigeria Data Protection Commission or the UK Information Commissioner’s Office.</p>
        </section>

        <section>
          <h2>10. Children</h2>
          <p>The Services are only for people aged 18 or over. We do not knowingly collect data from children. If you believe a child has given us personal data, contact us and we will delete it.</p>
        </section>

        <section>
          <h2>11. Changes to this policy</h2>
          <p>We may update this policy from time to time. We will post the new version on this page and, for significant changes, notify you by email or in the app before they take effect.</p>
        </section>

        <section>
          <h2>12. Contact us</h2>
          <p>
            ApexLogic Innovations LTD, Suite M4, Along Chief G U Ake Road, Rumodome, Port Harcourt 500101, Rivers State, Nigeria.<br />
            Email: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
          </p>
        </section>
      </article>
    </main>
  );
}
