"use client";

import Link from "next/link";
import {useCallback,useEffect,useMemo,useState} from "react";
import {IconAlertTriangle,IconArrowLeft,IconArrowRight,IconBuildingBank,IconCheck,IconCopy,IconLoader2,IconPlus,IconRefresh,IconStarFilled} from "@tabler/icons-react";
import {DepositQr} from "@/components/deposit-qr";
import {useToast} from "@/components/ui/toast";
import {moneyRouteApi,bankAccountItems,titleCase} from "@/lib/money-route-api";
import {evmToTronAddress,isEvmReceivingAddress} from "@/lib/tron-address";
import {ASSET_RELEVANCE,ROUTE_TOKENS,TARGET_NETWORKS,fiatLogo,networkRailLabel,RouteSelect,type SelectOption} from "./money-route-controls";
import {sortPayoutAccounts} from "./dashboard-route-copy";
import {ComplianceRequiredGate,useComplianceApproved} from "./compliance-required-gate";
import {useDashboardFinance} from "./dashboard-customer";
import {accountReadinessHint,accountReadinessLabel,isAccountReady,loadErrorMessage,withDeadline} from "./account-readiness";
import {maskBankIdentifier} from "@/lib/masked-identifier";
import {RouteEmptyState} from "./route-empty-state";
import {TransactionRealtimeRefresh} from "@/components/transaction-realtime-refresh";

type ReadyPreference={fiatCurrency:string;token:string;network:string;routeType?:"NATIVE"|"COMPOSITE"|"STABLECOIN"};
type BankAccount={id:string;accountName:string;currency:string;status:string;mainRecipient:boolean;accountMask?:string|null;accountNumber?:string|null;recipientType?:string|null;transferMethod?:string|null;receivingAddress?:string|null};
type NativeDestination={id:string;accountName:string;maskedAccountNumber:string;accountNumber?:string|null;status:string;bankCode:string};
type Network={code:string;name:string};
type Asset={code:string;name:string;type:string;networks:Network[]};
type Coverage={transferableAssets:Asset[]};
type DepositAddress={payoutAccountId:string;asset:string;network:string;address:string;destinationTag?:string|null;active:boolean};
type DisplayAccount={id:string;accountName:string;currency:string;status:string;mainRecipient:boolean;accountMask?:string|null;accountNumber?:string|null;recipientType?:string|null;transferMethod?:string|null;receivingAddress?:string|null;bankCode?:string|null;native:boolean};
type SellWorkspace={accounts:DisplayAccount[];assets:Asset[];saved:ReadyPreference|null;coverageFailed:boolean};

function ownershipLabel(account:Pick<DisplayAccount,"native"|"recipientType">){
  if(account.native)return "My account";
  return account.recipientType==="THIRD_PARTY"?"Third-party account":"My account";
}
function accountNumberLabel(account:Pick<DisplayAccount,"accountNumber"|"accountMask">){
  return maskBankIdentifier(account.accountMask?.trim()||account.accountNumber);
}

function mergeSellAccounts(nativeDestinations:NativeDestination[],bankAccounts:unknown):DisplayAccount[]{
  const nativeListed=nativeDestinations.map((item,index)=>({
    id:item.id,
    accountName:item.accountName,
    currency:"NGN",
    status:item.status,
    mainRecipient:index===0,
    accountMask:item.maskedAccountNumber,
    accountNumber:item.accountNumber??null,
    recipientType:"SELF" as const,
    bankCode:item.bankCode,
    native:true,
  }));
  const nativeIds=new Set(nativeListed.map(item=>item.id));
  const bankListed=bankAccountItems<BankAccount>(bankAccounts)
    .filter(item=>!nativeIds.has(item.id))
    .map(item=>({...item,native:false}));
  return sortPayoutAccounts([...nativeListed,...bankListed]);
}

