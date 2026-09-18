"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useEffect,useMemo,useState} from "react";
import {IconArrowsUpDown,IconLoader2,IconChevronDown} from "@tabler/icons-react";
import {customerFetch} from "@/lib/customer-session";
import {ASSET_RELEVANCE,COUNTRY_CURRENCY,assetLogo,fiatLogo,networkRailLabel,residenceAllowsCurrency} from "./money-route-controls";
import {useDashboardCustomer,useDashboardFinance,useDashboardSetup} from "./dashboard-customer";
import {accountSetupHref} from "./dashboard-route-copy";
import "./rate-calculator.css";

type Direction="buy"|"sell";
type Quote={sourceAsset:string;sourceAmount:number;destinationAsset:string;destinationNetwork?:string|null;destinationAmount:number;customerFee?:number;expiresAt:string;pricingMode?:string};
type Preference={fiatCurrency?:string;token?:string;network?:string};
type Asset={code:string;networks:{code:string;name?:string}[]};
type Coverage={fiatCurrencies:{code:string}[];fundingCurrencies:{code:string}[];transferableAssets:Asset[]};
type Estimate={key:string;status:"loading"|"ready"|"error"|"expired";quote?:Quote};

// The estimate API currently supports the launch currencies, not every
// destination account currency in the payout catalog.
const FIAT=["EUR","USD","GBP","NGN"];
const UNAVAILABLE="An estimate is unavailable right now. Try again.";

function defaultNetwork(asset:Asset){
  const preferred:Record<string,string>={BTC:"BITCOIN",ETH:"ETHEREUM",SOL:"SOLANA",USDT:"TRON",USDC:"ARBITRUM"};
  return asset.networks.find(item=>item.code===preferred[asset.code])?.code??asset.networks[0]?.code??"";
}
function formatAmount(value:number,asset:string){
  const digits=FIAT.includes(asset)?2:asset==="BTC"||asset==="ETH"?8:6;
  return value.toLocaleString("en",{maximumFractionDigits:digits,minimumFractionDigits:0});
}
function parseAmount(value:string){
  const cleaned=value.replace(/,/g,"").trim();
  return /^(?:\d+\.?\d*|\.\d+)$/.test(cleaned)&&Number.isFinite(Number(cleaned))?Number(cleaned):0;
}
function usableCoverage(value:Coverage):Coverage{
  if(!Array.isArray(value?.fundingCurrencies)||!Array.isArray(value?.fiatCurrencies)||!Array.isArray(value?.transferableAssets))throw new Error(UNAVAILABLE);
  return {
    fiatCurrencies:value.fiatCurrencies.filter(item=>FIAT.includes(item.code)),
    fundingCurrencies:value.fundingCurrencies.filter(item=>FIAT.includes(item.code)),
    transferableAssets:value.transferableAssets.filter(item=>item.code&&Array.isArray(item.networks)&&item.networks.some(network=>network.code))
      .map(item=>({...item,networks:item.networks.filter(network=>network.code)}))
      .sort((a,b)=>(ASSET_RELEVANCE.get(a.code)??999)-(ASSET_RELEVANCE.get(b.code)??999)||a.code.localeCompare(b.code)),
  };
}
async function requestQuote(direction:Direction,body:Record<string,unknown>,signal:AbortSignal):Promise<Quote>{
  const path=direction==="buy"?"/api/money/quotes/estimate":"/api/money/quotes/sell/estimate";
  const response=await customerFetch(path,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(body),signal});
  const value=await response.json().catch(()=>null);
  const expectedDestination=direction==="buy"?body.destinationAsset:body.destinationFiat;
  if(!response.ok||!value||value.sourceAsset!==body.sourceAsset||value.destinationAsset!==expectedDestination
    ||!Number.isFinite(Number(value.sourceAmount))||Math.abs(Number(value.sourceAmount)-Number(body.sourceAmount))>Math.max(1e-9,Number(body.sourceAmount)*1e-10)
    ||!Number.isFinite(Number(value.destinationAmount))||Number(value.destinationAmount)<=0
    ||!Number.isFinite(Date.parse(value.expiresAt))||Date.parse(value.expiresAt)<=Date.now()
    ||(direction==="buy"&&value.destinationNetwork!==body.destinationNetwork)
    ||(value.customerFee!=null&&(!Number.isFinite(Number(value.customerFee))||Number(value.customerFee)<0)))throw new Error(UNAVAILABLE);
  return {...value,sourceAmount:Number(value.sourceAmount),destinationAmount:Number(value.destinationAmount),customerFee:value.customerFee==null?undefined:Number(value.customerFee)};
}

