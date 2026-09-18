import {ActivityDetailPage} from "@/components/activity-detail-page";
import {TransactionRealtimeRefresh} from "@/components/transaction-realtime-refresh";
import {
  tradesFromConversions,
  type ConversionItem,
  type TimelineEvent,
  type TradeItem,
} from "@/components/dashboard-route-copy";
import {accountScopeHeaders,backendJson,requireDashboardCustomer,resolveDashboardAccountScope} from "@/lib/dashboard-access";

type Params={params:Promise<{id:string}>};

type DirectTimeline={id:string;status:string;eventSubtype?:string|null;occurredAt:string};
type DirectDetail={id:string;direction:string;status:string;fiatCurrency?:string;fiatAmount?:number|string;cryptoAsset?:string;cryptoAmount?:number|string;network?:string;feeCurrency?:string;providerFeeAmount?:number|string;merchantFeeAmount?:number|string;exchangeRate?:number|string;blockchainHash?:string;transferReference?:string;occurredAt?:string;createdAt:string;updatedAt?:string;settlementWalletAddress?:string;sendingAddress?:string;receivingAddress?:string;payoutAccountId?:string;payoutAccountName?:string;payoutAccountMask?:string;recipientType?:string;beneficiaryName?:string;beneficiaryAccountName?:string;beneficiaryCurrency?:string;beneficiaryAccountMask?:string};

function mapDirect(item:DirectDetail):TradeItem{const fiat=item.fiatCurrency||item.beneficiaryCurrency;return {id:item.id,status:item.status,createdAt:item.occurredAt??item.createdAt,updatedAt:item.updatedAt,direction:item.direction,sourceAsset:item.direction==="FIAT_TO_CRYPTO"?fiat:item.cryptoAsset,sourceNetwork:item.direction==="CRYPTO_TO_FIAT"?item.network:null,sourceAmount:item.direction==="FIAT_TO_CRYPTO"?item.fiatAmount:item.cryptoAmount,destinationAsset:item.direction==="FIAT_TO_CRYPTO"?item.cryptoAsset:fiat,destinationNetwork:item.direction==="FIAT_TO_CRYPTO"?item.network:null,deliveredAmount:item.direction==="FIAT_TO_CRYPTO"?item.cryptoAmount:item.fiatAmount,activityKind:"DIRECT",providerFeeAmount:item.providerFeeAmount,merchantFeeAmount:item.merchantFeeAmount,feeCurrency:item.feeCurrency,exchangeRate:item.exchangeRate,blockchainHash:item.blockchainHash,transferReference:item.transferReference,occurredAt:item.occurredAt,settlementWalletAddress:item.settlementWalletAddress,sendingAddress:item.sendingAddress,receivingAddress:item.receivingAddress,payoutAccountId:item.payoutAccountId,payoutAccountName:item.payoutAccountName,payoutAccountMask:item.payoutAccountMask,recipientType:item.recipientType,beneficiaryName:item.beneficiaryName,beneficiaryAccountName:item.beneficiaryAccountName,beneficiaryCurrency:item.beneficiaryCurrency||item.fiatCurrency,beneficiaryAccountMask:item.beneficiaryAccountMask};}

function mapDirectTimeline(events:DirectTimeline[]):TimelineEvent[]{
  return events.map(event=>({
    id:event.id,
    fromStatus:null,
    toStatus:event.status||event.eventSubtype||"UPDATED",
    occurredAt:event.occurredAt,
  }));
}

export default async function ActivityDetailDashboardPage({params}:Params){
  const {id}=await params;
  const {token,customer}=await requireDashboardCustomer(`/dashboard/activity/${id}`);
  const scope=await resolveDashboardAccountScope(customer);
  const headers=accountScopeHeaders(scope);

  const [tradeResponse,timelineResponse]=await Promise.all([
    backendJson<TradeItem>(token,`/v1/transactions/${encodeURIComponent(id)}`,headers),
    backendJson<TimelineEvent[]>(token,`/v1/transactions/${encodeURIComponent(id)}/timeline`,headers),
  ]);

  if(tradeResponse.ok&&tradeResponse.value?.id){
    return <><TransactionRealtimeRefresh scope={scope}/><ActivityDetailPage
      trade={tradeResponse.value}
      timeline={Array.isArray(timelineResponse.value)?timelineResponse.value:[]}
      available
    /></>;
  }

  const [directResponse,directTimeline]=await Promise.all([
    backendJson<DirectDetail>(token,`/v1/account-activity/${encodeURIComponent(id)}`,headers),
    backendJson<DirectTimeline[]>(token,`/v1/account-activity/${encodeURIComponent(id)}/timeline`,headers),
  ]);
  const direct=directResponse.ok&&directResponse.value?.id?mapDirect(directResponse.value):null;
  if(direct){
    return <><TransactionRealtimeRefresh scope={scope}/><ActivityDetailPage trade={direct} supportKind="RAMP" timeline={mapDirectTimeline(Array.isArray(directTimeline.value)?directTimeline.value:[])} available/></>;
  }

  const [conversionResponse,conversionTimeline]=await Promise.all([
    backendJson<ConversionItem>(token,`/v1/conversions/${encodeURIComponent(id)}`,headers),
    backendJson<DirectTimeline[]>(token,`/v1/conversions/${encodeURIComponent(id)}/timeline`,headers),
  ]);
  const conversion=conversionResponse.ok&&conversionResponse.value?.id?tradesFromConversions([conversionResponse.value])[0]:null;
  const listFailed=!directResponse.ok&&![400,404].includes(directResponse.status)&&tradeResponse.status!==404&&tradeResponse.status!==400;
  const notFound=!conversion&&[400,404].includes(tradeResponse.status)&&[400,404].includes(directResponse.status)&&[400,404].includes(conversionResponse.status);

  return <><TransactionRealtimeRefresh scope={scope}/><ActivityDetailPage
    trade={conversion}
    supportKind="CONVERSION"
    timeline={conversion?mapDirectTimeline(Array.isArray(conversionTimeline.value)?conversionTimeline.value:[]):[]}
    available={(!listFailed||conversionResponse.ok)&&(Boolean(conversion)||notFound)}
  /></>;
}
