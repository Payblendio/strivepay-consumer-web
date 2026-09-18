"use client";

import type {ReactNode} from "react";
import {BuyUpdateWorkspace} from "@/components/buy-update-workspace";
import {useDashboardCustomer} from "@/components/dashboard-customer";

export default function BuyUpdateLayout({children}:{children:ReactNode}){
  const customer=useDashboardCustomer();
  return <BuyUpdateWorkspace customer={customer}>{children}</BuyUpdateWorkspace>;
}
