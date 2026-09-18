"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useState,type ReactNode} from "react";
import {IconArrowLeft,IconArrowRight,IconCheck,IconCopy,IconDownload,IconLoader2} from "@tabler/icons-react";
import {CurrencyPairClip,tradePairAssets} from "./currency-pair-clip";
import {
  formatOrderDate,
  formatOrderStatus,
  formatTradeAmount,
  isBuyDirection,
  orderStatusClass,
  receivedAmount,
  destinationAmountSummary,
  tradeDirectionLabel,
  type TimelineEvent,
  type TradeItem,
} from "./dashboard-route-copy";
import {downloadTransactionReceipt} from "@/lib/transaction-receipt";
import {tradeFeeSummary} from "@/lib/trade-fees";
import {useToast} from "@/components/ui/toast";
import {RouteEmptyState} from "./route-empty-state";
import {useDashboardFinance} from "./dashboard-customer";

function Fact({label,children}:{label:string;children:ReactNode}){
  if(children==null||children===""||children==="—")return null;
  return <div className="activity-fact"><dt>{label}</dt><dd>{children}</dd></div>;
}

function CopyRow({label,value}:{label:string;value:string}){
  const [copied,setCopied]=useState(false);
  const {show}=useToast();
  async function copy(){
    try{
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(()=>setCopied(false),1600);
    }catch{
      show({tone:"warning",title:"Copy unavailable",message:"Select and copy the reference manually."});
    }
  }
  return <div className="activity-copy-row">
    <span>{label}</span>
    <strong className="mono">{value}</strong>
    <button type="button" onClick={()=>void copy()} aria-label={`Copy ${label}`}>
      {copied?<IconCheck size={15}/>:<IconCopy size={15}/>}
    </button>
  </div>;
}

function EmptyDetail({title,copy,retry=false}:{title:string;copy:string;retry?:boolean}){
  const router=useRouter();
  const imageSrc=retry?"/illustrations/account-error-3d.png":"/illustrations/account-not-found-3d.png";
  return <section className="dashboard-canvas dashboard-route-page activity-workspace" aria-label={title}>
    <RouteEmptyState title={title} detail={copy} imageSrc={imageSrc}>
      {retry?<button type="button" className="compliance-primary" onClick={()=>router.refresh()}>Try again <IconArrowRight size={17}/></button>:null}
      <Link className={retry?"compliance-secondary":"compliance-primary"} href="/dashboard/activity">
        {retry?"All activity":"Back to all activity"} <IconArrowRight size={17}/>
      </Link>
    </RouteEmptyState>
  </section>;
}

function DetailSection({kicker,title,titleId,children,aside}:{kicker:string;title:string;titleId:string;children:ReactNode;aside?:ReactNode}){
  return <section className="activity-soft activity-detail-card" aria-labelledby={titleId}>
    <header className="buy-soft-head">
      <div>
        <span className="overview-kicker">{kicker}</span>
        <h2 id={titleId}>{title}</h2>
      </div>
      {aside}
    </header>
    {children}
  </section>;
}

function asNumber(value:number|string|null|undefined){
  if(value==null||value==="")return null;
  const number=typeof value==="number"?value:Number(value);
  return Number.isFinite(number)?number:null;
}

function derivedExchangeRate(trade:TradeItem){
  if(trade.exchangeRate!=null&&trade.exchangeRate!=="")return String(trade.exchangeRate);
  const sent=asNumber(trade.sourceAmount);
  const got=asNumber(receivedAmount(trade));
  if(sent==null||got==null||sent===0)return null;
  const rate=got/sent;
  return rate.toLocaleString(undefined,{maximumFractionDigits:8});
}

function feeRows(trade:TradeItem,buy:boolean){
  const {lines,total}=tradeFeeSummary(trade,buy);
  const rows=lines.map(line=>({key:line.key,label:line.label,value:formatTradeAmount(line.amount,line.asset)}));
  if(total&&lines.length>1)rows.push({key:total.key,label:total.label,value:formatTradeAmount(total.amount,total.asset)});
  return rows;
}

