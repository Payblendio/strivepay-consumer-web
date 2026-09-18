import {BuyRoutePage} from "@/components/buy-route-page";
import {TransactionRealtimeRefresh} from "@/components/transaction-realtime-refresh";
import {buyOrdersFromActivity,buyOrdersFromTrades,mergeBuyOrders,type RampActivityItem,type TradeItem} from "@/components/dashboard-route-copy";
import {accountScopeHeaders,backendJson,requireDashboardCustomer,resolveDashboardAccountScope} from "@/lib/dashboard-access";

export default async function BuyDashboardPage(){
  const {token,customer}=await requireDashboardCustomer("/dashboard/buy");
  const scope=await resolveDashboardAccountScope(customer);
  const headers=accountScopeHeaders(scope);
  const [activity,trades]=await Promise.all([
    backendJson<RampActivityItem[]>(token,"/v1/account-activity",headers),
    backendJson<TradeItem[]>(token,"/v1/transactions?page=0&size=100",headers),
  ]);
  const activityAvailable=activity.ok&&Array.isArray(activity.value);
  const tradesAvailable=trades.ok&&Array.isArray(trades.value);
  const orders=mergeBuyOrders(
    buyOrdersFromActivity(activityAvailable?activity.value!:[]),
    buyOrdersFromTrades(tradesAvailable?trades.value!:[]),
  );
  return <><TransactionRealtimeRefresh scope={scope}/><BuyRoutePage orders={orders} historyAvailable={activityAvailable||tradesAvailable} historyPartial={activityAvailable!==tradesAvailable} historyLimited={tradesAvailable&&trades.value!.length>=100}/></>;
}
