"use client";

import Image from "next/image";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useMemo,useState,useTransition} from "react";
import {IconArrowDownLeft,IconArrowRight,IconArrowUpRight,IconRefresh} from "@tabler/icons-react";
import {useDashboardCustomer,useDashboardFinance,useDashboardSetup} from "./dashboard-customer";
import {
  accountSetupHref,
  formatOrderDateShort,
  formatOrderStatus,
  formatTradeAmount,
  isBuyDirection,
  orderStatusClass,
  destinationAmountSummary,
  tradeDirectionLabel,
  type AccountSetupState,
} from "./dashboard-route-copy";
import {CurrencyPairClip,tradePairAssets} from "./currency-pair-clip";
import {assetLogo,fiatLogo} from "./money-route-controls";
import {RateCalculator} from "./rate-calculator";

export type DashboardTrade={
  id:string;
  status:string;
  createdAt:string;
  dateBasis?:"created"|"updated";
  direction:"FIAT_TO_CRYPTO"|"CRYPTO_TO_FIAT"|string;
  sourceAsset:string;
  sourceAmount?:number|string;
  destinationAsset:string;
  quotedDestinationAmount?:number|string;
  deliveredAmount?:number|string|null;
};

type DashboardOverviewProps={trades:DashboardTrade[];tradeDataAvailable:boolean;partialData?:boolean;historyLimited?:boolean};