export function ActivityDetailPage({
  trade,
  timeline,
  available,
  supportKind="ORDER",
}:{
  trade:TradeItem|null;
  timeline:TimelineEvent[];
  available:boolean;
  supportKind?:"RAMP"|"CONVERSION"|"ORDER";
}){
  const {show}=useToast();
  const [downloading,setDownloading]=useState(false);
  const {accountScope}=useDashboardFinance();

  if(!available){
    return <EmptyDetail title="Transaction unavailable" copy="We couldn’t load this transaction. Please try again." retry/>;
  }

  if(!trade){
    return <EmptyDetail title="Transaction not found" copy="This route may have been removed or is outside your account."/>;
  }

  const buy=isBuyDirection(trade.direction);
  const destination=destinationAmountSummary(trade);
  const pair=tradePairAssets(buy,trade.sourceAsset,trade.destinationAsset);
  const network=(buy?trade.destinationNetwork:trade.sourceNetwork)?.replaceAll("_"," ");
  const sourceNetwork=trade.sourceNetwork?.replaceAll("_"," ");
  const destinationNetwork=trade.destinationNetwork?.replaceAll("_"," ");
  const exchangeRate=derivedExchangeRate(trade);
  const fees=feeRows(trade,buy);
  const quoted=asNumber(trade.quotedDestinationAmount);
  const delivered=asNumber(receivedAmount(trade));
  const showQuoted=quoted!=null&&delivered!=null&&quoted!==delivered;
  const hasDestination=Boolean(trade.payoutAccountName||trade.beneficiaryName||trade.beneficiaryAccountName||trade.beneficiaryAccountMask||trade.payoutAccountMask);
  const hasPricing=fees.length>0||Boolean(exchangeRate);
  const hasNetwork=Boolean(network||sourceNetwork||destinationNetwork||trade.bridgeAsset);
  const hasLegs=Boolean(trade.legs&&trade.legs.length>0);
  const transferIds=[
    trade.depositReference?{label:"Deposit reference",value:trade.depositReference}:null,
    trade.transferReference?{label:"Payout reference",value:trade.transferReference}:null,
    trade.withdrawalReference?{label:"Provider withdrawal ID",value:trade.withdrawalReference}:null,
    trade.blockchainHash?{label:"Blockchain hash",value:trade.blockchainHash}:null,
    trade.sendingAddress?{label:"Sending address",value:trade.sendingAddress}:null,
    trade.settlementWalletAddress?{label:"Settlement address",value:trade.settlementWalletAddress}:null,
    trade.receivingAddress&&trade.receivingAddress!==trade.settlementWalletAddress?{label:"Receiving wallet",value:trade.receivingAddress}:null,
    trade.quoteId?{label:"Quote ID",value:trade.quoteId}:null,
    trade.destinationId?{label:"Destination ID",value:trade.destinationId}:null,
    {label:"Transaction ID",value:trade.id},
  ].filter((item):item is {label:string;value:string}=>Boolean(item?.value));

  async function downloadReceipt(){
    setDownloading(true);
    try{
      await downloadTransactionReceipt(trade!,timeline);
      show({tone:"success",title:"Receipt ready",message:"Your StrivePay receipt download has started."});
    }catch{
      show({tone:"danger",title:"Download failed",message:"The receipt could not be prepared. Try again."});
    }finally{
      setDownloading(false);
    }
  }

  const receiptButton=<button type="button" className="compliance-primary activity-receipt-button" disabled={downloading} onClick={()=>void downloadReceipt()}>
    {downloading?<IconLoader2 className="spin" size={16}/>:<IconDownload size={16}/>}
    {downloading?"Preparing…":"Download receipt"}
  </button>;

  return <section className="dashboard-canvas dashboard-route-page activity-workspace activity-detail-workspace" aria-labelledby="activity-detail-title">
    <header className="sell-toolbar">
      <div>
        <p id="activity-detail-title">{buy?"Buy":"Sell"} details</p>
        <p className="sell-toolbar-hint">Amounts, fees, destination, and progress for this route.</p>
      </div>
      <div className="activity-detail-toolbar-actions">
        {receiptButton}
        <Link className="compliance-secondary sell-toolbar-action" href="/dashboard/activity"><IconArrowLeft size={16}/> All activity</Link>
        <Link className="compliance-secondary sell-toolbar-action" href={`/dashboard/support?kind=${supportKind}&activity=${encodeURIComponent(trade.id)}&scope=${accountScope}`}>Get help with this transaction</Link>
      </div>
    </header>

    <section className="activity-soft activity-detail-card" aria-label="Conversion summary">
      <div className="buy-settlement-hero">
        <span className="activity-direction">
          <CurrencyPairClip from={pair.from} to={pair.to} size="md"/>
          <span className="buy-settlement-title">
            <strong>{tradeDirectionLabel(trade.direction,trade.status)}</strong>
            <small>{trade.sourceAsset} → {trade.destinationAsset}</small>
          </span>
        </span>
        <span className={`activity-status ${orderStatusClass(trade.status)}`}>{formatOrderStatus(trade.status)}</span>
      </div>
      <dl className="activity-facts">
        <Fact label="Sent">{formatTradeAmount(trade.sourceAmount,trade.sourceAsset)}</Fact>
        <Fact label={destination.label}>{destination.value}</Fact>
        {showQuoted?<Fact label="Quoted">{formatTradeAmount(trade.quotedDestinationAmount,trade.destinationAsset)}</Fact>:null}
        <Fact label="Date">{formatOrderDate(trade.createdAt)}</Fact>
        {trade.updatedAt&&trade.updatedAt!==trade.createdAt?<Fact label="Updated">{formatOrderDate(trade.updatedAt)}</Fact>:null}
        {trade.occurredAt&&trade.occurredAt!==trade.createdAt&&trade.occurredAt!==trade.updatedAt?<Fact label={orderStatusClass(trade.status)==="completed"?"Settled":"Recorded"}>{formatOrderDate(trade.occurredAt)}</Fact>:null}
      </dl>
    </section>

    {hasPricing?<DetailSection kicker="Pricing" title="Fees and rate" titleId="activity-pricing-title">
      <dl className="activity-facts">
        {fees.map(fee=><Fact key={fee.key} label={fee.label}>{fee.value}</Fact>)}
        {exchangeRate?<Fact label="Exchange rate">1 {trade.sourceAsset} = {exchangeRate} {trade.destinationAsset}</Fact>:null}
      </dl>
    </DetailSection>:null}

    {hasNetwork?<DetailSection kicker="Network" title="Transfer route" titleId="activity-network-title">
      <dl className="activity-facts">
        {network?<Fact label="Network">{network}</Fact>:null}
        {!network&&sourceNetwork?<Fact label="From network">{sourceNetwork}</Fact>:null}
        {!network&&destinationNetwork?<Fact label="To network">{destinationNetwork}</Fact>:null}
        {trade.bridgeAsset?<Fact label="Bridge">{trade.bridgeAsset}{trade.bridgeNetwork?` · ${trade.bridgeNetwork.replaceAll("_"," ")}`:""}</Fact>:null}
      </dl>
      {trade.bridgeAsset?<ol className="activity-panel-list activity-timeline-list activity-detail-steps">
        <li><strong>From</strong><span>{trade.sourceAsset}{trade.sourceNetwork?` on ${trade.sourceNetwork.replaceAll("_"," ")}`:""}</span></li>
        <li><strong>Conversion</strong><span>Through {trade.bridgeAsset}{trade.bridgeNetwork?` on ${trade.bridgeNetwork.replaceAll("_"," ")}`:""}</span></li>
        <li><strong>To</strong><span>{trade.destinationAsset}{trade.destinationNetwork?` on ${trade.destinationNetwork.replaceAll("_"," ")}`:""}</span></li>
      </ol>:null}
    </DetailSection>:null}

    {hasDestination?<DetailSection kicker="Destination" title={trade.beneficiaryName||trade.beneficiaryAccountName||trade.payoutAccountName||"Payout account"} titleId="activity-destination-title">
      <dl className="activity-facts">
        {trade.beneficiaryAccountName||trade.payoutAccountName?<Fact label="Account">{trade.beneficiaryAccountName||trade.payoutAccountName}</Fact>:null}
        {trade.beneficiaryAccountMask||trade.payoutAccountMask?<Fact label="Account details">{trade.beneficiaryAccountMask||trade.payoutAccountMask}</Fact>:null}
        {trade.beneficiaryCurrency?<Fact label="Currency">{trade.beneficiaryCurrency}</Fact>:null}
        {trade.recipientType?<Fact label="Ownership">{trade.recipientType==="THIRD_PARTY"?"Someone else":"My account"}</Fact>:null}
        {trade.payoutAccountId?<Fact label="Account link">
          <Link className="compliance-link-button" href={`/dashboard/sell/${encodeURIComponent(trade.payoutAccountId)}`}>
            View payout account <IconArrowRight size={14}/>
          </Link>
        </Fact>:null}
      </dl>
    </DetailSection>:null}

    {hasLegs?<DetailSection kicker="Route" title="Transfer steps" titleId="activity-legs-title">
      <ul className="activity-panel-list">
        {trade.legs!.map((leg,index)=><li key={`leg-${index}`}>
          <strong>{`Step ${leg.sequence??index+1}`}</strong>
          <span>{formatOrderStatus(leg.status||"UNKNOWN")}</span>
        </li>)}
      </ul>
    </DetailSection>:null}

    {timeline.length>0?<DetailSection kicker="Progress" title="Timeline" titleId="activity-timeline-title">
      <ol className="activity-panel-list activity-timeline-list">
        {timeline.map(event=><li key={event.id}>
          <strong>{formatOrderStatus(event.toStatus)}</strong>
          <time dateTime={event.occurredAt}>{formatOrderDate(event.occurredAt)}</time>
        </li>)}
      </ol>
    </DetailSection>:null}

    {transferIds.length>0?<DetailSection kicker="References" title="Transfer IDs" titleId="activity-refs-title">
      <div className="activity-detail-ids">
        {transferIds.map(item=><CopyRow key={item.label} label={item.label} value={item.value}/>)}
      </div>
    </DetailSection>:null}

    <div className="activity-detail-actions">
      <Link className="compliance-link-button" href={buy?"/dashboard/buy":"/dashboard/sell"}>{buy?"Buy again":"Sell again"}</Link>
    </div>
  </section>;
}
