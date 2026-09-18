"use client";

import {BuyUpdatePanel} from "@/components/buy-update-workspace";
import {CryptoRouteEditor} from "@/components/crypto-route-editor";
import {useDashboardCustomer} from "@/components/dashboard-customer";

export default function BuyUpdatePage(){
  const customer=useDashboardCustomer();
  return <BuyUpdatePanel title="Wallet details">
    <CryptoRouteEditor customer={customer}/>
  </BuyUpdatePanel>;
}
