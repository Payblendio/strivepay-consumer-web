import type {ReactNode} from "react";
import {DashboardCustomerProvider} from "@/components/dashboard-customer";
import {loadFinancialMutationAccess,requireDashboardCustomer,resolveDashboardAccountScope} from "@/lib/dashboard-access";

export default async function DashboardDeskLayout({children}:{children:ReactNode}){
  const {token,customer}=await requireDashboardCustomer();
  const scope=await resolveDashboardAccountScope(customer);
  const canMutateFinances=await loadFinancialMutationAccess(token,scope);
  return <DashboardCustomerProvider customer={customer} accountScope={scope} canMutateFinances={canMutateFinances}>{children}</DashboardCustomerProvider>;
}
