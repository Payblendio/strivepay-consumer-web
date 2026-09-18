import type {Metadata} from "next";
import Image from "next/image";
import Link from "next/link";
import {IconArrowDown, IconArrowRight, IconArrowsExchange, IconCheck, IconChevronDown, IconFingerprint, IconRoute} from "@tabler/icons-react";
import {CoverageExplorer} from "@/components/marketing/coverage-explorer";
import {RoutePreview} from "@/components/marketing/route-preview";
import {MoneyRouteMap} from "@/components/marketing/money-route-map";
import {PartnerMarquee} from "@/components/marketing/partner-marquee";
import "./landing.css";
import "./hero-flow.css";

export const metadata: Metadata = {
  title: "Your money. More ways to move. | StrivePay",
  description: "Buy crypto with a bank transfer. Sell into your chosen payout account. Explore available routes and follow every step with StrivePay.",
};
const questions = [
  ["How do I get started?", "Create an account, complete identity verification, then set up your wallet and bank accounts. Your dashboard shows the next step."],
  ["Can I use my own crypto wallet?", "Yes. Choose a supported asset and network, then add your receiving wallet. Always match the network shown in your transfer instructions."],
  ["Which currencies can I use?", "Available routes depend on your residence, account type, currency and network. Explore funding coverage, then sign in to see the routes available to you."],
  ["What about fees and transfer times?", "Use the dashboard calculator for indicative rates and fees. Timing depends on bank processing, network confirmations and required checks. Track your transfer in Activity."],
];

