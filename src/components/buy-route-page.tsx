"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useCallback,useEffect,useState,useTransition} from "react";
import {IconAlertTriangle,IconArrowRight,IconBuildingBank,IconCheck,IconCopy,IconLoader2,IconPlus} from "@tabler/icons-react";
import {useToast} from "@/components/ui/toast";
import {moneyRouteApi} from "@/lib/money-route-api";
import {CurrencyPairClip} from "./currency-pair-clip";
import {buyLane,type ReadyPreference} from "./ready-route-copy";
import {networkLogo,networkRailLabel} from "./money-route-controls";
import {
  formatOrderDateShort,
  formatOrderStatus,
  formatTradeAmount,
  orderStatusClass,
  tradeDirectionLabel,
  type BuyOrderRow,
} from "./dashboard-route-copy";
import {ComplianceRequiredGate,useComplianceApproved} from "./compliance-required-gate";
import {useDashboardFinance} from "./dashboard-customer";
import {accountReadinessHint,accountReadinessLabel,isAccountReady,loadErrorMessage,withDeadline} from "./account-readiness";
import {RouteEmptyState} from "./route-empty-state";

type BuyRoutePageProps={orders:BuyOrderRow[];historyAvailable?:boolean;historyPartial?:boolean;historyLimited?:boolean};
type DepositAccount={
  id:string;
  currency:string;
  status:string;
  accountName?:string|null;
  accountMask?:string|null;
  routingMask?:string|null;
  routingNumber?:string|null;
  accountNumber?:string|null;
  bankName?:string|null;
  bankCode?:string|null;
};

function routingLabel(value:string){
  const clean=value.replace(/\s+/g,"").toUpperCase();
  if(/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(clean))return "SWIFT / BIC";
  if(/^\d{6}$/.test(clean))return "Sort code";
  return "Routing / sort code";
}

function fullBankDetail(value?:string|null){
  return Boolean(value?.trim()&&!/[*•●×…]|(?:^|[\s-])[xX]{2,}(?=[\s\d-]|$)/.test(value));
}

function depositRows(account:DepositAccount){
  const rows:Array<{label:string;value:string;copyable?:boolean;fullDetailUnavailable?:boolean}>=[];
  const number=account.accountNumber?.trim()||account.accountMask?.trim();
  if(number)rows.push({label:account.accountNumber?"Account / IBAN":"Account",value:number,copyable:fullBankDetail(account.accountNumber),fullDetailUnavailable:!fullBankDetail(account.accountNumber)});
  const routing=account.routingNumber?.trim()||account.routingMask?.trim();
  if(routing)rows.push({label:routingLabel(routing),value:routing,copyable:fullBankDetail(account.routingNumber),fullDetailUnavailable:!fullBankDetail(account.routingNumber)});
  if(account.bankCode?.trim())rows.push({label:"Bank code",value:account.bankCode.trim(),copyable:fullBankDetail(account.bankCode),fullDetailUnavailable:!fullBankDetail(account.bankCode)});
  if(account.bankName?.trim())rows.push({label:"Bank",value:account.bankName.trim()});
  rows.push({label:"Currency",value:account.currency});
  return rows;
}

function CopyDetail({label,value,copied,onCopy}:{label:string;value:string;copied:boolean;onCopy:()=>void}){
  return <div className="activity-copy-row">
    <span>{label}</span>
    <strong className="mono">{value}</strong>
    <button type="button" onClick={onCopy} aria-label={`Copy ${label}`}>
      {copied?<IconCheck size={15}/>:<IconCopy size={15}/>}
    </button>
  </div>;
}