export function RateCalculator(){
  const customer=useDashboardCustomer();
  const setup=useDashboardSetup();
  const {accountScope}=useDashboardFinance();
  const router=useRouter();
  const home=COUNTRY_CURRENCY[customer.country?.toUpperCase()??""]??"EUR";
  const [direction,setDirection]=useState<Direction>("buy");
  const [fiat,setFiat]=useState(home);
  const [crypto,setCrypto]=useState("USDC");
  const [network,setNetwork]=useState("");
  const [sourceText,setSourceText]=useState("100");
  const [coverage,setCoverage]=useState<Coverage|null>(null);
  const [coverageError,setCoverageError]=useState(false);
  const [coverageAttempt,setCoverageAttempt]=useState(0);
  const [estimate,setEstimate]=useState<Estimate|null>(null);
  const [attempt,setAttempt]=useState(0);

  useEffect(()=>{
    let active=true;
    const controller=new AbortController();
    const timeout=window.setTimeout(()=>controller.abort(),12000);
    const options={headers:{Accept:"application/json"},signal:controller.signal};
    const preferences=customerFetch("/api/onboarding/money-routes/preferences",options).then(response=>response.ok?response.json():[]).catch(()=>[]);
    void Promise.all([
      customerFetch("/api/onboarding/money-routes/coverage",options).then(async response=>{
        if(!response.ok)throw new Error(UNAVAILABLE);
        return usableCoverage(await response.json());
      }),preferences,
    ]).then(([next,saved])=>{
      if(!active)return;
      const preference=(Array.isArray(saved)?saved[0]:null) as Preference|null;
      const funding=next.fundingCurrencies.filter(item=>residenceAllowsCurrency(customer.country,item.code));
      const nextFiat=funding.find(item=>item.code===preference?.fiatCurrency)?.code??funding.find(item=>item.code===home)?.code??funding[0]?.code??"";
      const nextAsset=next.transferableAssets.find(item=>item.code===preference?.token)??next.transferableAssets.find(item=>item.code==="USDC")??next.transferableAssets[0];
      setFiat(nextFiat);setCrypto(nextAsset?.code??"");
      setNetwork(nextAsset?(nextAsset.networks.find(item=>nextAsset.code===preference?.token&&item.code===preference.network)?.code??defaultNetwork(nextAsset)):"");
      setCoverage({...next,fundingCurrencies:funding,fiatCurrencies:next.fiatCurrencies.filter(item=>residenceAllowsCurrency(customer.country,item.code))});setCoverageError(false);
    }).catch(()=>{if(active)setCoverageError(true);}).finally(()=>window.clearTimeout(timeout));
    return()=>{active=false;controller.abort();window.clearTimeout(timeout);};
  },[home,coverageAttempt,customer.country]);

  const fiatOptions=useMemo(()=>{
    const list=(direction==="buy"?coverage?.fundingCurrencies:coverage?.fiatCurrencies)?.map(item=>item.code)??[];
    return list.filter(code=>residenceAllowsCurrency(customer.country,code));
  },[coverage,direction,customer.country]);
  const cryptoOptions=coverage?.transferableAssets.map(item=>item.code)??[];
  const networks=coverage?.transferableAssets.find(item=>item.code===crypto)?.networks??[];
  const sourceAsset=direction==="buy"?fiat:crypto;
  const destinationAsset=direction==="buy"?crypto:fiat;
  const sourceAmount=parseAmount(sourceText);
  const supported=!!coverage&&fiatOptions.includes(fiat)&&cryptoOptions.includes(crypto)&&networks.some(item=>item.code===network);
  const unsupportedBuy=direction==="buy"&&fiat==="NGN";
  const canEstimate=supported&&!unsupportedBuy&&sourceAmount>0;
  const key=JSON.stringify([direction,fiat,crypto,network,sourceText,attempt]);
  const current=estimate?.key===key?estimate:null;
  // Never show a previous request while a new amount or route debounces.
  const quote=canEstimate&&current?.status==="ready"?current.quote??null:null;
  const busy=canEstimate&&(!current||current.status==="loading");
  const expired=canEstimate&&current?.status==="expired";
  const destinationText=quote?formatAmount(quote.destinationAmount,destinationAsset):"";
  const ctaHref=setup&&!setup.approved?accountSetupHref(customer.accountType,accountScope):direction==="buy"?"/dashboard/buy":"/dashboard/sell";
  const ctaLabel=setup&&!setup.approved?"Complete compliance first":direction==="buy"?"Continue to buy":"Continue to sell";

  useEffect(()=>{
    if(!canEstimate)return;
    let active=true;
    const controller=new AbortController();
    let timeout:number|undefined;
    const timer=window.setTimeout(()=>{
      setEstimate({key,status:"loading"});
      timeout=window.setTimeout(()=>{if(active){controller.abort();setEstimate({key,status:"error"});active=false;}},12000);
      const body=direction==="buy"?{sourceAsset:fiat,sourceAmount,destinationAsset:crypto,destinationNetwork:network}:{sourceAsset:crypto,sourceNetwork:network,sourceAmount,destinationFiat:fiat};
      void requestQuote(direction,body,controller.signal)
        .then(next=>{if(active)setEstimate({key,status:"ready",quote:next});})
        .catch(()=>{if(active)setEstimate({key,status:"error"});})
        .finally(()=>window.clearTimeout(timeout));
    },450);
    return()=>{active=false;controller.abort();window.clearTimeout(timer);window.clearTimeout(timeout);};
  },[canEstimate,key,direction,fiat,crypto,network,sourceAmount]);

  useEffect(()=>{
    if(estimate?.status!=="ready"||!estimate.quote)return;
    const expiry=Date.parse(estimate.quote.expiresAt);
    const expire=()=>{
      if(Date.now()>=expiry)setEstimate(current=>current===estimate?{key:estimate.key,status:"expired"}:current);
    };
    const timer=window.setTimeout(expire,Math.max(0,expiry-Date.now()));
    window.addEventListener("focus",expire);
    document.addEventListener("visibilitychange",expire);
    return()=>{window.clearTimeout(timer);window.removeEventListener("focus",expire);document.removeEventListener("visibilitychange",expire);};
  },[estimate]);

  function swapDirection(){
    const next=direction==="buy"?"sell":"buy";
    const options=(next==="buy"?coverage?.fundingCurrencies:coverage?.fiatCurrencies)??[];
    setFiat(options.find(item=>item.code===fiat)?.code??options.find(item=>item.code===home)?.code??options[0]?.code??"");
    setDirection(next);setSourceText(destinationText||"1");setAttempt(value=>value+1);
  }
  function chooseFiat(value:string){setFiat(value);setAttempt(value=>value+1);}
  function chooseCrypto(value:string){
    setCrypto(value);
    const asset=coverage?.transferableAssets.find(item=>item.code===value);
    setNetwork(asset?defaultNetwork(asset):"");setAttempt(value=>value+1);
  }
  const error=coverageError?"Available routes could not be loaded.":!coverage?"":unsupportedBuy?"Buy estimates aren’t available for NGN yet.":!supported?"No estimate is available for this route.":expired?"Estimate expired. Refresh to see a current estimate.":current?.status==="error"?UNAVAILABLE:"";
  const status=!coverage?(coverageError?"Unavailable":"Loading routes"):busy?"Updating estimate":quote?(quote.pricingMode==="SIMULATOR"?"Illustrative estimate":"Indicative estimate"):expired?"Expired":error?"Unavailable":"Enter an amount";

  return <section className="rate-calculator" aria-labelledby="rate-calculator-title">
    <header className="rate-calculator-head">
      <div><h2 id="rate-calculator-title">Rate estimate</h2><p>Explore your route before you move.</p></div>
      <div className="rate-calculator-direction" role="group" aria-label="Trade direction"><button type="button" aria-pressed={direction==="buy"} disabled={!coverage} onClick={()=>{if(direction!=="buy")swapDirection();}}>Buy crypto</button><button type="button" aria-pressed={direction==="sell"} disabled={!coverage} onClick={()=>{if(direction!=="sell")swapDirection();}}>Sell crypto</button></div>
      {quote?<strong className="rate-calculator-rate">1 {quote.sourceAsset} ≈ {formatAmount(quote.destinationAmount/quote.sourceAmount,quote.destinationAsset)} {quote.destinationAsset}</strong>:null}
    </header>
    <div className="rate-calculator-body">
      <div className="rate-calculator-panel">
        <div className="rate-calculator-field">
          <span><label htmlFor="rate-source-amount">{direction==="buy"?"You send":"You sell"}</label></span>
          <div className="rate-calculator-input">
            <input id="rate-source-amount" inputMode="decimal" value={sourceText} aria-label={`${sourceAsset||"Source"} amount`} onChange={event=>{setSourceText(event.target.value);setAttempt(value=>value+1);}}/>
            <div className="rate-currency-control">
            <select disabled={!coverage} aria-label={direction==="buy"?"Funding currency":"Crypto asset"} value={sourceAsset} onChange={event=>direction==="buy"?chooseFiat(event.target.value):chooseCrypto(event.target.value)}>
              {(direction==="buy"?fiatOptions:cryptoOptions).map(item=><option key={item} value={item}>{item.replace("_",".")}</option>)}
            </select>
            {sourceAsset?<span className="rate-calculator-mark" aria-hidden="true">{direction==="buy"?fiatLogo(sourceAsset,28):assetLogo(sourceAsset,28)}</span>:null}
            <span className="rate-currency-label" aria-hidden="true">{sourceAsset.replace("_",".")||"Select"}</span>
            <IconChevronDown className="rate-currency-chevron" size={15} aria-hidden="true"/>
            </div>
          </div>
        </div>
        <button type="button" className="rate-calculator-swap" disabled={!coverage} onClick={swapDirection} aria-label="Swap buy and sell"><IconArrowsUpDown size={18}/></button>
        <div className="rate-calculator-field">
          <span><label htmlFor="rate-destination-amount">{direction==="buy"?"You receive (estimated)":"You get (estimated)"}</label></span>
          <div className="rate-calculator-input">
            <input id="rate-destination-amount" value={destinationText} readOnly aria-label={`${destinationAsset||"Destination"} estimated amount`} placeholder="—"/>
            <div className="rate-currency-control">
            <select disabled={!coverage} aria-label={direction==="buy"?"Crypto asset":"Payout currency"} value={destinationAsset} onChange={event=>direction==="buy"?chooseCrypto(event.target.value):chooseFiat(event.target.value)}>
              {(direction==="buy"?cryptoOptions:fiatOptions).map(item=><option key={item} value={item}>{item.replace("_",".")}</option>)}
            </select>
            {destinationAsset?<span className="rate-calculator-mark" aria-hidden="true">{direction==="buy"?assetLogo(destinationAsset,28):fiatLogo(destinationAsset,28)}</span>:null}
            <span className="rate-currency-label" aria-hidden="true">{destinationAsset.replace("_",".")||"Select"}</span>
            <IconChevronDown className="rate-currency-chevron" size={15} aria-hidden="true"/>
            </div>
          </div>
        </div>
      </div>
      <aside className="rate-calculator-meta">
        <div><span>Estimated total fee</span><strong>{quote?.customerFee!=null?`${formatAmount(quote.customerFee,fiat)} ${fiat}`:busy?"…":"—"}</strong></div>
        <div><span>Estimate</span><strong role="status" aria-live="polite">{status}</strong></div>
        <div><label htmlFor="rate-network">Network</label><select id="rate-network" aria-label="Network" value={network} disabled={!networks.length} onChange={event=>{setNetwork(event.target.value);setAttempt(value=>value+1);}}>{networks.map(item=><option key={item.code} value={item.code}>{networkRailLabel(item.code)}</option>)}</select></div>
        {error?<p className="rate-calculator-error" role="status">{error}</p>:null}
        {coverageError?<button type="button" className="compliance-secondary" onClick={()=>{setCoverageError(false);setCoverageAttempt(value=>value+1);}}>Retry loading routes</button>:null}
        {canEstimate&&(expired||current?.status==="error")?<button type="button" className="compliance-secondary" onClick={()=>setAttempt(value=>value+1)}>Refresh estimate</button>:null}
        <p className="rate-calculator-disclaimer">Indicative amounts only. Review your final rate and fees before transferring.</p>
        {setup?<Link className="compliance-primary rate-calculator-cta" href={ctaHref}>{busy?<IconLoader2 className="spin" size={16} aria-hidden="true"/>:null}{ctaLabel}</Link>:<>
          <p className="rate-calculator-error" role="status">Setup status unavailable. Refresh to continue.</p>
          <button type="button" className="compliance-secondary rate-calculator-cta" onClick={()=>router.refresh()}>Retry setup status</button>
        </>}
      </aside>
    </div>
  </section>;
}
