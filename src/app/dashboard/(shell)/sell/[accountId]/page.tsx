import {SellAccountPage} from "@/components/sell-route-page";

export default async function SellAccountDashboardPage({params}:{params:Promise<{accountId:string}>}){
  const {accountId}=await params;
  return <SellAccountPage accountId={accountId}/>;
}