export function BuyRoutePage({orders,historyAvailable=true,historyPartial=false,historyLimited=false}:BuyRoutePageProps){
  const router=useRouter();
  const [historyRefreshing,startHistoryRefresh]=useTransition();
  const approved=useComplianceApproved();
  const {accountScope,canMutateFinances}=useDashboardFinance();
  const {show}=useToast();
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState("");
  const [preference,setPreference]=useState<ReadyPreference|null>(null);
  const [deposits,setDeposits]=useState<DepositAccount[]>([]);
  const [copied,setCopied]=useState("");

  const load=useCallback(async()=>{
    const preferences=await withDeadline(moneyRouteApi<ReadyPreference[]>("/preferences"),12000,"Preferences timed out");
    const saved=preferences[0]??null;
    setPreference(saved);
    const [fundingAccounts,nativeFunding]=await Promise.all([
      withDeadline(moneyRouteApi<DepositAccount[]>("/funding-accounts").catch(()=>[]),12000,"Pay-in accounts timed out"),
      withDeadline(moneyRouteApi<DepositAccount|null>("/native-funding-account").catch(()=>null),12000,"Pay-in accounts timed out"),
    ]);
    const bakkt=Array.isArray(fundingAccounts)?fundingAccounts:[];
    const withoutNgn=bakkt.filter(item=>(item.currency||"").toUpperCase()!=="NGN");
    setDeposits(nativeFunding?[{...nativeFunding,currency:nativeFunding.currency||"NGN",id:nativeFunding.id||"native-funding"},...withoutNgn]:withoutNgn);
    void moneyRouteApi<DepositAccount[]>("/funding-accounts?refresh=true")
      .then(accounts=>{
        const refreshed=Array.isArray(accounts)?accounts:[];
        const cleaned=refreshed.filter(item=>(item.currency||"").toUpperCase()!=="NGN");
        setDeposits(current=>{
          const native=current.find(item=>(item.currency||"").toUpperCase()==="NGN");
          return native?[native,...cleaned]:cleaned;
        });
      })
      .catch(()=>undefined);
  },[]);

  useEffect(()=>{
    if(!approved){setLoading(false);return;}
    let active=true;
    setLoading(true);
    setPreference(null);
    setDeposits([]);
    void load()
      .then(()=>{if(active)setLoadError("");})
      .catch(error=>{if(active){setLoadError(loadErrorMessage(error,"Buy details could not be loaded"));setPreference(null);setDeposits([]);}})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[accountScope,approved,load]);

  async function copy(value:string,key:string){
    try{
      await navigator.clipboard.writeText(value);
      setCopied(key);
      show({tone:"success",title:"Copied",message:key==="wallet"?"Receiving wallet copied.":"Account detail copied."});
      window.setTimeout(()=>setCopied(""),1800);
    }catch{
      show({tone:"danger",title:"Copy failed",message:"Select the value and copy it manually."});
    }
  }

  if(!approved){
    return <ComplianceRequiredGate
      className="buy-workspace"
      titleId="buy-verify-title"
      title="Verify before you buy"
      detail="Complete compliance first. Buy routes unlock after your identity check is approved."
    />;
  }

  if(loading){
    return <section className="dashboard-canvas dashboard-route-page buy-workspace">
      <div className="compliance-loading"><IconLoader2 className="spin"/>Loading buy details…</div>
    </section>;
  }

  if(loadError){
    return <section className="dashboard-canvas dashboard-route-page buy-workspace">
      <div className="accounts-load-error" role="alert">
        <IconAlertTriangle size={22}/>
        <div>
          <strong>Buy details could not be loaded</strong>
          <p>{loadError}</p>
        </div>
        <button type="button" className="compliance-primary" onClick={()=>{setLoading(true);void load().then(()=>setLoadError("")).catch(error=>setLoadError(loadErrorMessage(error))).finally(()=>setLoading(false));}}>
          Try again
        </button>
      </div>
    </section>;
  }

  if(!preference){
    return <section className="dashboard-canvas dashboard-route-page buy-workspace">
      <RouteEmptyState
        title="Set a buy settlement wallet"
        detail="Choose the wallet and network that should receive crypto after you fund a pay-in account."
        imageSrc="/illustrations/account-buy-wallet-3d.png"
      >{canMutateFinances?<Link className="compliance-primary" href="/dashboard/buy/update">Set wallet <IconArrowRight size={17}/></Link>:null}</RouteEmptyState>
    </section>;
  }

  const lane=buyLane(preference,deposits[0]??null);
  const wallet=preference.address?.trim()||"";
  const network=preference.network?networkRailLabel(preference.network):"—";
  const token=preference.token;
  const recent=orders.slice(0,8);

  return <section className="dashboard-canvas dashboard-route-page buy-workspace" aria-labelledby="buy-hub-title">
    <header className="buy-toolbar">
      <p id="buy-hub-title">Fund a pay-in account. Crypto always settles to one wallet.</p>
      {canMutateFinances?<Link className="compliance-secondary buy-toolbar-action" href="/dashboard/buy/update">Update wallet</Link>:null}
    </header>

    <section className="activity-soft buy-settlement-card" aria-label="Crypto settlement">
      <div className="buy-settlement-hero">
        <span className="activity-direction">
          <CurrencyPairClip from={lane.fiat} to={preference.token} size="md"/>
          <span className="buy-settlement-title">
            <strong>{lane.fiat} → {preference.token}</strong>
            <small>{network}</small>
          </span>
        </span>
        {preference.network?<span className="buy-settlement-network" aria-hidden="true">{networkLogo(preference.network,28)}</span>:null}
      </div>
      <div className="buy-settlement-ids">
        {wallet
          ?<CopyDetail label="Receiving wallet" value={wallet} copied={copied==="wallet"} onCopy={()=>void copy(wallet,"wallet")}/>
          :<p className="buy-settlement-missing">Receiving wallet not set yet</p>}
      </div>
    </section>

    <section className="buy-soft-section" aria-labelledby="buy-deposits-title">
      <header className="buy-soft-head">
        <div>
          <span className="overview-kicker">Funding</span>
          <h2 id="buy-deposits-title">Pay-in accounts</h2>
          <p>Bank details used to fund buys. Crypto settles to your wallet.</p>
        </div>
        {canMutateFinances?<Link className="compliance-secondary buy-deposits-add" href="/dashboard/buy/add"><IconPlus size={16}/> Request account</Link>:null}
      </header>

      {deposits.length===0?<div className="buy-deposits-empty">
        <IconBuildingBank size={22}/>
        <strong>No pay-in account yet</strong>
        <p>{canMutateFinances?"Request a pay-in account so you can fund buys.":"No pay-in account is available to view yet."}</p>
        {canMutateFinances?<Link className="compliance-primary" href="/dashboard/buy/add"><IconPlus size={16}/> Request account <IconArrowRight size={17}/></Link>:null}
      </div>:<div className="buy-deposit-list" role="list">
        {deposits.map(account=>{
          const status=accountReadinessLabel(account.status);
          const ready=isAccountReady(account.status);
          const hint=accountReadinessHint(account.status);
          const rows=depositRows(account);
          return <article className={`activity-soft buy-deposit-card${!ready?" not-ready":""}`} key={account.id} role="listitem">
            <header className="buy-deposit-card-head">
              <span className="activity-direction">
                <CurrencyPairClip from={account.currency} to={token||"USDC"} size="sm"/>
                <span className="buy-settlement-title">
                  <strong>{account.currency}{token?` → ${token}`:""}</strong>
                  <small>{account.bankName||account.accountName||`${account.currency} pay-in`}</small>
                </span>
              </span>
              <span className={`sell-destination-status${ready?" ready":""}`}>{status}</span>
            </header>
            {hint?<p className="accounts-status-hint"><IconAlertTriangle size={14}/> {hint}</p>:null}
            {rows.some(row=>row.fullDetailUnavailable)?<p className="accounts-status-hint"><IconAlertTriangle size={14}/>Full bank details are unavailable. Do not use masked details to send money.</p>:null}
            <div className="buy-deposit-ids">
              {rows.map(row=>{
                const key=`${account.id}-${row.label}`;
                return row.copyable
                  ?<CopyDetail key={row.label} label={row.label} value={row.value} copied={copied===key} onCopy={()=>void copy(row.value,key)}/>
                  :<div className="activity-copy-row static" key={row.label}><span>{row.label}</span><strong>{row.value}</strong></div>;
              })}
            </div>
          </article>;
        })}
      </div>}
    </section>

    <section className="buy-soft-section" aria-labelledby="buy-orders-title">
      <header className="buy-soft-head">
        <div>
          <span className="overview-kicker">Recent</span>
          <h2 id="buy-orders-title">Buy orders</h2>
        </div>
        <Link href="/dashboard/activity">See all <IconArrowRight size={14}/></Link>
      </header>

      {!historyAvailable||historyPartial?<div className="accounts-status-banner warning" role="alert"><IconAlertTriangle size={18}/><div><strong>{historyAvailable?"Some buy history is unavailable":"Buy history is unavailable"}</strong><p>Your account details are still available.</p></div><button type="button" className="compliance-secondary" disabled={historyRefreshing} onClick={()=>startHistoryRefresh(()=>router.refresh())}>{historyRefreshing?"Refreshing…":"Retry history"}</button></div>:null}
      {historyLimited?<p className="accounts-status-hint">Only recent history is loaded. Open Activity for the complete list.</p>:null}
      {!historyAvailable?null:recent.length===0?<p className="overview-recent-empty">{historyPartial||historyLimited?"No buy orders in the available history.":"No buy orders yet. Fund a pay-in account to start."}</p>
        :<ul className="activity-list">
          {recent.map(order=><li key={order.id}>
            <Link href={`/dashboard/activity/${encodeURIComponent(order.id)}`} className="activity-item">
              <div className="activity-item-lead">
                <span className="activity-direction">
                  <CurrencyPairClip from={order.fiatCurrency||"EUR"} to={order.cryptoAsset||"USDC"} size="sm"/>
                  {tradeDirectionLabel("FIAT_TO_CRYPTO",order.status)}
                </span>
                <span className={`activity-status ${orderStatusClass(order.status)}`}>{formatOrderStatus(order.status)}</span>
              </div>
              <div className="activity-item-amounts">
                <span><small>Sent</small>{formatTradeAmount(order.fiatAmount,order.fiatCurrency)}</span>
                <span><small>{order.destinationLabel??"Received"}</small>{order.destinationDisplay??formatTradeAmount(order.cryptoAmount,order.cryptoAsset)}</span>
              </div>
              <div className="activity-item-meta">
                <time dateTime={order.createdAt}>{order.dateBasis==="updated"?"Updated · ":""}{formatOrderDateShort(order.createdAt)}</time>
                <span className="activity-item-open" aria-hidden="true"><IconArrowRight size={16}/></span>
              </div>
            </Link>
          </li>)}
        </ul>}
    </section>
  </section>;
}
