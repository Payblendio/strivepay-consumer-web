"use client";

import Link from "next/link";
import {
  IconArrowRight,
  IconBuildingBank,
  IconCoins,
  IconHistory,
  IconShieldCheck,
  IconWallet,
} from "@tabler/icons-react";

const flowSteps=[
  {
    title:"Finish setup",
    detail:"Complete compliance, then set your crypto route and request pay-in and payout accounts.",
  },
  {
    title:"Buy crypto",
    detail:"Send bank money to your pay-in account. Crypto arrives at the receiving wallet you chose during setup.",
  },
  {
    title:"Sell crypto",
    detail:"Send crypto only to the address and network shown for your payout destination. Fiat settles to that bank account.",
  },
  {
    title:"Track activity",
    detail:"Every buy and sell shows status, amounts, fees, and timeline under Activity.",
  },
];

const buySteps=[
  {label:"01",title:"Fund pay-in",copy:"Transfer from your bank to the pay-in account details shown in Accounts / Buy."},
  {label:"02",title:"We convert",copy:"Once funds are confirmed, StrivePay converts to your chosen crypto asset and network."},
  {label:"03",title:"Wallet delivery",copy:"Bought crypto is sent to your chosen receiving wallet. This can be a wallet you control or an exchange or custodian account."},
];

const sellSteps=[
  {label:"01",title:"Open destination",copy:"Choose a ready payout account and open its send instructions."},
  {label:"02",title:"Send exact crypto",copy:"Send only the listed asset on the listed network to the listed address. Wrong network or asset can mean permanent loss."},
  {label:"03",title:"Bank settlement",copy:"After confirmation, proceeds settle to that payout account."},
];

const obligations=[
  {
    title:"Tell the truth in compliance",
    detail:"Identity, company, and ownership details must be accurate. False or incomplete information can pause or close your account.",
  },
  {
    title:"Use accounts you control",
    detail:"Pay-in funding should come from accounts you are authorised to use. Payout destinations must be yours, or a supported third party you fully disclose.",
  },
  {
    title:"Match pay-in instructions",
    detail:"Send the correct currency to the pay-in details shown for your route. Do not invent references or send unsupported currencies.",
  },
  {
    title:"Follow sell send instructions exactly",
    detail:"Copy the crypto address, asset, and network from StrivePay. Never reuse an old address after you change destination or network.",
  },
  {
    title:"Protect your login",
    detail:"Keep your password private. Turn on authenticator where available. StrivePay will never ask you for your password or security codes.",
  },
  {
    title:"Accept quotes, fees, and timing",
    detail:"Indicative rates can move. Network and provider fees may apply. Settlement is not instant—track status in Activity before assuming funds have arrived.",
  },
  {
    title:"Stay within supported routes",
    detail:"Only use currencies, assets, and networks StrivePay shows as ready for your account. Unsupported transfers are your risk.",
  },
];

export function HowItWorksPage(){
  return (
    <section className="dashboard-canvas dashboard-route-page buy-workspace account-workspace how-it-works-page" aria-labelledby="how-it-works-title">
      <header className="buy-toolbar">
        <p id="how-it-works-title">Bank money in. Crypto out. And back again—with clear steps and clear responsibilities.</p>
      </header>

      <section className="buy-soft-section" aria-labelledby="how-flow-title">
        <header className="buy-soft-head">
          <div>
            <span className="overview-kicker">Product</span>
            <h2 id="how-flow-title">How StrivePay works</h2>
            <p>One control desk for funding buys, settling crypto, and selling back to a verified bank account.</p>
          </div>
        </header>

        <ol className="how-flow-list">
          {flowSteps.map((step,index)=>(
            <li key={step.title} className="how-flow-item">
              <b aria-hidden="true">{String(index+1).padStart(2,"0")}</b>
              <div>
                <strong>{step.title}</strong>
                <p>{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="how-split">
        <section className="sell-hub-panel how-panel" aria-labelledby="how-buy-title">
          <header className="sell-hub-head">
            <div>
              <span className="overview-kicker">Buy</span>
              <h2 id="how-buy-title">Bank to crypto</h2>
              <p>Fund a pay-in account. Crypto is delivered to your chosen receiving wallet.</p>
            </div>
            <Link className="compliance-primary sell-hub-add" href="/dashboard/buy">
              Buy desk <IconArrowRight size={16}/>
            </Link>
          </header>
          <ul className="how-step-rows">
            {buySteps.map(step=>(
              <li key={step.title}>
                <b>{step.label}</b>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.copy}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="sell-hub-panel how-panel" aria-labelledby="how-sell-title">
          <header className="sell-hub-head">
            <div>
              <span className="overview-kicker">Sell</span>
              <h2 id="how-sell-title">Crypto to bank</h2>
              <p>Send crypto to the instructed address. Fiat settles to your payout account.</p>
            </div>
            <Link className="compliance-primary sell-hub-add" href="/dashboard/sell">
              Sell desk <IconArrowRight size={16}/>
            </Link>
          </header>
          <ul className="how-step-rows">
            {sellSteps.map(step=>(
              <li key={step.title}>
                <b>{step.label}</b>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.copy}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="buy-soft-section" aria-labelledby="how-obligations-title">
        <header className="buy-soft-head">
          <div>
            <span className="overview-kicker">Your side</span>
            <h2 id="how-obligations-title">What you are responsible for</h2>
            <p>These obligations keep your account moving and protect both sides of every transfer.</p>
          </div>
        </header>

        <ul className="how-obligation-list">
          {obligations.map(item=>(
            <li key={item.title}>
              <span className="how-obligation-mark" aria-hidden="true"><IconShieldCheck size={18}/></span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <nav className="how-quick-links" aria-label="Related desks">
        <Link href="/dashboard/accounts"><IconWallet size={18}/><span>Accounts</span><small>Pay-in and payout</small></Link>
        <Link href="/dashboard/buy"><IconCoins size={18}/><span>Buy crypto</span><small>Receiving wallet</small></Link>
        <Link href="/dashboard/sell"><IconBuildingBank size={18}/><span>Sell crypto</span><small>Payout destinations</small></Link>
        <Link href="/dashboard/activity"><IconHistory size={18}/><span>Activity</span><small>Status and timeline</small></Link>
      </nav>
    </section>
  );
}
