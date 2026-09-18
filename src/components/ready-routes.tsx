"use client";

import Image from "next/image";
import Link from "next/link";
import {useEffect,useState} from "react";
import {CircleFlag} from "react-circle-flags";
import {IconArrowRight,IconLoader2} from "@tabler/icons-react";
import {customerFetch} from "@/lib/customer-session";
import {apiErrorMessage} from "@/lib/api-error";
import {buyLane,sellLane,type ReadyLane,type ReadyPreference,type ReadyFunding,type ReadyPayout} from "./ready-route-copy";

type BankAccount={accountName:string;currency:string;mainRecipient:boolean;accountMask?:string|null};
type NativeDestination={accountName:string;maskedAccountNumber:string};

const ROUTE_TOKENS=new Set(["USDC","USDC_E","USDT","CEUR","CUSD","AGEUR","EURC"]);
const TOKEN_IMAGE:Record<string,string>={USDC:"USDC",USDC_E:"USDCE",USDT:"USDT",CEUR:"CEUR",CUSD:"CUSD",AGEUR:"AGEUR",EURC:"EURC"};
const FIAT_FLAG:Record<string,string>={USD:"us",EUR:"eu",GBP:"gb",NGN:"ng",AED:"ae",TRY:"tr",INR:"in",PKR:"pk",BRL:"br",ARS:"ar",CAD:"ca",COP:"co",IDR:"id",KES:"ke",PHP:"ph",VND:"vn",GHS:"gh",GTQ:"gt",MXN:"mx",JPY:"jp",NPR:"np",OMR:"om",QAR:"qa",SGD:"sg",TZS:"tz",UGX:"ug",XAF:"cm",ZMW:"zm"};

class RouteError extends Error{status:number;constructor(message:string,status:number){super(message);this.status=status;}}
async function api<T>(path:string):Promise<T>{
  const response=await customerFetch(`/api/onboarding/money-routes${path}`,{headers:{Accept:"application/json"}});
  const value=response.status===204?null:await response.json().catch(()=>null);
  if(!response.ok)throw new RouteError(apiErrorMessage(value,"Your routes could not be loaded"),response.status);
  return value as T;
}

function assetLogo(code:string,size=32){return ROUTE_TOKENS.has(code)?<Image src={`/branding/tokens/${TOKEN_IMAGE[code]??code}.png`} alt={code.replace("_",".")} width={size} height={size}/>:<Image src={`/branding/crypto/${code.toLowerCase()}.svg`} alt={code} width={size} height={size}/>;}
function fiatLogo(code:string,size=34){return <span className="route-option-logo fiat"><CircleFlag countryCode={FIAT_FLAG[code]??"un"} height={String(size)}/></span>;}
function LaneLogos({lane,buy}:{lane:ReadyLane;buy:boolean}){
  const fiat=fiatLogo(lane.fiat,36);
  const crypto=<span className="route-option-logo">{assetLogo(lane.token,36)}</span>;
  return <span className="route-logo-pair" aria-hidden="true">{buy?<>{fiat}{crypto}</>:<>{crypto}{fiat}</>}</span>;
}

export function ReadyRoutes(){
  const [loading,setLoading]=useState(true);
  const [buy,setBuy]=useState<ReadyLane|null>(null);
  const [sell,setSell]=useState<ReadyLane|null>(null);
  useEffect(()=>{void (async()=>{
    const [preferences,fundingAccounts,bankAccounts,nativeDestinations,nativeFunding]=await Promise.all([
      api<ReadyPreference[]>("/preferences").catch(()=>[]),
      api<ReadyFunding[]>("/funding-accounts").catch(()=>[]),
      api<unknown>("/bank-accounts?size=100").then(value=>Array.isArray(value)?value as BankAccount[]:((value as {items?:BankAccount[]}|null)?.items??[])).catch(()=>[] as BankAccount[]),
      api<NativeDestination[]>("/native-destinations").catch(()=>[]),
      api<ReadyFunding|null>("/native-funding-account").catch(()=>null),
    ]);
    const preference=preferences[0]??null;
    const native=preference?.routeType==="NATIVE";
    const funding=native?nativeFunding:fundingAccounts.find(item=>item.currency===preference?.fiatCurrency)??fundingAccounts[0]??null;
    const selectedPayout=bankAccounts.find(item=>item.mainRecipient)??bankAccounts[0];
    const payout:ReadyPayout|null=native&&nativeDestinations[0]?{currency:"NGN",accountName:nativeDestinations[0].accountName,accountMask:nativeDestinations[0].maskedAccountNumber}:selectedPayout?{currency:selectedPayout.currency,accountName:selectedPayout.accountName,accountMask:selectedPayout.accountMask??undefined}:null;
    setBuy(buyLane(preference,funding));
    setSell(sellLane(preference,payout));
    setLoading(false);
  })();},[]);
  if(loading)return <div className="compliance-loading"><IconLoader2 className="spin"/>Loading your routes…</div>;
  return <div className="ready-routes">
    <p className="compliance-form-copy">Fund your pay-in account to buy. Send crypto back to sell into your payout account.</p>
    <div className="ready-lanes">
      {buy?<article className="ready-lane"><LaneLogos lane={buy} buy/><div><small>{buy.kicker}</small><h3>{buy.title}</h3><p>{buy.line}</p><span>{buy.from}</span><span>{buy.to}</span></div></article>:null}
      {sell?<article className="ready-lane"><LaneLogos lane={sell} buy={false}/><div><small>{sell.kicker}</small><h3>{sell.title}</h3><p>{sell.line}</p><span>{sell.from}</span><span>{sell.to}</span></div></article>:null}
    </div>
    <div className="compliance-form-actions"><Link className="compliance-primary" href="/dashboard">Open dashboard <IconArrowRight size={17}/></Link></div>
  </div>;
}
