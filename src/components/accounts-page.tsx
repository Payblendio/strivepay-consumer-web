"use client";

import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {IconAlertTriangle,IconArrowLeft,IconArrowRight,IconCheck,IconCopy,IconLoader2,IconPlus,IconRefresh,IconSearch,IconStar,IconStarFilled} from "@tabler/icons-react";
import {useToast} from "@/components/ui/toast";
import {bankAccountItems,moneyRouteApi,type BankAccountPage} from "@/lib/money-route-api";
import {CurrencyPairClip} from "./currency-pair-clip";
import {type ReadyPreference} from "./ready-route-copy";
import {fiatLogo,networkRailLabel} from "./money-route-controls";
import {sortPayoutAccounts} from "./dashboard-route-copy";
import {ComplianceRequiredGate,useComplianceApproved} from "./compliance-required-gate";
import {useDashboardCustomer,useDashboardFinance} from "./dashboard-customer";
import {accountReadinessHint,accountReadinessLabel,isAccountReady,loadErrorMessage,withDeadline} from "./account-readiness";
import {maskBankIdentifier} from "@/lib/masked-identifier";
import {RouteEmptyState} from "./route-empty-state";
import {LinkedBankAchSection} from "./linked-bank-ach-section";

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

type BankAccount={
  id:string;
  accountName:string;
  currency:string;
  status:string;
  mainRecipient:boolean;
  accountMask?:string|null;
  accountNumber?:string|null;
  recipientType?:string|null;
  transferMethod?:string|null;
  receivingAddress?:string|null;
  lastUsedAt?:string|null;
};

type NativeDestination={
  id:string;
  accountName:string;
  maskedAccountNumber:string;
  accountNumber?:string|null;
  status:string;
  bankCode:string;
};

type DisplayAccount={
  id:string;
  accountName:string;
  currency:string;
  status:string;
  mainRecipient:boolean;
  accountMask?:string|null;
  accountNumber?:string|null;
  recipientType?:string|null;
  bankCode?:string|null;
  native:boolean;
  lastUsedAt?:string|null;
};

const DESTINATION_PAGE_SIZE=6;

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

function ownershipLabel(account:Pick<DisplayAccount,"native"|"recipientType">){
  if(account.native)return "My account";
  return account.recipientType==="THIRD_PARTY"?"Third-party account":"My account";
}

function accountNumberLabel(account:Pick<DisplayAccount,"accountNumber"|"accountMask">){
  return maskBankIdentifier(account.accountMask?.trim()||account.accountNumber);
}

function mapNativeDestinations(items:NativeDestination[]):DisplayAccount[]{
  return items.map((item,index)=>({
    id:item.id,
    accountName:item.accountName,
    currency:"NGN",
    status:item.status,
    mainRecipient:index===0,
    accountMask:item.maskedAccountNumber,
    accountNumber:item.accountNumber??null,
    recipientType:"SELF",
    bankCode:item.bankCode,
    native:true,
  }));
}

function destinationQuery(opts:{q:string;page:number;refresh?:boolean;size?:number}){
  const params=new URLSearchParams();
  if(opts.refresh)params.set("refresh","true");
  if(opts.q.trim())params.set("q",opts.q.trim());
  params.set("page",String(Math.max(0,opts.page)));
  params.set("size",String(opts.size??DESTINATION_PAGE_SIZE));
  return `?${params.toString()}`;
}

async function fetchFunding(refresh=false){
  const fundingCall=refresh
    ? moneyRouteApi<DepositAccount[]>("/funding-accounts?refresh=true")
    : moneyRouteApi<DepositAccount[]>("/funding-accounts").catch(()=>[] as DepositAccount[]);
  const [fundingAccounts,nativeFunding]=await Promise.all([
    withDeadline(fundingCall,12000,"Accounts timed out"),
    withDeadline(moneyRouteApi<DepositAccount|null>("/native-funding-account").catch(()=>null),12000,"Accounts timed out"),
  ]);
  const bakkt=Array.isArray(fundingAccounts)?fundingAccounts:[];
  const withoutNgn=bakkt.filter(item=>(item.currency||"").toUpperCase()!=="NGN");
  if(!nativeFunding)return withoutNgn;
  return [{...nativeFunding,currency:nativeFunding.currency||"NGN",id:nativeFunding.id||"native-funding"},...withoutNgn];
}

