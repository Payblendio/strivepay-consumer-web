import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell, type LegalTocItem } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Terms and conditions",
  description: "The terms that apply when you use StrivePay to buy and sell digital assets.",
};

const UPDATED = "27 November 2026";
const PRIVACY_CONTACT = "privacy@strivepay.io";

const UNSUPPORTED_COUNTRIES = [
  "Afghanistan",
  "Belarus",
  "Central African Republic",
  "China",
  "Ethiopia",
  "Haiti",
  "Iran",
  "Iraq",
  "Libya",
  "Myanmar",
  "Nicaragua",
  "North Korea (Democratic People’s Republic of Korea)",
  "Republic of the Congo",
  "Russia (Russian Federation)",
  "Somalia",
  "Sudan",
  "Syria",
  "Venezuela",
  "Zimbabwe",
];

const TOC: LegalTocItem[] = [
  { id: "about", label: "1. About these terms" },
  { id: "eligibility", label: "2. Who can use StrivePay" },
  { id: "account", label: "3. Your account and verification" },
  { id: "services", label: "4. What StrivePay does" },
  { id: "buying", label: "5. Buying digital assets" },
  { id: "selling", label: "6. Selling digital assets" },
  { id: "rates-fees", label: "7. Rates, fees and limits" },
  { id: "risks", label: "8. Risks and irreversible transactions" },
  { id: "security", label: "9. Keeping your account secure" },
  { id: "prohibited", label: "10. What you must not do" },
  { id: "suspension", label: "11. Suspension, holds and closing your account" },
  { id: "partners", label: "12. Our partners" },
  { id: "liability", label: "13. Our liability" },
  { id: "privacy-compliance", label: "14. Privacy and compliance" },
  { id: "changes", label: "15. Changes to these terms" },
  { id: "disputes", label: "16. Complaints and dispute resolution" },
  { id: "governing-law", label: "17. Governing law" },
  { id: "contact", label: "18. Contact us" },
];

