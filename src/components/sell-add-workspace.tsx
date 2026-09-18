"use client";

import Image from "next/image";
import Link from "next/link";
import {IconBuildingBank,IconShieldCheck,IconWallet,IconX} from "@tabler/icons-react";
import type {ReactNode} from "react";
import type {DashboardCustomer} from "@/lib/dashboard-access";
import {DashboardCustomerProvider} from "./dashboard-customer";

const tips=[
  {title:"Payout currency",detail:"Choose where sale proceeds should settle.",icon:<IconWallet size={18}/>},
  {title:"Bank details",detail:"Use a verified account you can receive into.",icon:<IconBuildingBank size={18}/>},
  {title:"Ownership",detail:"Confirm it is yours or a supported third party.",icon:<IconShieldCheck size={18}/>},
];

export function SellAddWorkspace({customer,children}:{customer:DashboardCustomer;children:ReactNode}){
  return <DashboardCustomerProvider customer={customer}>
    <main className="compliance-workspace">
      <div className="compliance-workspace-grid" aria-hidden="true"/>
      <header className="compliance-topbar">
        <Link className="compliance-brand" href="/dashboard" aria-label="StrivePay dashboard">
          <Image src="/branding/strivepay-logo-dark.svg" alt="StrivePay" width={1937} height={621} priority/>
        </Link>
        <div className="compliance-topbar-label"><span>Sell crypto</span><b>Payout desk</b></div>
        <div className="compliance-topbar-actions">
          <div className="compliance-account">
            <div><strong>{customer.givenName} {customer.familyName}</strong><small>{customer.email}</small></div>
          </div>
          <Link className="compliance-close" href="/dashboard/sell" aria-label="Close and return to sell">
            <IconX size={22}/>
          </Link>
        </div>
      </header>

      <section className="compliance-stage" aria-labelledby="sell-add-title">
        {children}
      </section>
    </main>
  </DashboardCustomerProvider>;
}

export function SellAddPanel({title,status="In progress",children}:{title:string;status?:string;children:ReactNode}){
  return <div className="compliance-window">
    <header className="compliance-window-hero">
      <div>
        <span>SELL CRYPTO</span>
        <h1 id="sell-add-title">Add a payout account.</h1>
        <p>Add another bank account that can receive money when you sell crypto.</p>
      </div>
      <div className="compliance-step-number" aria-hidden="true"><small>Action</small><strong>01</strong><span>Payout</span></div>
    </header>
    <div className="compliance-window-body compliance-journey-body">
      <section className="compliance-form-panel">
        <header className="compliance-form-heading">
          <div><span>PAYOUT ACCOUNT</span><h2>{title}</h2></div>
          <p><i className={status==="Complete"?"complete":""}/>{status}</p>
        </header>
        {children}
      </section>
      <aside className="compliance-journey-steps" aria-label="Payout account tips">
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
