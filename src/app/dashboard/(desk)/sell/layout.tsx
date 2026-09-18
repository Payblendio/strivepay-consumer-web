"use client";

import type {ReactNode} from "react";
import {SellAddWorkspace} from "@/components/sell-add-workspace";
import {useDashboardCustomer} from "@/components/dashboard-customer";

export default function SellDeskLayout({children}:{children:ReactNode}){
  const customer=useDashboardCustomer();
  return <SellAddWorkspace customer={customer}>{children}</SellAddWorkspace>;
}