export default function Home() {
  return <div className="landing">
    <a className="landing-skip" href="#main">Skip to content</a>
    <header className="landing-nav">
      <Link href="/" aria-label="StrivePay home" className="landing-logo"><Image src="/branding/strivepay-logo-dark.svg" alt="StrivePay" width={170} height={43} preload /></Link>
      <nav aria-label="Main navigation"><a href="#possibilities">The possibilities</a><a href="#coverage">Coverage</a><a href="#how-it-works">How it works</a></nav>
      <div className="landing-nav-actions"><Link href="/login" className="landing-signin">Sign in</Link><Link href="/register" className="landing-button small">Get started <IconArrowRight size={16}/></Link></div>
    </header>
    <main id="main">
      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow"><span/> BANK MONEY, MEET CRYPTO</p>
          <h1 id="hero-title">Your money.<br/>More ways<br/><span>to move.</span></h1>
          <p className="landing-lead">Buy crypto with a bank transfer. Sell into your chosen bank account.</p>
          <div className="landing-hero-actions"><Link href="/register" className="landing-button">Get started <IconArrowRight size={18}/></Link><a href="#possibilities" className="landing-text-link">See how it works <IconArrowDown size={16}/></a></div>
          <p className="landing-hero-note"><IconCheck size={15}/> For you. For your business.</p>
        </div>
        <figure className="landing-flow-art" aria-label="Move between bank money and crypto">
          <div className="landing-flow-render">
            <Image src="/images/landing/open-routes.webp" width={1600} height={1280} alt="Open teal and silver ribbon arrows flowing in opposite directions." sizes="(max-width: 760px) 100vw, (max-width: 1320px) 53vw, 700px" preload/>
          </div>
          <figcaption className="landing-flow-legend">
            <div className="landing-flow-endpoint">
              <span className="landing-flow-label">Bank money</span>
              <div className="landing-flow-assets">{[{code:"EUR",src:"eu"},{code:"GBP",src:"gb"},{code:"USD",src:"us"},{code:"NGN",src:"ng"}].map(item=><Image key={item.code} src={`/branding/fiat/${item.src}.svg`} alt={item.code} title={item.code} width={34} height={34}/>)}</div>
            </div>
            <IconArrowsExchange className="landing-flow-exchange" size={28} aria-label="Two-way routes"/>
            <div className="landing-flow-endpoint">
              <span className="landing-flow-label">Crypto</span>
              <div className="landing-flow-assets">{["BTC","ETH","USDC","USDT"].map(code=><Image key={code} src={`/branding/crypto/${code.toLowerCase()}.svg`} alt={code} title={code} width={34} height={34}/>)}</div>
            </div>
          </figcaption>
          <p className="landing-flow-availability">Available routes vary by country.</p>
        </figure>
      </section>
      <PartnerMarquee/>
      <section id="possibilities" className="landing-product" aria-labelledby="possibilities-heading">
        <header className="landing-section-heading"><p className="landing-eyebrow">TWO DIRECTIONS. ONE STRIVEPAY.</p><h2 id="possibilities-heading">The freedom to<br/>move <span>both ways.</span></h2></header>
        <RoutePreview/>
      </section>
      <MoneyRouteMap/>
      <section id="buy-walkthrough" className="landing-product-walkthrough" aria-labelledby="walkthrough-buy-title">
        <figure><Image src="/images/landing/buy-product-mockup-v1.png" alt="Illustrative phone mockup of StrivePay’s buy screen, showing a receiving wallet and pay-in accounts with personal details removed." width={1448} height={1086} sizes="(max-width:760px) 100vw, 55vw"/><figcaption>Illustrative mockup based on the product. Account details removed.</figcaption></figure>
        <div><p className="landing-eyebrow">A CLOSER LOOK / BUY</p><h2 id="walkthrough-buy-title">A familiar way in.<br/><span>A new destination.</span></h2><p>Start with a bank transfer. Your buy setup keeps the funding account and receiving crypto wallet together, so you can check the route before sending.</p><ol><li><strong>Choose your receiving wallet</strong><span>Match the supported asset and network.</span></li><li><strong>Open your pay-in instructions</strong><span>Use the bank details shown for your available funding route.</span></li><li><strong>Follow your transfer</strong><span>Check Activity for recorded progress and settlement updates.</span></li></ol><Link className="landing-text-link" href="/register">Set up your first route <IconArrowRight size={18}/></Link></div>
      </section>
      <section id="sell-walkthrough" className="landing-product-walkthrough landing-product-walkthrough-sell" aria-labelledby="walkthrough-sell-title">
        <div><p className="landing-eyebrow">A CLOSER LOOK / SELL</p><h2 id="walkthrough-sell-title">From your crypto.<br/><span>To your account.</span></h2><p>Start with the destination. Open a verified payout account to get the crypto send instructions for that route.</p><ol><li><strong>Pick where the money lands</strong><span>Choose your available bank destination.</span></li><li><strong>Match the deposit instructions</strong><span>Send only the stated asset using the exact network shown.</span></li><li><strong>Keep settlement in sight</strong><span>Follow recorded updates, or ask support about your transfer.</span></li></ol><Link className="landing-text-link" href="/register">Choose your destination <IconArrowRight size={18}/></Link></div>
        <figure><Image src="/images/landing/sell-product-mockup-v1.png" alt="Illustrative phone mockup of StrivePay’s sell screen with a EUR destination account and personal details removed." width={1448} height={1086} sizes="(max-width:760px) 100vw, 55vw"/><figcaption>Illustrative mockup based on the product. Account details removed.</figcaption></figure>
      </section>
      <div className="landing-coverage-section"><CoverageExplorer/></div>
      <section className="landing-money-story" aria-labelledby="money-story-title">
        <div className="landing-money-story-copy"><p className="landing-eyebrow">MORE CONTROL. FEWER UNKNOWNS.</p><h2 id="money-story-title">Your next move.<br/><span>In clear view.</span></h2><p>Choose where your money goes. Keep the route, receiving account and progress together in one place.</p><Link href="/register" className="landing-button">Find your route <IconArrowRight size={18}/></Link></div>
        <Image src="/images/landing/money-routes-dark-v1.png" alt="Teal and silver ribbons carrying currency coins in opposite directions." width={1536} height={1024} sizes="(max-width: 760px) 100vw, 65vw"/>
        <dl className="landing-money-story-details"><div><dt>Your wallet</dt><dd>Choose a supported asset and its matching network.</dd></div><div><dt>Your destination</dt><dd>Set the bank account that receives your sales.</dd></div><div><dt>Your progress</dt><dd>Follow recorded updates in your activity timeline.</dd></div></dl>
      </section>
      <section className="landing-setup" id="how-it-works" aria-labelledby="setup-heading">
        <div className="landing-setup-title"><p className="landing-eyebrow">YOUR NEXT MOVE</p><h2 id="setup-heading">A little setup.<br/><span>More possibility.</span></h2><Link className="landing-text-link" href="/register">Let’s get you started <IconArrowRight size={18}/></Link><Image className="landing-setup-art" src="/images/landing/setup-bank-wallet-v1.png" alt="A teal and platinum bank beside a matching crypto wallet." width={1200} height={900} sizes="(max-width:760px) 100vw, 40vw"/></div>
        <ol className="landing-setup-steps">
          <li><span className="landing-step-icon"><IconFingerprint size={25}/></span><div><small>01</small><h3>Make it yours.</h3><p>Create your personal or business account and complete verification.</p></div></li>
          <li><span className="landing-step-icon"><IconRoute size={25}/></span><div><small>02</small><h3>Set your route.</h3><p>Choose your crypto wallet, funding currency and payout account.</p><div className="landing-setup-links"><a href="#buy-walkthrough">See the buy flow ↗</a><a href="#sell-walkthrough">See the sell flow ↗</a></div></div></li>
          <li><span className="landing-step-icon"><IconArrowsExchange size={25}/></span><div><small>03</small><h3>Move. And keep track.</h3><p>Follow your transfer from the first confirmation to final settlement.</p></div></li>
        </ol>
      </section>
      <section className="landing-everyday" aria-labelledby="everyday-heading">
        <header><p className="landing-eyebrow">BUILT AROUND YOUR DAY</p><h2 id="everyday-heading">Your own money.<br/><span>Or your company’s.</span></h2></header>
        <div className="landing-everyday-columns"><article><span className="landing-eyebrow">01 / PERSONAL</span><h3>Keep your next move simple.</h3><p>Manage your receiving wallets, bank destinations and transfer history from your personal dashboard.</p><Link href="/register" className="landing-text-link">Start with a personal account <IconArrowRight size={17}/></Link></article><article><span className="landing-eyebrow">02 / BUSINESS</span><h3>A workspace for company money.</h3><p>Keep business accounts and activity in a company workspace. Invite teammates and manage their access as your team grows.</p><Link href="/register" className="landing-text-link">Set up your business <IconArrowRight size={17}/></Link></article></div>
        <aside className="landing-help-note"><IconFingerprint size={28}/><div><h3>Checks before you move. Help when you need it.</h3><p>Complete verification before setting up routes. For a transfer question, open a support conversation linked to your activity—without sharing passwords or verification codes.</p></div><Link className="landing-text-link" href="/dashboard/support">Get help <IconArrowRight size={17}/></Link></aside>
      </section>
      <section className="landing-faq" aria-labelledby="faq-heading"><div><p className="landing-eyebrow">GOOD TO KNOW</p><h2 id="faq-heading">A few things,<br/>before you move.</h2></div><div className="landing-questions">{questions.map(([q,a])=><details key={q}><summary>{q}<IconChevronDown size={18}/></summary><p>{a}</p></details>)}</div></section>
      <section className="landing-closing" aria-labelledby="closing-heading"><span className="landing-closing-symbol" aria-hidden="true">↔</span><p className="landing-eyebrow">THIS IS YOUR NEXT MOVE</p><h2 id="closing-heading">From here.<br/><span>To what’s next.</span></h2><Link href="/register" className="landing-button">Create your account <IconArrowRight size={18}/></Link></section>
    </main>
    <footer className="landing-footer"><div><Link href="/" aria-label="StrivePay home"><Image src="/branding/strivepay-logo-dark.svg" alt="StrivePay" width={145} height={37}/></Link><p>Bank to crypto. And back again.</p></div><nav aria-label="Footer navigation"><a href="#coverage">Coverage</a><a href="#how-it-works">How it works</a><Link href="/login">Sign in</Link><Link href="/register">Get started</Link></nav><div className="landing-fineprint"><span>© {new Date().getFullYear()} StrivePay</span><p>Availability depends on residence, account type, currency and network. Crypto values can change. Review your route and fees before transferring.</p></div></footer>
  </div>;
}
