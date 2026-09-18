"use client";

import type {ReactNode} from "react";
import {BuyAddWorkspace} from "@/components/buy-add-workspace";
import {useDashboardCustomer} from "@/components/dashboard-customer";

export default function BuyAddLayout({children}:{children:ReactNode}){
  const customer=useDashboardCustomer();
  return <BuyAddWorkspace customer={customer}>{children}</BuyAddWorkspace>;
}
