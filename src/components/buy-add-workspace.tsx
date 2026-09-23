"use client";

import Link from "next/link";
import {IconX} from "@tabler/icons-react";
import type {ReactNode} from "react";
import type {DashboardCustomer} from "@/lib/dashboard-access";
import {DashboardCustomerProvider} from "./dashboard-customer";
import {BrandLogo} from "./brand-logo";
import {ThemeToggle} from "./theme-toggle";

export function BuyAddWorkspace({customer,children}:{customer:DashboardCustomer;children:ReactNode}){
  return <DashboardCustomerProvider customer={customer}>
    <main className="compliance-workspace">
      <div className="compliance-workspace-grid" aria-hidden="true"/>
      <header className="compliance-topbar">
        <Link className="compliance-brand" href="/dashboard" aria-label="StrivePay dashboard">
          <BrandLogo width={1937} height={621} priority/>
        </Link>
        <div className="compliance-topbar-label"><span>Buy crypto</span><b>Pay-in</b></div>
        <div className="compliance-topbar-actions">
          <ThemeToggle placement="header"/>
          <div className="compliance-account">
            <div><strong>{customer.givenName} {customer.familyName}</strong><small>{customer.email}</small></div>
          </div>
          <Link className="compliance-close" href="/dashboard/buy" aria-label="Close and return to buy">
            <IconX size={22}/>
          </Link>
        </div>
      </header>
      <section className="compliance-stage" aria-labelledby="buy-add-title">{children}</section>
    </main>
  </DashboardCustomerProvider>;
}

export function BuyAddPanel({children,country}:{children:ReactNode;country?:string}){
  const us=(country??"").toUpperCase()==="US";
  return <div className="compliance-window buy-add-window">
    <header className="compliance-window-hero buy-add-hero">
      <div>
        <span>BUY CRYPTO</span>
        <h1 id="buy-add-title">{us?"Set up USD pay-in.":"Request pay-in."}</h1>
        <p>{us
          ?"Get reusable US bank details, transfer USD from your bank, then buy. Optional: pull via Plaid on Accounts."
          :"Choose a currency you do not already have a deposit account for."}</p>
      </div>
    </header>
    <div className="compliance-window-body buy-add-body">
      <section className="compliance-form-panel">{children}</section>
    </div>
  </div>;
}
