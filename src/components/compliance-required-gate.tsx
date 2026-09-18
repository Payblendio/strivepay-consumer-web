"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {IconArrowRight} from "@tabler/icons-react";
import {useDashboardCustomer,useDashboardFinance,useDashboardSetup} from "./dashboard-customer";
import {accountSetupHref} from "./dashboard-route-copy";

type ComplianceRequiredGateProps={
  titleId:string;
  title:string;
  detail:string;
  className?:string;
};

/** Shared buy/sell/activity-style gate when compliance is not approved. */
export function ComplianceRequiredGate({titleId,title,detail,className=""}:ComplianceRequiredGateProps){
  const customer=useDashboardCustomer();
  const setup=useDashboardSetup();
  const {accountScope}=useDashboardFinance();
  const router=useRouter();
  if(!setup)return <section className={`dashboard-canvas dashboard-route-page ${className}`.trim()} aria-labelledby={titleId}>
    <header className="sell-toolbar"><div><p id={titleId}>Setup status unavailable</p><p className="sell-toolbar-hint" role="status">We couldn’t check your setup. Refresh to try again.</p></div></header>
    <div className="activity-empty-cta"><button type="button" className="compliance-secondary" onClick={()=>router.refresh()}>Retry setup status</button></div>
  </section>;
  const href=accountSetupHref(customer.accountType,accountScope);
  const label=setup.pending?"Verify and start":"Start converting";
  return <section className={`dashboard-canvas dashboard-route-page ${className}`.trim()} aria-labelledby={titleId}>
    <header className="sell-toolbar">
      <div>
        <p id={titleId}>{title}</p>
        <p className="sell-toolbar-hint">{detail}</p>
      </div>
    </header>
    <div className="activity-empty-cta">
      <Link className="compliance-primary" href={href}>
        {label} <IconArrowRight size={17}/>
      </Link>
    </div>
  </section>;
}

export function useComplianceApproved(){
  return useDashboardSetup()?.approved===true;
}
