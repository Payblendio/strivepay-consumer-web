import {ActivityPage} from "@/components/activity-page";
import {TransactionRealtimeRefresh} from "@/components/transaction-realtime-refresh";
import {type TradeItem} from "@/components/dashboard-route-copy";
import {accountScopeHeaders,backendJson,requireDashboardCustomer,resolveDashboardAccountScope} from "@/lib/dashboard-access";

type Search={page?:string;size?:string;direction?:string;status?:string};

type ActivityFeedItem={
  id:string;
  kind?:string;
  direction?:string;
  status:string;
  sourceAsset?:string|null;
  sourceAmount?:number|string|null;
  destinationAsset?:string|null;
  destinationAmount?:number|string|null;
  createdAt:string;
};

type ActivityFeed={
  page:number;
  size:number;
  total:number;
  items:ActivityFeedItem[];
  statuses?:string[];
};

function asTrade(item:ActivityFeedItem):TradeItem{
  return {
    id:item.id,
    status:item.status,
    createdAt:item.createdAt,
    direction:item.direction,
    sourceAsset:item.sourceAsset??undefined,
    sourceAmount:item.sourceAmount??undefined,
    destinationAsset:item.destinationAsset??undefined,
    deliveredAmount:item.destinationAmount??undefined,
    activityKind:item.kind==="ORDER"?"ORDER":"DIRECT",
  };
}

function clampPage(value:string|undefined){
  const number=Number(value??"0");
  return Number.isFinite(number)&&number>=0?Math.floor(number):0;
}

function clampSize(value:string|undefined){
  const allowed=new Set([10,25,50]);
  const number=Number(value??"10");
  if(!Number.isFinite(number))return 10;
  const size=Math.floor(number);
  return allowed.has(size)?size:10;
}

export default async function ActivityDashboardPage({searchParams}:{searchParams:Promise<Search>}){
  const params=await searchParams;
  const {token,customer}=await requireDashboardCustomer("/dashboard/activity");
  const scope=await resolveDashboardAccountScope(customer);
  const page=clampPage(params.page);
  const size=clampSize(params.size);
  const directionRaw=(params.direction||"ALL").toUpperCase();
  const direction=directionRaw==="BUY"||directionRaw==="FIAT_TO_CRYPTO"?"BUY"
    :directionRaw==="SELL"||directionRaw==="CRYPTO_TO_FIAT"?"SELL"
    :"ALL";
  const status=(params.status||"ALL").toUpperCase();
  const query=new URLSearchParams({
    page:String(page),
    size:String(size),
    ...(direction!=="ALL"?{direction}:{}),
    ...(status!=="ALL"?{status}:{}),
  });
  const feed=await backendJson<ActivityFeed>(token,`/v1/activity?${query.toString()}`,accountScopeHeaders(scope));
  const items=Array.isArray(feed.value?.items)?feed.value.items.map(asTrade):[];
  const total=typeof feed.value?.total==="number"?feed.value.total:0;
  const resolvedPage=typeof feed.value?.page==="number"?feed.value.page:page;
  const resolvedSize=typeof feed.value?.size==="number"?feed.value.size:size;
  const statuses=["ALL",...(Array.isArray(feed.value?.statuses)?feed.value.statuses:[])];

  return <><TransactionRealtimeRefresh scope={scope}/><ActivityPage
    trades={items}
    tradeDataAvailable={feed.ok}
    loadStatus={feed.status}
    page={resolvedPage}
    size={resolvedSize}
    total={total}
    direction={direction}
    status={status}
    statuses={statuses}
  /></>;
}
