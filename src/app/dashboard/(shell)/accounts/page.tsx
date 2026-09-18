import {AccountsPage} from "@/components/accounts-page";
import {requireDashboardCustomer} from "@/lib/dashboard-access";

export default async function AccountsDashboardPage(){
  await requireDashboardCustomer("/dashboard/accounts");
  return <AccountsPage/>;
}
