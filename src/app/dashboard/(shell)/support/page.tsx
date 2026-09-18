"use client";
import {SupportWorkspace} from "@/components/support-workspace";
import {useDashboardCustomer,useDashboardFinance} from "@/components/dashboard-customer";
import {Suspense} from "react";
import {useSearchParams} from "next/navigation";
import {parseSupportActivity} from "@/lib/support-activity";
export default function SupportPage(){
  return <Suspense fallback={<p role="status">Loading support…</p>}><SupportContent/></Suspense>;
}
function SupportContent(){
  const params=useSearchParams();
  const {accountScope}=useDashboardFinance();
  const customer=useDashboardCustomer();
  const canWrite=accountScope==="PERSONAL"||["OWNER","ADMINISTRATOR","OPERATOR"].includes(customer.membershipRole??"");
  const activity=params.get("scope")===accountScope?parseSupportActivity(params.get("kind"),params.get("activity")):null;
  return <SupportWorkspace key={`${accountScope}:${activity?.kind??""}:${activity?.id??""}`} scope={accountScope} canWrite={canWrite} initialActivity={activity}/>;
}