const chartWidth=760,chartTop=34,chartBottom=236,chartLeft=34,chartRight=742;
const UTC_MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function utcChartLabel(date:Date){return `${UTC_MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;}

export function tradeChartData(trades:DashboardTrade[],today=new Date()){
  const todayUtc=Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate());
  const days=Array.from({length:14},(_,index)=>{
    const date=new Date(todayUtc-(13-index)*86400000);
    return{key:date.toISOString().slice(0,10),date,buy:0,sell:0};
  });
  const positions=new Map(days.map((day,index)=>[day.key,index]));
  for(const trade of trades){
    const timestamp=new Date(trade.createdAt);
    if(Number.isNaN(timestamp.getTime()))continue;
    const key=timestamp.toISOString().slice(0,10),index=positions.get(key);
    if(index===undefined)continue;
    if(trade.direction==="FIAT_TO_CRYPTO")days[index].buy+=1;
    if(trade.direction==="CRYPTO_TO_FIAT")days[index].sell+=1;
  }
  const maximum=Math.max(4,Math.ceil(Math.max(...days.flatMap(day=>[day.buy,day.sell]))/4)*4);
  const point=(value:number,index:number)=>{
    const x=chartLeft+(index/(days.length-1))*(chartRight-chartLeft);
    const y=chartBottom-(value/maximum)*(chartBottom-chartTop);
    return[x,y] as const;
  };
  const path=(key:"buy"|"sell")=>days.map((day,index)=>{const[x,y]=point(day[key],index);return`${index?"L":"M"}${x.toFixed(1)} ${y.toFixed(1)}`}).join(" ");
  const buyPath=path("buy"),sellPath=path("sell");
  const[firstX]=point(days[0].buy,0),[lastX]=point(days.at(-1)?.buy??0,days.length-1);
  return{
    days,
    maximum,
    buyPath,
    sellPath,
    buyArea:`M${firstX.toFixed(1)} ${chartBottom} ${buyPath.replace(/^M/,"L")} L${lastX.toFixed(1)} ${chartBottom} Z`,
    buyCount:days.reduce((total,day)=>total+day.buy,0),
    sellCount:days.reduce((total,day)=>total+day.sell,0),
    periodCount:days.reduce((total,day)=>total+day.buy+day.sell,0),
  };
}

const supportedAssets=[
  {symbol:"BTC",kind:"Coin",src:"/branding/crypto/btc.svg"},
  {symbol:"Ethereum",kind:"Network",src:"/branding/networks/ETHEREUM.png"},
  {symbol:"ETH",kind:"Coin",src:"/branding/crypto/eth.svg"},
  {symbol:"USDC",kind:"Token",src:"/branding/tokens/USDC.png"},
  {symbol:"Solana",kind:"Network",src:"/branding/networks/SOLANA.png"},
  {symbol:"SOL",kind:"Coin",src:"/branding/crypto/sol.svg"},
  {symbol:"USDT",kind:"Token",src:"/branding/tokens/USDT.png"},
  {symbol:"Base",kind:"Network",src:"/branding/networks/BASE.png"},
  {symbol:"XRP",kind:"Coin",src:"/branding/crypto/xrp.svg"},
  {symbol:"Arbitrum",kind:"Network",src:"/branding/networks/ARBITRUM.png"},
  {symbol:"BNB",kind:"Coin",src:"/branding/crypto/bnb.svg"},
  {symbol:"BNB Chain",kind:"Network",src:"/branding/networks/BNB_SMART_CHAIN.png"},
  {symbol:"EURC",kind:"Token",src:"/branding/tokens/EURC.png"},
  {symbol:"ADA",kind:"Coin",src:"/branding/crypto/ada.svg"},
  {symbol:"Polygon",kind:"Network",src:"/branding/networks/POLYGON.png"},
  {symbol:"MATIC",kind:"Coin",src:"/branding/crypto/matic.svg"},
  {symbol:"Avalanche",kind:"Network",src:"/branding/networks/AVALANCHE.png"},
  {symbol:"DOGE",kind:"Coin",src:"/branding/crypto/doge.svg"},
  {symbol:"CUSD",kind:"Token",src:"/branding/tokens/CUSD.png"},
  {symbol:"Celo",kind:"Network",src:"/branding/networks/CELO.png"},
  {symbol:"LINK",kind:"Coin",src:"/branding/crypto/link.svg"},
  {symbol:"Optimism",kind:"Network",src:"/branding/networks/OP_MAINNET.png"},
  {symbol:"XLM",kind:"Coin",src:"/branding/crypto/xlm.svg"},
  {symbol:"Tron",kind:"Network",src:"/branding/networks/TRON.png"},
  {symbol:"TRX",kind:"Coin",src:"/branding/crypto/trx.svg"},
  {symbol:"CEUR",kind:"Token",src:"/branding/tokens/CEUR.png"},
  {symbol:"DOT",kind:"Coin",src:"/branding/crypto/dot.svg"},
  {symbol:"BCH",kind:"Coin",src:"/branding/crypto/bch.svg"},
  {symbol:"AGEUR",kind:"Token",src:"/branding/tokens/AGEUR.png"},
  {symbol:"LTC",kind:"Coin",src:"/branding/crypto/ltc.svg"},
  {symbol:"USDC.E",kind:"Token",src:"/branding/tokens/USDCE.png"},
  {symbol:"SHIB",kind:"Coin",src:"/branding/crypto/shib.svg"},
  {symbol:"AAVE",kind:"Coin",src:"/branding/crypto/aave.svg"},
  {symbol:"XTZ",kind:"Coin",src:"/branding/crypto/xtz.svg"},
  {symbol:"FIL",kind:"Coin",src:"/branding/crypto/fil.svg"},
  {symbol:"DASH",kind:"Coin",src:"/branding/crypto/dash.svg"},
  {symbol:"CAKE",kind:"Coin",src:"/branding/crypto/cake.svg"},
  {symbol:"AXS",kind:"Coin",src:"/branding/crypto/axs.svg"},
  {symbol:"ONE",kind:"Coin",src:"/branding/crypto/one.svg"},
  {symbol:"FLOKI",kind:"Coin",src:"/branding/crypto/floki.svg"},
  {symbol:"BABYDOGE",kind:"Coin",src:"/branding/crypto/babydoge.svg"},
  {symbol:"QDX",kind:"Coin",src:"/branding/crypto/qdx.svg"},
];

type SetupLeadCopy={
  eyebrow:string;
  status:string;
  title:string;
  detail:string;
  action:string;
  stage:"compliance"|"routes";
};

function setupLeadCopy(setup:AccountSetupState):SetupLeadCopy{
  if(!setup.approved){
    if(setup.pending)return {eyebrow:"COMPLIANCE",status:"In review",title:"We’re checking your details",detail:"You can leave this page. We’ll keep your place.",action:"Check verification",stage:"compliance"};
    if(setup.failed)return {eyebrow:"COMPLIANCE",status:"Action needed",title:"Review your verification",detail:"Check the details you submitted, then continue the secure identity check.",action:"Continue compliance",stage:"compliance"};
    return {eyebrow:"COMPLIANCE",status:"Action needed",title:"Verify your identity",detail:"Complete one secure check before your money routes can open.",action:"Continue compliance",stage:"compliance"};
  }
  return {eyebrow:"MONEY ROUTES",status:"Action needed",title:"Connect your money routes",detail:"Choose where buys arrive and where sales settle.",action:"Continue setup",stage:"routes"};
}

export function DashboardOverview({trades,tradeDataAvailable,partialData=false,historyLimited=false}:DashboardOverviewProps){
  const router=useRouter();
  const [refreshing,startRefresh]=useTransition();
  const [assetsPaused,setAssetsPaused]=useState(false);
  const customer=useDashboardCustomer();
  const setup=useDashboardSetup();
  const {accountScope}=useDashboardFinance();
  const chart=useMemo(()=>tradeChartData(trades),[trades]);
  const usesUpdatedDates=trades.some(trade=>trade.dateBasis==="updated");
  const recent=useMemo(()=>[...trades].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).slice(0,5),[trades]);
  const setupHref=accountSetupHref(customer.accountType,accountScope);
  const setupLead=setup?setupLeadCopy(setup):null;
  const showRequests=setup&&!setup.routesReady;

  return <section className="dashboard-canvas dashboard-route-page overview-workspace" aria-labelledby="overview-title">
    <header className="sell-toolbar">
      <div>
        <p id="overview-title">{customer.givenName?`Welcome back, ${customer.givenName}`:"Welcome back"}</p>
        <p className="sell-toolbar-hint">Buy into your wallet. Sell back to a verified bank account.</p>
      </div>
    </header>

    {showRequests&&setup&&setupLead?<section className="overview-setup" aria-label="Account setup">
      <Link className={`overview-setup-panel ${setupLead.stage}`} href={setupHref}>
        <span className="overview-setup-art" aria-hidden="true"><Image src="/illustrations/account-setup-journey-3d.png" alt="" width={180} height={180} sizes="(max-width: 680px) 84px, 104px" /></span>
        <span className="overview-setup-panel-copy">
          <span className="overview-setup-panel-meta"><span>{setupLead.eyebrow}</span><span className="overview-setup-status">{setupLead.status}</span></span>
          <strong>{setupLead.title}</strong>
          <span className="overview-setup-detail">{setupLead.detail}</span>
          <span className="overview-setup-go">{setupLead.action} <IconArrowRight size={15}/></span>
        </span>
        <ol className="overview-setup-steps" aria-label="Setup progress">
          <li className={setupLead.stage==="compliance"?"current":"complete"}><span>01</span><strong>Compliance</strong></li>
          <li className={setupLead.stage==="routes"?"current":"upcoming"}><span>02</span><strong>Money routes</strong></li>
        </ol>
      </Link>
    </section>:null}

    <section className="overview-routes" aria-label="Money routes">
      <Link className="overview-route-card" href="/dashboard/buy">
        <div className="overview-route-copy">
          <small><IconArrowUpRight size={14}/> Bank to crypto</small>
          <h2>Buy crypto</h2>
          <p>Fund a pay-in account. Crypto settles to one wallet.</p>
        </div>
        <div className="overview-route-logos" aria-hidden="true">
          <span className="overview-route-stack flags">{fiatLogo("EUR",26)}{fiatLogo("USD",26)}{fiatLogo("GBP",26)}</span>
          <IconArrowRight size={16}/>
          <span className="overview-route-stack">{assetLogo("BTC",26)}{assetLogo("ETH",26)}{assetLogo("USDC",26)}</span>
        </div>
        <span className="sell-destination-go">Open buy <IconArrowRight size={15}/></span>
      </Link>
      <Link className="overview-route-card" href="/dashboard/sell">
        <div className="overview-route-copy">
          <small><IconArrowDownLeft size={14}/> Crypto to bank</small>
          <h2>Sell crypto</h2>
          <p>Send crypto. Proceeds settle to a verified account.</p>
        </div>
        <div className="overview-route-logos" aria-hidden="true">
          <span className="overview-route-stack">{assetLogo("BTC",26)}{assetLogo("ETH",26)}{assetLogo("USDC",26)}</span>
          <IconArrowRight size={16}/>
          <span className="overview-route-stack flags">{fiatLogo("EUR",26)}{fiatLogo("USD",26)}{fiatLogo("GBP",26)}</span>
        </div>
        <span className="sell-destination-go">Open sell <IconArrowRight size={15}/></span>
      </Link>
    </section>

    <div className="dashboard-asset-rail" aria-label="Supported digital assets and networks">
      <div className="dashboard-asset-rail-heading">
        <span><i aria-hidden="true"/>Supported assets</span>
        <button type="button" className="dashboard-rail-toggle" aria-pressed={assetsPaused} onClick={()=>setAssetsPaused(value=>!value)}>{assetsPaused?"Resume asset list":"Pause asset list"}</button>
      </div>
      <div className="dashboard-asset-marquee">
        <div className="dashboard-asset-track" style={assetsPaused?{animationPlayState:"paused"}:undefined}>
          {[false,true].map(duplicate=><div className="dashboard-asset-group" aria-hidden={duplicate||undefined} key={duplicate?"duplicate":"primary"}>
            {supportedAssets.map(asset=><div className="dashboard-asset" key={`${duplicate?"duplicate":"primary"}-${asset.kind}-${asset.symbol}`}>
              <Image src={asset.src} alt="" width={34} height={34} unoptimized/>
              <span><strong>{asset.symbol}</strong><small>{asset.kind}</small></span>
            </div>)}
          </div>)}
        </div>
      </div>
    </div>

    <section className="dashboard-trade-chart" aria-labelledby="trade-chart-title">
      <header>
        <div><span>LAST 14 DAYS · UTC</span><h2 id="trade-chart-title">Route activity</h2></div>
        <div className="dashboard-trade-metrics">
          <span><small>Routes</small><strong>{tradeDataAvailable?chart.periodCount:"—"}</strong></span>
          <span><small>Buy</small><strong>{tradeDataAvailable?chart.buyCount:"—"}</strong></span>
          <span><small>Sell</small><strong>{tradeDataAvailable?chart.sellCount:"—"}</strong></span>
        </div>
      </header>
      <div className="dashboard-chart-legend" aria-hidden="true"><span><i/>Buying crypto</span><span><i/>Selling crypto</span><b>Routes per day</b></div>
      <div className="dashboard-chart-stage">
        <svg viewBox={`0 0 ${chartWidth} 278`} role="img" aria-label={tradeDataAvailable?`${chart.buyCount} buy and ${chart.sellCount} sell routes in the loaded fourteen-day history. Daily counts in UTC.${partialData||historyLimited?" Counts may be incomplete.":""}${usesUpdatedDates?" Some routes use their latest update date.":""}`:"Route history is unavailable"}>
          <defs><linearGradient id="buy-route-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0da6b6" stopOpacity=".22"/><stop offset="1" stopColor="#0da6b6" stopOpacity="0"/></linearGradient></defs>
          {[0,1,2,3,4].map(index=>{const y=chartTop+index*((chartBottom-chartTop)/4);return <g key={`horizontal-${index}`}><line className="dashboard-chart-gridline" x1={chartLeft} x2={chartRight} y1={y} y2={y}/><text className="dashboard-chart-date" x={chartLeft-10} y={y+4} textAnchor="end">{chart.maximum*(1-index/4)}</text></g>})}
          {chart.days.map((day,index)=>{const x=chartLeft+(index/(chart.days.length-1))*(chartRight-chartLeft);return <line className="dashboard-chart-gridline vertical" x1={x} x2={x} y1={chartTop} y2={chartBottom} key={day.key}/>})}
          {tradeDataAvailable&&chart.periodCount>0&&<>
            <path className="dashboard-chart-area" d={chart.buyArea}/>
            <path className="dashboard-chart-line buy" d={chart.buyPath}/>
            <path className="dashboard-chart-line sell" d={chart.sellPath}/>
          </>}
          {[0,4,9,13].map(index=>{const day=chart.days[index],x=chartLeft+(index/(chart.days.length-1))*(chartRight-chartLeft);return <text className="dashboard-chart-date" x={x} y="265" textAnchor={index===0?"start":index===13?"end":"middle"} key={`label-${day.key}`}>{utcChartLabel(day.date)}</text>})}
        </svg>
        {!tradeDataAvailable?<div className="dashboard-chart-empty"><strong>History unavailable</strong><span>Try refreshing to reconnect.</span></div>:chart.periodCount===0?<div className="dashboard-chart-empty"><strong>{partialData||historyLimited?"No routes in loaded history":"No routes in this window"}</strong><span>{partialData||historyLimited?"Some history may be missing. Open Activity or refresh.":"Your first buy or sell will appear here."}</span></div>:null}
      </div>
      <footer>
        <button type="button" className="dashboard-chart-refresh" disabled={refreshing} onClick={()=>startRefresh(()=>router.refresh())}><IconRefresh size={14} className={refreshing?"spin":undefined}/>{refreshing?"Refreshing…":"Refresh history"}</button>
        <Link href="/dashboard/activity">View all activity <IconArrowRight size={12}/></Link>
      </footer>
      {partialData?<p className="dashboard-history-notice" role="status">Some history could not be loaded. These counts may be incomplete.</p>:null}
      {historyLimited?<p className="dashboard-history-notice" role="status">Only recent history is loaded. Counts may be incomplete; open Activity for the full list.</p>:null}
      {usesUpdatedDates?<p className="dashboard-history-notice">Some routes provide only their latest update date. Those updates determine their chart day.</p>:null}
      {tradeDataAvailable&&chart.periodCount>0?<details className="dashboard-chart-data"><summary>View daily counts</summary><table><caption>Routes per day (UTC)</caption><thead><tr><th scope="col">Date</th><th scope="col">Buy</th><th scope="col">Sell</th></tr></thead><tbody>{chart.days.map(day=><tr key={day.key}><th scope="row">{utcChartLabel(day.date)}</th><td>{day.buy}</td><td>{day.sell}</td></tr>)}</tbody></table></details>:null}
    </section>

    {tradeDataAvailable&&recent.length>0?<section className="overview-recent" aria-labelledby="overview-recent-title">
      <header>
        <div>
          <span className="overview-kicker">Recent</span>
          <h2 id="overview-recent-title">Transactions</h2>
        </div>
        <Link href="/dashboard/activity">See all <IconArrowRight size={14}/></Link>
      </header>
      <ul className="activity-list overview-recent-list">
        {recent.map(trade=>{
          const buy=isBuyDirection(trade.direction);
          const pair=tradePairAssets(buy,trade.sourceAsset,trade.destinationAsset);
          const destination=destinationAmountSummary(trade);
          return <li key={trade.id}>
            <Link href={`/dashboard/activity/${encodeURIComponent(trade.id)}`} className="activity-item">
              <div className="activity-item-lead">
                <span className="activity-direction">
                  <CurrencyPairClip from={pair.from} to={pair.to} size="sm"/>
                  {tradeDirectionLabel(trade.direction,trade.status)}
                </span>
                <span className={`activity-status ${orderStatusClass(trade.status)}`}>{formatOrderStatus(trade.status)}</span>
              </div>
              <div className="activity-item-amounts">
                <span><small>Sent</small>{formatTradeAmount(trade.sourceAmount,trade.sourceAsset)}</span>
                <span><small>{destination.label}</small>{destination.value}</span>
              </div>
              <div className="activity-item-meta">
                <time dateTime={trade.createdAt}>{trade.dateBasis==="updated"?"Updated · ":""}{formatOrderDateShort(trade.createdAt)}</time>
                <span className="activity-item-open" aria-hidden="true"><IconArrowRight size={16}/></span>
              </div>
            </Link>
          </li>;
        })}
      </ul>
    </section>:null}

    <RateCalculator/>
  </section>;
}
