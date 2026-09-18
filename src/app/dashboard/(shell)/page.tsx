import {DashboardOverview,type DashboardTrade} from "@/components/dashboard-overview";
import {TransactionRealtimeRefresh} from "@/components/transaction-realtime-refresh";
import {mergeTradeActivity,tradesFromRampActivity,type RampActivityItem,type TradeItem} from "@/components/dashboard-route-copy";
import {accountScopeHeaders,backendJson,requireDashboardCustomer,resolveDashboardAccountScope} from "@/lib/dashboard-access";

export default async function Dashboard(){
  const {token,customer}=await requireDashboardCustomer("/dashboard");
  const scope=await resolveDashboardAccountScope(customer);
  const headers=accountScopeHeaders(scope);
  const [tradesResponse,directResponse]=await Promise.all([
    backendJson<TradeItem[]>(token,"/v1/transactions?page=0&size=100",headers),
    backendJson<RampActivityItem[]>(token,"/v1/account-activity",headers),
  ]);
  const directAvailable=directResponse.ok&&Array.isArray(directResponse.value);
  const tradesAvailable=tradesResponse.ok&&Array.isArray(tradesResponse.value);
  const merged=mergeTradeActivity(tradesFromRampActivity(directAvailable?directResponse.value!:[]),tradesAvailable?tradesResponse.value!:[]);
  const trades:DashboardTrade[]=merged.map(item=>({id:item.id,status:item.status,createdAt:item.createdAt,dateBasis:item.dateBasis,direction:item.direction??"",sourceAsset:item.sourceAsset??"",sourceAmount:item.sourceAmount,destinationAsset:item.destinationAsset??"",quotedDestinationAmount:item.quotedDestinationAmount,deliveredAmount:item.deliveredAmount}));
  return <><TransactionRealtimeRefresh scope={scope}/><DashboardOverview trades={trades} tradeDataAvailable={tradesAvailable||directAvailable} partialData={tradesAvailable!==directAvailable} historyLimited={tradesAvailable&&tradesResponse.value!.length>=100}/></>;
}