async function fetchDestinations(opts:{q:string;page:number;refresh?:boolean}){
  const [nativeDestinations,page]=await Promise.all([
    withDeadline(moneyRouteApi<NativeDestination[]>("/native-destinations").catch(()=>[] as NativeDestination[]),12000,"Accounts timed out"),
    withDeadline(
      moneyRouteApi<BankAccountPage<BankAccount>>(`/bank-accounts${destinationQuery({q:opts.q,page:0,refresh:opts.refresh,size:100})}`).catch(()=>({items:[] as BankAccount[],page:0,size:100,total:0})),
      12000,
      "Accounts timed out",
    ),
  ]);
  const nativeListed=mapNativeDestinations(Array.isArray(nativeDestinations)?nativeDestinations:[]);
  const nativeIds=new Set(nativeListed.map(item=>item.id));
  const mapped=sortPayoutAccounts([
    ...nativeListed,
    ...bankAccountItems<BankAccount>(page).filter(item=>!nativeIds.has(item.id)).map(item=>({...item,native:false as const})),
  ]);
  const needle=opts.q.trim().toLowerCase();
  const filtered=needle?mapped.filter(item=>[item.accountName,item.currency,item.accountMask,item.accountNumber].join(" ").toLowerCase().includes(needle)):mapped;
  const size=DESTINATION_PAGE_SIZE;
  const start=opts.page*size;
  return {page:opts.page,size,total:filtered.length,items:filtered.slice(start,start+size)};
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

export function AccountsPage(){
  const approved=useComplianceApproved();
  const customer=useDashboardCustomer();
  const {accountScope,canMutateFinances}=useDashboardFinance();
  const usCitizen=customer.country?.toUpperCase()==="US";
  const {show}=useToast();
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState("");
  const [refreshing,setRefreshing]=useState(false);
  const [refreshError,setRefreshError]=useState("");
  const [preference,setPreference]=useState<ReadyPreference|null>(null);
  const [deposits,setDeposits]=useState<DepositAccount[]>([]);
  const [destinations,setDestinations]=useState<DisplayAccount[]>([]);
  const [destinationTotal,setDestinationTotal]=useState(0);
  const [destinationPage,setDestinationPage]=useState(0);
  const [destinationQueryText,setDestinationQueryText]=useState("");
  const [destinationSearch,setDestinationSearch]=useState("");
  const [destinationsLoading,setDestinationsLoading]=useState(false);
  const [copied,setCopied]=useState("");
  const [promoting,setPromoting]=useState("");
  const mounted=useRef(true);
  const refreshVersion=useRef(0);
  const destinationVersion=useRef(0);

  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;refreshVersion.current+=1;destinationVersion.current+=1;};},[]);

  useEffect(()=>{
    const timer=window.setTimeout(()=>setDestinationSearch(destinationQueryText),250);
    return()=>window.clearTimeout(timer);
  },[destinationQueryText]);

  const loadDestinations=useCallback(async(saved:ReadyPreference|null,opts:{q:string;page:number;refresh?:boolean})=>{
    const version=++destinationVersion.current;
    setDestinationsLoading(true);
    try{
      const page=await fetchDestinations(opts);
      if(!mounted.current||version!==destinationVersion.current)return;
      setDestinations(page.items);
      setDestinationTotal(page.total);
      setDestinationPage(page.page);
    }finally{
      if(mounted.current&&version===destinationVersion.current)setDestinationsLoading(false);
    }
  },[]);

  const refreshAccounts=useCallback(async(saved:ReadyPreference|null)=>{
    const version=++refreshVersion.current;
    setRefreshing(true);
    setRefreshError("");
    try{
      const [funding]=await Promise.all([
        fetchFunding(true),
        loadDestinations(saved,{q:destinationSearch,page:destinationPage,refresh:true}),
      ]);
      if(!mounted.current||version!==refreshVersion.current)return;
      setDeposits(funding);
    }catch(problem){
      if(mounted.current&&version===refreshVersion.current)setRefreshError(loadErrorMessage(problem,"Account refresh is unavailable."));
    }finally{
      if(mounted.current&&version===refreshVersion.current)setRefreshing(false);
    }
  },[destinationPage,destinationSearch,loadDestinations]);

  const load=useCallback(async()=>{
    setLoadError("");
    const preferences=await withDeadline(moneyRouteApi<ReadyPreference[]>("/preferences"),12000,"Preferences timed out");
    const saved=preferences[0]??null;
    const funding=await fetchFunding();
    if(!mounted.current)return;
    setPreference(saved);
    setDeposits(funding);
  },[]);

  useEffect(()=>{
    if(!approved){setLoading(false);return;}
    let active=true;
    setLoading(true);
    setPreference(null);
    setDeposits([]);
    setDestinations([]);
    setDestinationTotal(0);
    setDestinationPage(0);
    setDestinationQueryText("");
    setDestinationSearch("");
    void load()
      .catch(error=>{if(active){setLoadError(loadErrorMessage(error));setDeposits([]);setDestinations([]);setDestinationTotal(0);}})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[accountScope,approved,load]);

  useEffect(()=>{
    if(!approved||loading)return;
    let cancelled=false;
    void loadDestinations(preference,{q:destinationSearch,page:destinationPage}).catch(problem=>{
      if(!cancelled)show({tone:"danger",title:"Destinations unavailable",message:loadErrorMessage(problem,"Destination accounts could not be loaded.")});
    });
    return()=>{cancelled=true;};
  },[approved,destinationPage,destinationSearch,loadDestinations,loading,preference,show]);

  async function copy(value:string,key:string,label:string){
    try{
      await navigator.clipboard.writeText(value);
      setCopied(key);
      show({tone:"success",title:"Copied",message:`${label} copied.`});
      window.setTimeout(()=>setCopied(""),1800);
    }catch{
      show({tone:"danger",title:"Copy failed",message:"Select the value and copy it manually."});
    }
  }

  async function makePrimary(account:DisplayAccount){
    if(!canMutateFinances||account.native||account.mainRecipient||promoting)return;
    setPromoting(account.id);
    try{
      await moneyRouteApi<BankAccount>(`/bank-accounts/${account.id}/main`,{method:"PUT"});
      await loadDestinations(preference,{q:destinationSearch,page:destinationPage});
      show({tone:"success",title:"Primary updated",message:`${account.accountName} is now your primary destination.`});
    }catch(problem){
      show({tone:"danger",title:"Could not update destination",message:loadErrorMessage(problem,"Send a new email code, then try again.")});
    }finally{
      setPromoting("");
    }
  }

  const mutateHint=accountScope==="BUSINESS"&&!canMutateFinances
    ?"Company money routes are view-only for your role until financial access is granted."
    :null;

  if(!approved){
    return <ComplianceRequiredGate
      className="accounts-workspace"
      titleId="accounts-verify-title"
      title="Verify before managing accounts"
      detail="Complete compliance first. Pay-in and payout accounts unlock after your identity check is approved."
    />;
  }

  if(loading){
    return <section className="dashboard-canvas dashboard-route-page accounts-workspace">
      <div className="compliance-loading"><IconLoader2 className="spin"/>Loading accounts…</div>
    </section>;
  }

  if(loadError){
    return <section className="dashboard-canvas dashboard-route-page accounts-workspace" aria-labelledby="accounts-hub-title">
      <header className="sell-toolbar">
        <div>
          <p id="accounts-hub-title">Pay-in accounts for buys. Payout destinations for sells.</p>
        </div>
      </header>
      <div className="accounts-load-error" role="alert">
        <IconAlertTriangle size={22}/>
        <div className="accounts-load-error-copy">
          <strong>Accounts could not be loaded</strong>
          <p>{loadError}</p>
        </div>
        <div className="sell-receive-idle-actions">
          <button type="button" className="compliance-primary" onClick={()=>{setLoading(true);void load().catch(error=>setLoadError(loadErrorMessage(error))).finally(()=>setLoading(false));}}>
            <IconRefresh size={16}/> Try again
          </button>
        </div>
      </div>
    </section>;
  }

  const token=preference?.token?.trim()||"";
  const network=preference?.network?networkRailLabel(preference.network):null;
  const wallet=preference?.address?.trim()||"";
  const pairTo=token||"crypto";
  const destinationPages=Math.max(1,Math.ceil(destinationTotal/DESTINATION_PAGE_SIZE));

  return <section className="dashboard-canvas dashboard-route-page accounts-workspace" aria-labelledby="accounts-hub-title">
    <header className="sell-toolbar">
      <div>
        <p id="accounts-hub-title">Pay-in accounts for buys. Payout destinations for sells.</p>
        <p className="sell-toolbar-hint">Request funding accounts and manage where sale proceeds settle.</p>
      </div>
      <button type="button" className="compliance-secondary" disabled={refreshing} onClick={()=>void refreshAccounts(preference)}>
        {refreshing?<IconLoader2 className="spin" size={16}/>:<IconRefresh size={16}/>} {refreshing?"Refreshing…":"Refresh accounts"}
      </button>
    </header>

    {mutateHint?<div className="accounts-status-banner warning" role="status">
      <IconAlertTriangle size={18}/>
      <div><strong>View only</strong><p>{mutateHint}</p></div>
    </div>:null}

    {refreshError?<div className="accounts-status-banner warning" role="alert">
      <IconAlertTriangle size={18}/>
      <div><strong>Could not refresh accounts</strong><p>{refreshError} Showing last loaded details.</p></div>
      <button type="button" className="compliance-secondary" disabled={refreshing} onClick={()=>void refreshAccounts(preference)}>Try again</button>
    </div>:null}

    {preference?<section className="accounts-settlement-line" aria-label="Buy settlement wallet">
      <div className="accounts-settlement-copy">
        <span className="overview-kicker">Buy settlement</span>
        <strong>{preference.fiatCurrency} → {token||"—" }{network?` · ${network}`:""}</strong>
        {wallet
          ?<CopyDetail label="Receiving wallet" value={wallet} copied={copied==="wallet"} onCopy={()=>void copy(wallet,"wallet","Receiving wallet")}/>
          :<small>Receiving wallet not set yet</small>}
      </div>
      {canMutateFinances?<Link className="compliance-secondary" href="/dashboard/buy/update">Update wallet</Link>:null}
    </section>:null}

    <section className="buy-soft-section" aria-labelledby="accounts-deposits-title">
      <header className="buy-soft-head">
        <div>
          <span className="overview-kicker">Funding</span>
          <h2 id="accounts-deposits-title">Pay-in accounts</h2>
          <p>Bank details used to fund buys. Crypto settles to your wallet.</p>
        </div>
        {canMutateFinances?<Link className="compliance-secondary buy-deposits-add" href="/dashboard/buy/add"><IconPlus size={16}/> Request account</Link>:null}
      </header>

      {deposits.length===0?<RouteEmptyState
        title="No pay-in account yet"
        detail={canMutateFinances?"Request a pay-in account so you can fund buys.":"No company pay-in account is available to view yet."}
        imageSrc="/illustrations/account-accounts-3d.png"
      >{canMutateFinances?<Link className="compliance-primary" href="/dashboard/buy/add"><IconPlus size={16}/> Request account <IconArrowRight size={17}/></Link>:null}</RouteEmptyState>:<div className="buy-deposit-list" role="list">
        {deposits.map(account=>{
          const status=accountReadinessLabel(account.status);
          const ready=isAccountReady(account.status);
          const hint=accountReadinessHint(account.status);
          const rows=depositRows(account);
          return <article className={`activity-soft buy-deposit-card${!ready?" not-ready":""}`} key={account.id} role="listitem">
            <header className="buy-deposit-card-head">
              <span className="activity-direction">
                <CurrencyPairClip from={account.currency} to={pairTo==="crypto"?"USDC":pairTo} size="sm"/>
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
                  ?<CopyDetail key={row.label} label={row.label} value={row.value} copied={copied===key} onCopy={()=>void copy(row.value,key,row.label)}/>
                  :<div className="activity-copy-row static" key={row.label}><span>{row.label}</span><strong>{row.value}</strong></div>;
              })}
            </div>
          </article>;
        })}
      </div>}
    </section>

    <LinkedBankAchSection enabled={usCitizen} canMutate={canMutateFinances}/>

    <section className="buy-soft-section" aria-labelledby="accounts-destinations-title">
      <header className="buy-soft-head">
        <div>
          <span className="overview-kicker">Payout</span>
          <h2 id="accounts-destinations-title">Destination accounts</h2>
          <p>Where sale proceeds settle. Ordered by last used.</p>
        </div>
        {canMutateFinances?<Link className="compliance-secondary buy-deposits-add" href="/dashboard/sell/add"><IconPlus size={16}/> Add account</Link>:null}
      </header>

      <div className="accounts-destination-toolbar">
        <label className="accounts-destination-search">
          <IconSearch size={16} aria-hidden="true"/>
          <input
            value={destinationQueryText}
            onChange={event=>{setDestinationQueryText(event.target.value);setDestinationPage(0);}}
            placeholder="Search name, currency, or account"
            aria-label="Search destination accounts"
          />
        </label>
        <small>{destinationTotal} destination{destinationTotal===1?"":"s"}</small>
      </div>

      {destinationsLoading&&destinations.length===0?<div className="compliance-loading"><IconLoader2 className="spin"/>Loading destinations…</div>
      :destinationTotal===0?<RouteEmptyState
        title={destinationSearch?"No matching destinations":"No destination account yet"}
        detail={destinationSearch?"Try another search.":canMutateFinances?"Add a verified bank account before creating crypto send instructions.":"No company destination accounts are available to view yet."}
        imageSrc="/illustrations/account-destination-account-3d.png"
      >{!destinationSearch&&canMutateFinances?<Link className="compliance-primary" href="/dashboard/sell/add"><IconPlus size={16}/> Add account <IconArrowRight size={17}/></Link>:null}</RouteEmptyState>:<div className={`sell-destination-list accounts-destination-list${destinationsLoading?" is-loading":""}`} role="list">
        {destinations.map(account=>{
          const status=accountReadinessLabel(account.status);
          const ready=isAccountReady(account.status);
          const thirdParty=account.recipientType==="THIRD_PARTY";
          return <div key={account.id} role="listitem" className="accounts-destination-item">
            <Link
              className={`sell-destination-card${account.mainRecipient?" primary":""}${!ready?" not-ready":""}`}
              href={`/dashboard/sell/${encodeURIComponent(account.id)}`}
            >
              <div className="sell-destination-head">
                <span className="sell-destination-mark" aria-hidden="true">{fiatLogo(account.currency,40)}</span>
                <div className="sell-destination-head-meta">
                  {account.mainRecipient?<span className="sell-destination-primary-badge"><IconStarFilled size={13}/> Primary</span>:null}
                  <span className={`sell-destination-status${ready?" ready":""}`}>{status}</span>
                </div>
              </div>
              <div className="sell-destination-copy">
                <strong>{account.accountName}</strong>
                <code className="sell-destination-number">{accountNumberLabel(account)}</code>
                <span className="sell-destination-meta">{account.currency} · {ownershipLabel(account)}</span>
                {thirdParty?<span className="sell-destination-warning">Proceeds settle to someone else</span>:null}
                {!ready?<span className="sell-destination-warning">Wait until Ready before sending crypto</span>:null}
              </div>
              <span className="sell-destination-go">Get deposit address <IconArrowRight size={15}/></span>
            </Link>
            {canMutateFinances&&!account.native&&!account.mainRecipient?<button
              type="button"
              className="accounts-primary-action"
              disabled={Boolean(promoting)}
              aria-label={`Set ${account.accountName} as primary`}
              title="Set as primary"
              onClick={()=>void makePrimary(account)}
            >{promoting===account.id?<IconLoader2 className="spin" size={14}/>:<IconStar size={14}/>} Set primary</button>:null}
          </div>;
        })}
      </div>}

      {destinationTotal>DESTINATION_PAGE_SIZE?<nav className="accounts-destination-pagination" aria-label="Destination pages">
        <button type="button" className="activity-pagination-button" disabled={destinationPage<=0||destinationsLoading} onClick={()=>setDestinationPage(value=>Math.max(0,value-1))}>
          <IconArrowLeft size={15}/> Previous
        </button>
        <span>Page {destinationPage+1} of {destinationPages}</span>
        <button type="button" className="activity-pagination-button" disabled={destinationPage+1>=destinationPages||destinationsLoading} onClick={()=>setDestinationPage(value=>value+1)}>
          Next <IconArrowRight size={15}/>
        </button>
      </nav>:null}
    </section>
  </section>;
}
