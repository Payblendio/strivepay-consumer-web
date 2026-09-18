import type {ReactNode} from "react";
import {DashboardFrame} from "@/components/dashboard-frame";
import {loadAccountSetup,loadFinancialMutationAccess,requireDashboardCustomer,resolveDashboardAccountScope} from "@/lib/dashboard-access";

export default async function DashboardShellLayout({children}:{children:ReactNode}){
  const {token,customer}=await requireDashboardCustomer();
  const scope=await resolveDashboardAccountScope(customer);
  const [result,canMutateFinances]=await Promise.all([
    loadAccountSetup(token,scope),
    loadFinancialMutationAccess(token,scope),
  ]);
  const setup=result.status==="ready"?result.setup:null;
  return <DashboardFrame customer={customer} setup={setup} accountScope={scope} canMutateFinances={canMutateFinances}>{children}</DashboardFrame>;
}
