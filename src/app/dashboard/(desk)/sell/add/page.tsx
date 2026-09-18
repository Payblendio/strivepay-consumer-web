"use client";

import {SellAddPanel} from "@/components/sell-add-workspace";
import {PayoutAccountEditor} from "@/components/payout-account-editor";
import {useDashboardCustomer} from "@/components/dashboard-customer";

export default function SellAddPage(){
  const customer=useDashboardCustomer();
  return <SellAddPanel title="Bank details">
    <PayoutAccountEditor customer={customer}/>
  </SellAddPanel>;
}
