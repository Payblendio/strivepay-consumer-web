"use client";

import Link from "next/link";
import {BrandLogo} from "./brand-logo";
import {ThemeToggle} from "./theme-toggle";
import {IconCoins,IconNetwork,IconWallet,IconX} from "@tabler/icons-react";
import type {ReactNode} from "react";
import type {DashboardCustomer} from "@/lib/dashboard-access";
import {DashboardCustomerProvider} from "./dashboard-customer";

const tips=[
  {title:"Bank currency",detail:"Match the pay-in account you will fund.",icon:<IconCoins size={18}/>},
  {title:"Asset and network",detail:"Choose where bought crypto should settle.",icon:<IconNetwork size={18}/>},
  {title:"Receiving wallet",detail:"Use an address you control on that network.",icon:<IconWallet size={18}/>},
];

export function BuyUpdateWorkspace({customer,children}:{customer:DashboardCustomer;children:ReactNode}){
  return <DashboardCustomerProvider customer={customer}>
    <main className="compliance-workspace">
      <div className="compliance-workspace-grid" aria-hidden="true"/>
      <header className="compliance-topbar">
        <Link className="compliance-brand" href="/dashboard" aria-label="StrivePay dashboard">
          <BrandLogo width={1937} height={621} priority/>
        </Link>
        <div className="compliance-topbar-label"><span>Buy crypto</span><b>Destination desk</b></div>
        <div className="compliance-topbar-actions">
          <ThemeToggle placement="header"/>
          <div className="compliance-account">
            <div><strong>{customer.givenName} {customer.familyName}</strong><small>{customer.email}</small></div>
          </div>
          <Link className="compliance-close" href="/dashboard/buy" aria-label="Close and return to buy crypto">
            <IconX size={22}/>
          </Link>
        </div>
      </header>

      <section className="compliance-stage" aria-labelledby="buy-update-title">
        {children}
      </section>
    </main>
  </DashboardCustomerProvider>;
}

export function BuyUpdatePanel({title,status="In progress",children}:{title:string;status?:string;children:ReactNode}){
  return <div className="compliance-window">
    <header className="compliance-window-hero">
      <div>
        <span>BUY CRYPTO</span>
        <h1 id="buy-update-title">Update destination.</h1>
        <p>Choose the wallet and network that should receive crypto after you fund a deposit account.</p>
      </div>
      <div className="compliance-step-number" aria-hidden="true"><small>Action</small><strong>02</strong><span>Destination</span></div>
    </header>
    <div className="compliance-window-body compliance-journey-body">
      <section className="compliance-form-panel">
        <header className="compliance-form-heading">
          <div><span>CRYPTO DESTINATION</span><h2>{title}</h2></div>
          <p><i className={status==="Complete"?"complete":""}/>{status}</p>
        </header>
        {children}
      </section>
      <aside className="compliance-journey-steps" aria-label="Destination tips">
        <ol>
          {tips.map((tip,index)=><li className={index===0?"current":""} key={tip.title}>
            <span className="compliance-journey-step-icon">{tip.icon}</span>
            <div>
              <small>{String(index+1).padStart(2,"0")}</small>
              <strong>{tip.title}</strong>
              <p>{tip.detail}</p>
            </div>
          </li>)}
        </ol>
      </aside>
    </div>
  </div>;
}
