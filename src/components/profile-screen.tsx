"use client";

import Link from "next/link";
import {CircleFlag} from "react-circle-flags";
import {IconArrowLeft} from "@tabler/icons-react";
import {useDashboardCustomer} from "@/components/dashboard-customer";

function countryLabel(code:string){
  try{return new Intl.DisplayNames(["en"],{type:"region"}).of(code.toUpperCase())??code;}
  catch{return code;}
}

function Fact({label,children}:{label:string;children:React.ReactNode}){
  return <div className="activity-fact"><dt>{label}</dt><dd>{children||"—"}</dd></div>;
}

export function ProfileScreen(){
  const customer=useDashboardCustomer();
  const countryCode=customer.country?.trim().toLowerCase()||"";

  return <section className="dashboard-canvas dashboard-route-page buy-workspace account-workspace" aria-labelledby="profile-page-title">
    <header className="buy-toolbar">
      <p id="profile-page-title">Account details from your StrivePay login.</p>
      <Link className="compliance-secondary buy-toolbar-action" href="/dashboard/settings"><IconArrowLeft size={16}/> Settings</Link>
    </header>

    <section className="activity-soft" aria-label="Profile details">
      <header className="buy-soft-head">
        <div>
          <span className="overview-kicker">Account</span>
          <h2>Profile</h2>
          <p>Name, contact, and verification status for this login.</p>
        </div>
      </header>

      <dl className="activity-facts account-profile-facts">
        <Fact label="Name">{`${customer.givenName} ${customer.familyName}`.trim()}</Fact>
        <Fact label="Email">{customer.email}</Fact>
        <Fact label="Phone">{customer.phoneE164?.trim()||"—"}</Fact>
        <Fact label="Country">{countryCode
          ?<span className="account-profile-country"><span className="country-flag account-profile-flag" aria-hidden="true"><CircleFlag countryCode={countryCode} height="22"/></span><span>{countryLabel(customer.country)}</span></span>
          :"—"}</Fact>
        <Fact label="Account type">{customer.accountType||"—"}</Fact>
        <Fact label="Email verified">{customer.emailVerified?"Yes":"No"}</Fact>
      </dl>
    </section>
  </section>;
}