/** List hub only needs destinations — skip coverage/preferences waterfall. */
async function fetchSellDestinations():Promise<DisplayAccount[]>{
  // Match mobile: always merge native destinations with Bakkt bank accounts.
  // Cached list first (no refresh=true) so the hub paints without waiting on Bakkt.
  const [nativeDestinations,bankAccounts]=await Promise.all([
    withDeadline(moneyRouteApi<NativeDestination[]>("/native-destinations").catch(()=>[] as NativeDestination[]),12000,"Destination accounts timed out"),
    withDeadline(
      moneyRouteApi<unknown>("/bank-accounts?size=100").catch(()=>[]),
      12000,
      "Destination accounts timed out",
    ),
  ]);
  return mergeSellAccounts(nativeDestinations,bankAccounts);
}

async function fetchSellWorkspace():Promise<SellWorkspace>{
  // Parallelize everything — sequential preferences→coverage→accounts was stacking timeouts.
  // Prefer cached coverage/banks; detail flows can still recover if stale.
  const [preferences,coverageOutcome,nativeDestinations,bankAccounts]=await Promise.all([
    withDeadline(moneyRouteApi<ReadyPreference[]>("/preferences"),12000,"Preferences timed out").catch(()=>[] as ReadyPreference[]),
    withDeadline(moneyRouteApi<Coverage>("/coverage"),12000,"Coverage timed out")
      .then(coverage=>({failed:false as const,coverage}))
      .catch(()=>({failed:true as const,coverage:{transferableAssets:[] as Asset[]}})),
    withDeadline(moneyRouteApi<NativeDestination[]>("/native-destinations").catch(()=>[] as NativeDestination[]),12000,"Destination accounts timed out"),
    withDeadline(
      moneyRouteApi<unknown>("/bank-accounts?size=100").catch(()=>[]),
      12000,
      "Destination accounts timed out",
    ),
  ]);

  return {
    accounts:mergeSellAccounts(nativeDestinations,bankAccounts),
    assets:sellDepositAssets(coverageOutcome.coverage.transferableAssets??[]),
    saved:preferences[0]??null,
    coverageFailed:coverageOutcome.failed,
  };
}

function sellDepositAssets(items:Asset[]){
  return items
    .filter(item=>item.type==="CRYPTO"&&item.networks.length>0||item.type==="STABLECOIN"&&ROUTE_TOKENS.has(item.code)&&item.networks.some(value=>TARGET_NETWORKS.has(value.code)))
    .map(item=>({...item,networks:item.type==="CRYPTO"?item.networks:item.networks.filter(value=>TARGET_NETWORKS.has(value.code))}))
    .sort((a,b)=>(ASSET_RELEVANCE.get(a.code)??Number.MAX_SAFE_INTEGER)-(ASSET_RELEVANCE.get(b.code)??Number.MAX_SAFE_INTEGER)||a.name.localeCompare(b.name));
}

function AccountMark({account,size=40}:{account:DisplayAccount;size?:number}){
  return <span className="sell-destination-mark" aria-hidden="true">{fiatLogo(account.currency,size)}</span>;
}

