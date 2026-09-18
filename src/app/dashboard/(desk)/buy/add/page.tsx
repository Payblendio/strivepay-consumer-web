"use client";

import {BuyAddPanel} from "@/components/buy-add-workspace";
import {PayInAccountEditor} from "@/components/payin-account-editor";
import {useDashboardCustomer} from "@/components/dashboard-customer";

export default function BuyAddPage(){
  const customer=useDashboardCustomer();
  return <BuyAddPanel country={customer.country}>
    <PayInAccountEditor customer={customer}/>
  </BuyAddPanel>;
}