export default function TermsPage() {
  return (
    <LegalShell current="/terms" title="Terms and conditions" updated={UPDATED} toc={TOC}>
      <section id="about">
        <h2>1. About these terms</h2>
        <p>
          These terms are a contract between you and ApexLogic Innovations LTD (“StrivePay”, “we”, “us”), Suite M4, Along Chief G U
          Ake Road, Rumodome, Port Harcourt 500101, Rivers State, Nigeria. They apply to the StrivePay mobile app, the website at
          strivepay.io and its subdomains, and the services that let you move money between bank accounts and digital assets (together,
          the “Services”).
        </p>
        <p>
          By creating an account or using any part of the Services, you agree to these terms. If you do not agree, please do not use
          the Services. Please read them together with our <Link href="/privacy">privacy policy</Link> and{" "}
          <Link href="/aml-policy">AML, CFT and CPF policy</Link>.
        </p>
      </section>

      <section id="eligibility">
        <h2>2. Who can use StrivePay</h2>
        <ul>
          <li>You must be at least 18 years old.</li>
          <li>You must live in, or (for a business) be incorporated in, a country where we offer the Services.</li>
          <li>If you open a business account, you confirm that you are authorised to act for that business and to accept these terms on its behalf.</li>
          <li>You must not be subject to sanctions or otherwise barred by law from using the Services.</li>
        </ul>
        <p>
          Because of laws and our partners’ policies, we cannot currently offer the Services in or to residents of the following
          countries. This list may change as the law or our partners’ requirements change.
        </p>
        <p>{UNSUPPORTED_COUNTRIES.join(", ")}.</p>
        <p>Using a VPN or another tool to hide where you are is not allowed and does not change which rules apply to you.</p>
      </section>

      <section id="account">
        <h2>3. Your account and verification</h2>
        <ul>
          <li>You must give accurate, complete and current information when you register and whenever we ask you to update it.</li>
          <li>We must verify your identity (and, for businesses, the company and its owners) before you can buy or sell. We may ask for more information or documents at any time.</li>
          <li>False or incomplete information can lead to your account being paused or closed.</li>
          <li>You may fund purchases only from bank accounts you are authorised to use, and you must receive payouts only in accounts that are yours, or in a supported third-party account that you have fully disclosed to us.</li>
          <li>You are responsible for everything done through your account unless you have told us it was compromised, as described in section 9.</li>
        </ul>
      </section>

      <section id="services">
        <h2>4. What StrivePay does</h2>
        <p>
          StrivePay lets you buy digital assets with money from your bank account, and sell digital assets and receive the proceeds in
          a bank account. Which currencies, assets and networks are available to you is shown in the app. Only use the ones shown as
          ready for your account.
        </p>
        <p>
          Some parts of the Services are provided through regulated banking, payment and digital asset partners. We do not give
          investment, tax or legal advice, and nothing in the Services is a recommendation to buy or sell any asset.
        </p>
      </section>

      <section id="buying">
        <h2>5. Buying digital assets</h2>
        <ul>
          <li>You send money from your bank to the pay-in account details shown for your route. Send the correct currency, and do not invent references or send unsupported currencies.</li>
          <li>Once we confirm your funds, we convert them to the digital asset and network you chose and send it to the receiving wallet you set up. This can be a wallet you control or an exchange or custodian account.</li>
          <li>You are responsible for making sure the payment details and the receiving wallet address and network are correct. If you give incorrect details and funds or assets go to the wrong place, we are not liable for the loss and may not be able to recover them.</li>
          <li>Funds must be cleared and available before they can be used. Processing can take time, so check the status in Activity before assuming funds have arrived.</li>
        </ul>
      </section>

      <section id="selling">
        <h2>6. Selling digital assets</h2>
        <ul>
          <li>To sell, you send the digital asset to the address and network shown in the app for your payout destination. Send only the listed asset on the listed network to the listed address, and never reuse an old address after you change destination or network.</li>
          <li>After we confirm your transfer, we settle the proceeds to the bank account you chose as your payout destination.</li>
          <li>You are responsible for entering correct bank details. We are not responsible for payouts made to incorrect details that you provided.</li>
          <li>If you send an asset to a wrong address, on a different network, or in an unsupported asset, the assets may be lost permanently. We are not liable for that loss.</li>
        </ul>
      </section>

      <section id="rates-fees">
        <h2>7. Rates, fees and limits</h2>
        <ul>
          <li>Rates shown before you confirm are indicative and can move with the market. The rate, amounts and fees that apply to a transaction are shown in the app and on its detail page.</li>
          <li>Fees may include our fees, network fees and partner fees. We tell you the fees that apply before you complete a transaction, and you agree to pay them.</li>
          <li>We may set limits on the number, size and type of transactions you can make, and we may change them. Where the law requires, we will give you notice.</li>
          <li>Settlement is not instant. Timing depends on banks, blockchain networks and our partners.</li>
        </ul>
      </section>

      <section id="risks">
        <h2>8. Risks and irreversible transactions</h2>
        <ul>
          <li>Digital asset transactions are irreversible. Once a transaction is confirmed on the network it cannot be reversed or cancelled, so check every address, network, amount and bank detail before you confirm.</li>
          <li>The value of digital assets can change quickly and you can lose money. Only buy or sell what you can afford, and make your own decisions.</li>
          <li>We are not responsible for losses that result from your trading decisions, market movements, or network congestion or failure.</li>
        </ul>
      </section>

      <section id="security">
        <h2>9. Keeping your account secure</h2>
        <ul>
          <li>Keep your password, PIN and security codes private, and turn on the authenticator app where it is available. StrivePay will never ask you for your password, PIN or security codes.</li>
          <li>Keep your devices secure and sign out of devices you no longer use.</li>
          <li>Tell us immediately through Support if you think your account or device has been compromised or used without your permission.</li>
        </ul>
        <p>
          We use measures such as encryption and access controls to protect the Services, as described in our{" "}
          <Link href="/privacy">privacy policy</Link>. No system is completely secure, and you are responsible for protecting your own
          credentials and devices.
        </p>
      </section>

      <section id="prohibited">
        <h2>10. What you must not do</h2>
        <ul>
          <li>Commit or attempt fraud, including misrepresenting your identity, giving false information, or trying to deceive other users or us.</li>
          <li>Use the Services for anything unlawful, including transactions involving illegal goods or services, money laundering or terrorist financing.</li>
          <li>Use the Services on behalf of someone else without telling us, or let someone else use your account.</li>
          <li>Try to bypass our checks, limits or country restrictions, or interfere with the security or operation of the Services.</li>
        </ul>
      </section>

      <section id="suspension">
        <h2>11. Suspension, holds and closing your account</h2>
        <p>
          We may pause a transaction, suspend your account or end our relationship with you if we suspect fraud or unlawful activity,
          if you break these terms, if the law or a regulator or partner requires it, or if we need more information to complete our
          checks. If funds in your account are, or are suspected of being, connected to fraud or unlawful activity, we may suspend the
          account and hold those funds while we investigate and as the law requires.
        </p>
        <p>
          Where the law allows, we will tell you what has happened and why. We may not be able to do so where it would breach the law
          or risk the safety of an investigation.
        </p>
        <p>
          You can close your account at any time in the app under Profile → Security → Delete account, or at{" "}
          <Link href="/delete-account">strivepay.io/delete-account</Link>. We keep some records after closure where the law requires, as
          explained in our <Link href="/privacy">privacy policy</Link>. Closing your account does not affect transactions already
          started or obligations that arose before closure.
        </p>
      </section>

      <section id="partners">
        <h2>12. Our partners</h2>
        <p>
          We rely on third parties such as identity verification providers, banks, payment providers and digital asset partners. They
          may apply their own checks, restrictions and terms, and some of those can affect your transactions. We are not responsible
          for delays or failures caused by events outside our reasonable control, including those of banks, partners and blockchain
          networks.
        </p>
      </section>

      <section id="liability">
        <h2>13. Our liability</h2>
        <p>
          We will carry out transactions as you instruct us, provided you have followed these terms and the instructions in the app.
          To the extent the law allows:
        </p>
        <ul>
          <li>our total liability to you for any claim relating to a buy or sell transaction is limited to the amount of that transaction;</li>
          <li>we are not liable for losses caused by incorrect details you give us, unauthorised use that results from you not protecting your credentials, market movements, or events outside our reasonable control; and</li>
          <li>we are not liable for any indirect or consequential loss.</li>
        </ul>
        <p>Nothing in these terms limits liability that cannot lawfully be limited.</p>
      </section>

      <section id="privacy-compliance">
        <h2>14. Privacy and compliance</h2>
        <p>
          We handle your personal data as described in our <Link href="/privacy">privacy policy</Link>. We must follow anti-money-laundering,
          counter-terrorist-financing and sanctions laws, which is why we verify customers and monitor activity, as described in our{" "}
          <Link href="/aml-policy">AML, CFT and CPF policy</Link>. We may report suspicious activity to the authorities and are not
          always allowed to tell you when we have done so.
        </p>
      </section>

      <section id="changes">
        <h2>15. Changes to these terms</h2>
        <p>
          We may change these terms from time to time. We will post the new version on this page and, for significant changes, tell
          you through the website or the app before they take effect. If you keep using the Services after a change takes effect, you
          accept the new terms. If you do not accept them, stop using the Services and close your account.
        </p>
      </section>

      <section id="disputes">
        <h2>16. Complaints and dispute resolution</h2>
        <ol>
          <li>
            <strong>Complain to us first.</strong> Send your complaint in writing through Support in the app or dashboard, or to us at
            the address in section 18.
          </li>
          <li>
            <strong>Give us time.</strong> You agree to allow us not less than 60 clear days from the date of your complaint to try to
            resolve it with you.
          </li>
          <li>
            <strong>Arbitration.</strong> If it is not resolved, the dispute will be referred to a sole arbitrator in Port Harcourt,
            under the arbitration rules of the Chartered Institute of Arbitrators, Nigeria. The decision is binding on both sides and
            can be made an order of court. Both sides consent to the jurisdiction of the High Court of Port Harcourt, Nigeria, for that
            purpose.
          </li>
          <li>
            Following these steps is a condition before you start any legal action against ApexLogic Innovations LTD or StrivePay,
            except where mandatory law says otherwise.
          </li>
        </ol>
      </section>

      <section id="governing-law">
        <h2>17. Governing law</h2>
        <p>
          These terms are governed by and interpreted under the laws of the Federal Republic of Nigeria, subject to any mandatory
          provisions of applicable law, including the rules of the Securities and Exchange Commission where they apply.
        </p>
      </section>

      <section id="contact">
        <h2>18. Contact us</h2>
        <p>
          ApexLogic Innovations LTD, Suite M4, Along Chief G U Ake Road, Rumodome, Port Harcourt 500101, Rivers State, Nigeria.<br />
          Support: the Support section of the app or dashboard.<br />
          Privacy requests: <a href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a>
        </p>
      </section>
    </LegalShell>
  );
}