export function SellRoutePage(){
  const approved=useComplianceApproved();
  const {accountScope,canMutateFinances}=useDashboardFinance();
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState("");
  const [loadAttempt,setLoadAttempt]=useState(0);
  const [accounts,setAccounts]=useState<DisplayAccount[]>([]);

  useEffect(()=>{
    if(!approved){setLoading(false);return;}
    let active=true;
    setLoading(true);
    setAccounts([]);
    void fetchSellDestinations()
      .then(result=>{if(active){setAccounts(result);setLoadError("");}})
      .catch(error=>{if(active){setLoadError(loadErrorMessage(error,"Destination accounts could not be loaded"));setAccounts([]);}})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[accountScope,approved,loadAttempt]);

  if(!approved){
    return <ComplianceRequiredGate
      className="sell-workspace"
      titleId="sell-verify-title"
      title="Verify before you sell"
      detail="Complete compliance first. Sell destinations unlock after your identity check is approved."
    />;
  }

  return <><TransactionRealtimeRefresh scope={accountScope}/><section className="dashboard-canvas dashboard-route-page sell-workspace" aria-labelledby="sell-hub-title">
    {loading?<div className="compliance-loading"><IconLoader2 className="spin"/>Loading destination accounts...</div>
      :loadError?<div className="accounts-load-error" role="alert">
        <IconAlertTriangle size={22}/>
        <div className="accounts-load-error-copy">
          <strong>Destinations could not be loaded</strong>
          <p>{loadError}</p>
        </div>
        <div className="sell-receive-idle-actions">
          <button type="button" className="compliance-primary" onClick={()=>{setLoadError("");setLoadAttempt(value=>value+1);}}>Try again</button>
        </div>
      </div>
      :<>
      <header className="buy-soft-head sell-hub-head">
        <div>
          <span className="overview-kicker">Payout</span>
          <h2 id="sell-hub-title">Destination accounts</h2>
          <p>Where sale proceeds settle. Open one to create crypto send instructions.</p>
        </div>
        {canMutateFinances?<Link className="compliance-secondary buy-deposits-add" href="/dashboard/sell/add"><IconPlus size={16}/> Add account</Link>:null}
      </header>

      {accounts.length===0?<RouteEmptyState
        title="Add a destination account"
        detail={canMutateFinances?"Add a verified bank account before creating crypto send instructions.":"No destination account is available to view yet."}
        imageSrc="/illustrations/account-destination-account-3d.png"
      />:<div className="sell-destination-list" role="list">
        {accounts.map(account=>{
          const status=accountReadinessLabel(account.status);
          const ready=isAccountReady(account.status);
          const thirdParty=account.recipientType==="THIRD_PARTY";
          return <Link
            key={account.id}
            role="listitem"
            className={`sell-destination-card${account.mainRecipient?" primary":""}${!ready?" not-ready":""}`}
            href={`/dashboard/sell/${encodeURIComponent(account.id)}`}
          >
            <div className="sell-destination-head">
              <AccountMark account={account} size={40}/>
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
          </Link>;
        })}
      </div>}
    </>}
  </section></>;
}

export function SellAccountPage({accountId}:{accountId:string}){
  const approved=useComplianceApproved();
  const {accountScope}=useDashboardFinance();
  const {show}=useToast();
  const error=useCallback((message:string)=>show({tone:"danger",title:"Check this step",message}),[show]);
  const [loading,setLoading]=useState(true),[addressBusy,setAddressBusy]=useState(false),[refreshKey,setRefreshKey]=useState(0);
  const [loadError,setLoadError]=useState("");
  const [coverageFailed,setCoverageFailed]=useState(false);
  const [accounts,setAccounts]=useState<DisplayAccount[]>([]),[assets,setAssets]=useState<Asset[]>([]);
  const [asset,setAsset]=useState(""),[network,setNetwork]=useState(""),[deposit,setDeposit]=useState<DepositAddress|null>(null),[addressError,setAddressError]=useState(""),[copied,setCopied]=useState("");
  const [addressPending,setAddressPending]=useState(false);
  const [tronStatus,setTronStatus]=useState<"idle"|"converting"|"ready"|"failed">("idle");
  const [tronAddress,setTronAddress]=useState("");

  const load=useCallback(async()=>{
    const result=await fetchSellWorkspace();
    const initialAsset=result.assets.find(item=>item.code===result.saved?.token)??result.assets[0];
    setAccounts(result.accounts);
    setAssets(result.assets);
    setCoverageFailed(result.coverageFailed);
    setAsset(current=>current&&result.assets.some(item=>item.code===current)?current:initialAsset?.code??"");
    setNetwork(current=>{
      if(current&&initialAsset?.networks.some(item=>item.code===current))return current;
      if((initialAsset?.networks.length??0)===1)return initialAsset!.networks[0].code;
      return "";
    });
  },[]);

  useEffect(()=>{
    if(!approved){setLoading(false);return;}
    let active=true;
    setLoading(true);
    void load()
      .then(()=>{if(active)setLoadError("");})
      .catch(problem=>{if(active)setLoadError(loadErrorMessage(problem,"Account details could not be loaded"));})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[accountScope,approved,load]);

  const account=accounts.find(item=>item.id===accountId)??null;
  const selectedAsset=assets.find(item=>item.code===asset)??null;
  const assetOptions:SelectOption[]=assets.map(item=>({value:item.code,label:item.name,detail:item.type==="STABLECOIN"?"Stablecoin":"Crypto",kind:"crypto"}));
  const networks=useMemo(()=>selectedAsset?.networks??[],[selectedAsset]);
  const networkOptions:SelectOption[]=useMemo(()=>networks.map(item=>({value:item.code,label:item.name,detail:networkRailLabel(item.code),kind:"network"})),[networks]);
  const status=account?accountReadinessLabel(account.status):"";
  const ready=account?isAccountReady(account.status):false;
  const readinessHint=account?accountReadinessHint(account.status):null;
  const thirdParty=account?.recipientType==="THIRD_PARTY";

  function chooseAsset(value:string){
    const item=assets.find(entry=>entry.code===value);
    setAsset(value);
    setNetwork(item?.networks.length===1?item.networks[0].code:"");
    setDeposit(null);
    setAddressError("");
    setAddressPending(false);
    setTronStatus("idle");
    setTronAddress("");
  }
  function chooseNetwork(value:string){
    setNetwork(value);
    setDeposit(null);
    setAddressError("");
    setAddressPending(false);
    setTronStatus("idle");
    setTronAddress("");
  }
  async function copy(value:string,key:string){
    try{
      await navigator.clipboard.writeText(value);
      setCopied(key);
      show({tone:"success",title:"Copied",message:key==="address"?"Send address copied.":key==="tag"?"Memo / tag copied.":"Copied."});
      window.setTimeout(()=>setCopied(""),1800);
    }catch{error("Copy failed. Select the value and copy it manually.");}
  }

  useEffect(()=>{
    if(!account||!ready||!asset||!network){setDeposit(null);setAddressError("");setAddressPending(false);setAddressBusy(false);return;}
    let cancelled=false;
    const controller=new AbortController();
    const timer=window.setTimeout(()=>{
      setAddressBusy(true);setAddressError("");setAddressPending(false);setDeposit(null);setTronStatus("idle");setTronAddress("");
      void withDeadline(moneyRouteApi<DepositAddress>("/deposit-addresses",{method:"POST",headers:{"Content-Type":"application/json"},signal:controller.signal,body:JSON.stringify({payoutAccountId:account.id,asset,network,nativeRoute:account.native})}),15000,"Send address timed out")
        .then(value=>{if(cancelled)return;if(value.address==="PENDING"||!value.active){setAddressPending(true);return;}setDeposit(value);})
        .catch(problem=>{controller.abort();if(cancelled)return;setAddressError(loadErrorMessage(problem,"The send address could not be retrieved"));})
        .finally(()=>{if(!cancelled)setAddressBusy(false);});
    },120);
    return()=>{cancelled=true;window.clearTimeout(timer);controller.abort();};
  },[account,ready,asset,network,refreshKey]);

  useEffect(()=>{
    let cancelled=false;
    if(!deposit){setTronStatus("idle");setTronAddress("");return;}
    if(deposit.network!=="TRON"||!isEvmReceivingAddress(deposit.address)){
      setTronStatus("idle");
      setTronAddress("");
      return;
    }
    const source=deposit.address;
    setTronStatus("converting");
    setTronAddress("");
    void evmToTronAddress(source).then(value=>{
      if(cancelled)return;
      if(!value){setTronStatus("failed");setTronAddress("");return;}
      setTronAddress(value);
      setTronStatus("ready");
    }).catch(()=>{if(!cancelled){setTronStatus("failed");setTronAddress("");}});
    return()=>{cancelled=true;};
  },[deposit]);

  if(!approved){
    return <ComplianceRequiredGate
      className="sell-workspace"
      titleId="sell-detail-verify-title"
      title="Verify before you sell"
      detail="Complete compliance first. Crypto send instructions unlock after your identity check is approved."
    />;
  }

  if(loading)return <section className="dashboard-canvas dashboard-route-page sell-workspace"><div className="compliance-loading"><IconLoader2 className="spin"/>Loading account details...</div></section>;
  if(loadError)return <section className="dashboard-canvas dashboard-route-page sell-workspace"><div className="accounts-load-error" role="alert"><IconAlertTriangle size={22}/><div><strong>Could not load this destination</strong><p>{loadError}</p></div><div className="sell-receive-idle-actions"><button type="button" className="compliance-secondary" onClick={()=>{setLoadError("");setLoading(true);void load().catch(problem=>setLoadError(loadErrorMessage(problem,"Account details could not be loaded"))).finally(()=>setLoading(false));}}><IconRefresh size={15}/> Try again</button><Link className="compliance-primary" href="/dashboard/sell"><IconArrowLeft size={16}/> Back to Sell</Link></div></div></section>;
  if(!account)return <section className="dashboard-canvas dashboard-route-page sell-workspace"><div className="sell-empty-state"><IconBuildingBank size={28}/><strong>Destination not found</strong><p>This payout account is no longer available.</p><Link className="compliance-primary" href="/dashboard/sell"><IconArrowLeft size={16}/> Back to Sell</Link></div></section>;

  const needsTronConversion=Boolean(deposit&&deposit.network==="TRON"&&isEvmReceivingAddress(deposit.address));
  const displayedAddress=!deposit?"":needsTronConversion?tronAddress:deposit.address;
  const addressReady=Boolean(deposit&&displayedAddress&&(!needsTronConversion||tronStatus==="ready"));
  const networkName=networks.find(item=>item.code===network)?.name??(network?titleCase(network):"");
  const confirmTail=displayedAddress.length>=10?displayedAddress.slice(-4):"";

  return <section className="dashboard-canvas dashboard-route-page sell-workspace sell-account-workspace" aria-labelledby="sell-detail-title">
    <header className="sell-toolbar">
      <div>
        <p id="sell-detail-title">Create crypto send instructions for this payout account</p>
        <p className="sell-toolbar-hint">Choose the crypto and network your wallet will send on. Wrong network can mean permanent loss.</p>
      </div>
      <Link className="compliance-secondary sell-toolbar-action" href="/dashboard/sell"><IconArrowLeft size={16}/> Back to Sell</Link>
    </header>

    <section className="sell-detail-settlement" aria-label="Payout account">
      <AccountMark account={account} size={40}/>
      <div className="sell-detail-settlement-copy">
        <strong>{account.accountName}</strong>
        <code className="sell-destination-number">{accountNumberLabel(account)}</code>
        <small>{account.currency} · {ownershipLabel(account)}{account.mainRecipient?" · Primary destination":""}</small>
      </div>
      <span className={`sell-destination-status${ready?" ready":""}`}>{status}</span>
    </section>

    {!ready?<div className="accounts-status-banner" role="status">
      <IconAlertTriangle size={18}/>
      <div>
        <strong>Do not send crypto yet</strong>
        <p>{readinessHint||"Wait until this destination shows Ready."}</p>
      </div>
    </div>:null}

    {thirdParty?<div className="accounts-status-banner warning" role="status">
      <IconAlertTriangle size={18}/>
      <div>
        <strong>Third-party destination</strong>
        <p>Sale proceeds settle to someone else’s bank account. Confirm that is intentional before you send.</p>
      </div>
    </div>:null}

    <section className="sell-detail-instructions" aria-labelledby="sell-detail-instructions-title">
      <header className="sell-detail-instructions-head">
        <div>
          <h2 id="sell-detail-instructions-title">Send instructions</h2>
          <p>Select the asset and network, then send from your wallet to the address below.</p>
        </div>
      </header>

      {!ready?<div className="sell-detail-idle">
        <IconAlertTriangle size={24}/>
        <strong>Destination not ready</strong>
        <p>Crypto send instructions stay locked until this payout account is Ready.</p>
        <Link className="compliance-secondary" href="/dashboard/sell">Back to Sell</Link>
      </div>:coverageFailed||assets.length===0?<div className="sell-detail-idle error">
        <IconAlertTriangle size={24}/>
        <strong>Supported assets unavailable</strong>
        <p>We could not load crypto networks for this sell. Try again in a moment.</p>
        <button type="button" onClick={()=>{setLoading(true);void load().catch(problem=>setLoadError(loadErrorMessage(problem))).finally(()=>setLoading(false));}}><IconRefresh size={15}/> Try again</button>
      </div>:<>
        <div className="sell-detail-controls">
          <RouteSelect label="Crypto to send" value={asset} options={assetOptions} onChange={chooseAsset} placeholder="Choose crypto"/>
          <RouteSelect label="Network" value={network} options={networkOptions} onChange={chooseNetwork} placeholder={asset?"Choose network":"Select crypto first"} disabled={!asset||networkOptions.length===0}/>
        </div>

        <div aria-live="polite">
          {!network?<div className="sell-detail-idle">
            <strong>Choose a network</strong>
            <p>Use the same network your wallet will send on.</p>
          </div>:addressBusy?<div className="sell-detail-idle">
            <IconLoader2 className="spin" size={24}/>
            <strong>Loading send address</strong>
          </div>:addressPending?<div className="sell-detail-idle" role="status">
            <IconRefresh size={24}/>
            <strong>Preparing your address</strong>
            <p>Your address is being prepared. Check again shortly.</p>
            <button type="button" onClick={()=>setRefreshKey(key=>key+1)}><IconRefresh size={15}/> Check again</button>
          </div>:addressError?<div className="sell-detail-idle error">
            <IconAlertTriangle size={24}/>
            <strong>Could not load this address</strong>
            <p>{addressError}</p>
            <div className="sell-receive-idle-actions">
              <button type="button" onClick={()=>setRefreshKey(key=>key+1)}><IconRefresh size={15}/> Try again</button>
              <button type="button" className="ghost" onClick={()=>chooseNetwork("")}>Choose another network</button>
            </div>
          </div>:deposit&&needsTronConversion&&tronStatus==="converting"?<div className="sell-detail-idle">
            <IconLoader2 className="spin" size={24}/>
            <strong>Preparing TRON address</strong>
            <p>Converting to the correct TRON format. Copy and QR stay locked until this finishes.</p>
          </div>:deposit&&needsTronConversion&&tronStatus==="failed"?<div className="sell-detail-idle error">
            <IconAlertTriangle size={24}/>
            <strong>TRON address unavailable</strong>
            <p>We could not convert this address to TRON format. Do not send to an EVM address on TRON.</p>
            <button type="button" onClick={()=>setRefreshKey(key=>key+1)}><IconRefresh size={15}/> Try again</button>
          </div>:addressReady&&deposit?<article className="sell-detail-ready">
            <div className="sell-receive-qr">
              <DepositQr value={displayedAddress} label={`${deposit.asset} on ${deposit.network}`}/>
            </div>
            <div className="sell-detail-address">
              <div>
                <span>Send {deposit.asset} on {networkRailLabel(deposit.network)}</span>
                <code>{displayedAddress}</code>
              </div>
              <button type="button" className="sell-copy-primary" onClick={()=>void copy(displayedAddress,"address")}>
                {copied==="address"?<IconCheck size={17}/>:<IconCopy size={17}/>}
                {copied==="address"?"Copied":"Copy address"}
              </button>
              {deposit.destinationTag?<div className="sell-detail-tag">
                <span>Memo / tag required</span>
                <code>{deposit.destinationTag}</code>
                <button type="button" className="sell-copy-primary" onClick={()=>void copy(deposit.destinationTag!,"tag")}>
                  {copied==="tag"?<IconCheck size={17}/>:<IconCopy size={17}/>}
                  {copied==="tag"?"Copied":"Copy tag"}
                </button>
              </div>:null}
              <p className="sell-detail-caution"><IconAlertTriangle size={16}/> Send only <strong>{deposit.asset}</strong> on <strong>{networkName}</strong>. Confirm the address ends with <strong>{confirmTail}</strong> before you send.</p>
            </div>
          </article>:null}
        </div>
      </>}
    </section>
  </section>;
}
