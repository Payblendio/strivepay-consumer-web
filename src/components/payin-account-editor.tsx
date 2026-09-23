"use client";

import {createClientId} from "@/lib/client-id";

import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {IconAlertTriangle,IconArrowRight,IconLoader2} from "@tabler/icons-react";
import {useToast} from "@/components/ui/toast";
import {moneyRouteApi,sessionApi,sessionRequired} from "@/lib/money-route-api";
import {COUNTRY_CURRENCY,FIAT_NAME,RouteSelect,residenceAllowsCurrency} from "./money-route-controls";
import {RouteOtpGate,type RequireRouteSession} from "./route-otp-gate";
import {loadErrorMessage,withDeadline} from "./account-readiness";
import {useDashboardFinance} from "./dashboard-customer";
import type {DashboardCustomer} from "@/lib/dashboard-access";
import type {ReadyPreference} from "./ready-route-copy";

type Coverage={fundingCurrencies?:Array<{code:string;name:string}>;fiatCurrencies?:Array<{code:string;name:string}>};
type FundingAccount={id:string;currency?:string;status:string;accountNumber?:string|null;accountMask?:string|null;bankName?:string|null;accountName?:string|null};

function hasDetails(account:FundingAccount){
  return Boolean(account.accountNumber||account.accountMask||account.bankName||account.accountName);
}

export function PayInAccountEditor({customer}:{customer:DashboardCustomer}){
  const router=useRouter();
  const {canMutateFinances}=useDashboardFinance();
  const {show}=useToast();
  const error=useCallback((message:string)=>show({tone:"danger",title:"Check this step",message}),[show]);
  const success=useCallback((message:string)=>show({tone:"success",title:"Saved",message}),[show]);
  const idempotency=useRef(createClientId());
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState("");
  const [loadAttempt,setLoadAttempt]=useState(0);
  const [allCurrenciesOwned,setAllCurrenciesOwned]=useState(false);
  const [busy,setBusy]=useState(false);
  const [currency,setCurrency]=useState("");
  const [options,setOptions]=useState<Array<{value:string;label:string;detail:string;kind:"fiat"}>>([]);
  const [identityType,setIdentityType]=useState<"BVN"|"NIN">("BVN");
  const [identityNumber,setIdentityNumber]=useState("");
  const [identityPrefill,setIdentityPrefill]=useState<{type:string;last4:string;verified?:boolean}|null>(null);
  const [changeIdentity,setChangeIdentity]=useState(false);
  const [identitySessionId,setIdentitySessionId]=useState<string|null>(null);
  const [identityOtp,setIdentityOtp]=useState("");
  const [identityMasked,setIdentityMasked]=useState("");
  const [identityHint,setIdentityHint]=useState("");
  const usResident=customer.country.toUpperCase()==="US";

  useEffect(()=>{let cancelled=false;void (async()=>{try{
    const [coverage,preferences,accounts]=await withDeadline(Promise.all([
      sessionApi<Coverage>("/coverage"),
      moneyRouteApi<ReadyPreference[]>("/preferences"),
      moneyRouteApi<FundingAccount[]>("/funding-accounts"),
    ]));
    if(!coverage)throw new Error("Pay-in currencies could not be loaded.");
    const saved=preferences[0]??null;
    const owned=new Set(accounts.map(item=>(item.currency||"").toUpperCase()).filter(Boolean));
    const native=await withDeadline(moneyRouteApi<FundingAccount|null>("/native-funding-account").catch(()=>null));
    if(native)owned.add("NGN");
    if(cancelled)return;
    const names=new Map((coverage?.fiatCurrencies??[]).map(item=>[item.code,item.name]));
    const fundingCodes=new Set((coverage?.fundingCurrencies??[]).map(item=>item.code.toUpperCase()));
    // Match mobile payout catalogs: always surface NGN for eligible residence even if Bakkt coverage omits it.
    if(residenceAllowsCurrency(customer.country,"NGN"))fundingCodes.add("NGN");
    const available=[...fundingCodes]
      .filter(code=>residenceAllowsCurrency(customer.country,code)&&!owned.has(code.toUpperCase()))
      .map(code=>({value:code,label:names.get(code)??FIAT_NAME[code]??code,detail:code==="USD"?"Reusable US deposit account":code==="NGN"?"Local NGN pay-in account":"No pay-in account yet",kind:"fiat" as const}));
    setOptions(available);
    setAllCurrenciesOwned(fundingCodes.size>0&&available.length===0);
    const home=COUNTRY_CURRENCY[customer.country.toUpperCase()];
    setCurrency(available.find(item=>item.value===(saved?.fiatCurrency||home))?.value??available[0]?.value??"");
    setLoadError("");
  }catch(problem){if(!cancelled)setLoadError(loadErrorMessage(problem,"Pay-in currencies could not be loaded."));}
  finally{if(!cancelled)setLoading(false);}
  })();return()=>{cancelled=true;};},[customer.country,loadAttempt]);

  const native=useMemo(()=>currency==="NGN",[currency]);

  useEffect(()=>{if(!native)return;let cancelled=false;void moneyRouteApi<{type:string;last4:string;verified?:boolean}|null>("/native-funding-account/identity").then(value=>{if(cancelled||!value)return;setIdentityPrefill({type:value.type,last4:value.last4,verified:Boolean(value.verified)});setIdentityType((value.type as "BVN"|"NIN")||"BVN");}).catch(()=>{});return()=>{cancelled=true;};},[native]);

  async function requestAccount(sessionActive:boolean,requireSession:RequireRouteSession){
    if(!currency){error("Choose a currency");return;}
    if(!residenceAllowsCurrency(customer.country,currency)){error("That currency is not available for your residence");return;}
    if(!native&&!sessionActive&&!requireSession())return;
    setBusy(true);
    try{
      if(native){
        if(!identitySessionId){
          try{
            const account=await moneyRouteApi<FundingAccount>("/native-funding-account",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({})});
            success(hasDetails(account)?`${currency} pay-in is ready.`:`${currency} pay-in requested.`);
            router.push("/dashboard/buy");
            router.refresh();
            return;
          }catch{
            // No reusable VA yet — continue to a fresh OTP challenge.
          }
          const needNumber=changeIdentity||!identityPrefill;
          if(needNumber&&identityNumber.replace(/\D/g,"").length!==11){error(`Enter a valid 11-digit ${identityType}`);return;}
          const session=await moneyRouteApi<{sessionId:string|null;maskedNumber:string;type:string;otpRequired?:boolean;message?:string}>("/native-funding-account/identity",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:identityType,number:needNumber?identityNumber:undefined})});
          if(session.otpRequired===false||!session.sessionId){
            const account=await moneyRouteApi<FundingAccount>("/native-funding-account",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({})});
            success(hasDetails(account)?`${currency} pay-in is ready.`:`${currency} pay-in requested.`);
            router.push("/dashboard/buy");
            router.refresh();
            return;
          }
          const hint=session.message?.trim()||"Enter the OTP sent for identity verification.";
          setIdentitySessionId(session.sessionId);setIdentityMasked(session.maskedNumber);setIdentityHint(hint);success(hint);return;
        }
        if(!/^\d{4,8}$/.test(identityOtp)){error("Enter the OTP from your bank SMS");return;}
        const account=await moneyRouteApi<FundingAccount>("/native-funding-account",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({identitySessionId,otp:identityOtp})});
        success(hasDetails(account)?`${currency} pay-in is ready.`:`${currency} pay-in requested.`);
        router.push("/dashboard/buy");
        router.refresh();
        return;
      }
      const account=await moneyRouteApi<FundingAccount>("/funding-accounts",{
        method:"POST",
        headers:{"Content-Type":"application/json","Idempotency-Key":idempotency.current},
        body:JSON.stringify({currency}),
      });
      idempotency.current=createClientId();
      success(hasDetails(account)?`${currency} pay-in is ready.`:`${currency} pay-in requested.`);
      router.push("/dashboard/buy");
      router.refresh();
    }catch(problem){
      if(sessionRequired(problem)){requireSession({expired:true});error(problem instanceof Error?problem.message:"Confirm this session to continue");return;}
      error(problem instanceof Error?problem.message:"The pay-in account could not be requested");
    }finally{
      setBusy(false);
    }
  }

  if(loading)return <div className="compliance-loading"><IconLoader2 className="spin"/>Loading currencies…</div>;
  if(!canMutateFinances)return <div className="compliance-form"><p className="compliance-form-copy">Company money routes are view-only for your role. Requesting a pay-in account needs administrator financial access.</p><div className="compliance-form-actions"><Link className="compliance-primary" href="/dashboard/buy">Back to Buy <IconArrowRight size={17}/></Link></div></div>;
  if(loadError)return <div className="accounts-load-error" role="alert"><IconAlertTriangle size={22}/><div><strong>Pay-in currencies could not be loaded</strong><p>{loadError}</p></div><button type="button" className="compliance-primary" onClick={()=>{setLoading(true);setLoadAttempt(value=>value+1);}}>Try again</button></div>;

  if(options.length===0){
    return <div className="compliance-form">
      <p className="compliance-form-copy">{allCurrenciesOwned?"You already have a pay-in account for every available currency.":"No pay-in currencies are available for your account right now."}</p>
      <div className="compliance-form-actions">
        {!allCurrenciesOwned?<button type="button" className="compliance-secondary" onClick={()=>{setLoading(true);setLoadAttempt(value=>value+1);}}>Check again</button>:null}
        <Link className="compliance-primary" href="/dashboard/buy">Back to Buy <IconArrowRight size={17}/></Link>
      </div>
    </div>;
  }

  return <RouteOtpGate email={customer.email} nativeAllowed={native} deferUnlock>
    {(sessionActive,requireSession)=>
      <form className="compliance-form" onSubmit={event=>{event.preventDefault();void requestAccount(sessionActive,requireSession);}} noValidate>
        {usResident?<div className="payin-setup-guide" role="note">
          <strong>How USD pay-in works</strong>
          <ol>
            <li>Request a reusable USD deposit account below.</li>
            <li>On Buy, copy the account and routing details.</li>
            <li>Send USD from your US bank to that account, then buy crypto.</li>
          </ol>
          <p>Want StrivePay to pull from your bank instead? After this account exists, open <Link href="/dashboard/accounts">Accounts → Linked bank (Plaid)</Link> and submit an ACH pull.</p>
        </div>:null}
        <div className="compliance-form-grid">
          <RouteSelect label="Currency" value={currency} options={options} onChange={setCurrency} placeholder="Choose a currency"/>
        </div>
        {currency==="USD"?<p className="compliance-form-copy">You will get StrivePay USD bank details to fund buys. Linking Plaid is optional and happens on Accounts.</p>:null}
        {currency==="NGN"?<p className="compliance-form-copy">Nigeria residents get an NGN pay-in account for local funding.</p>:null}
        {native?<div className="compliance-form-grid">
          {!identitySessionId?<>
            <label className="compliance-field"><span>ID type</span><select value={identityType} onChange={event=>{setIdentityType(event.target.value as "BVN"|"NIN");setChangeIdentity(true);}}><option value="BVN">BVN</option><option value="NIN">NIN</option></select></label>
            {identityPrefill&&!changeIdentity?<label className="compliance-field compliance-field-wide"><span>Saved {identityPrefill.type}</span><input value={`•••• ${identityPrefill.last4}`} readOnly/><button className="compliance-link-button" type="button" onClick={()=>setChangeIdentity(true)}>Change number</button></label>:<label className="compliance-field compliance-field-wide"><span>{identityType} number</span><input inputMode="numeric" autoComplete="off" maxLength={11} value={identityNumber} onChange={event=>setIdentityNumber(event.target.value.replace(/\D/g,""))}/></label>}
          </>:<label className="compliance-field compliance-field-wide"><span>OTP for {identityMasked||identityType}</span><input inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={identityOtp} onChange={event=>setIdentityOtp(event.target.value.replace(/\D/g,""))}/>{identityHint?<small>{identityHint}</small>:null}</label>}
        </div>:null}
        <div className="compliance-form-actions">
          <Link className="compliance-secondary" href="/dashboard/buy">Cancel</Link>
          <button className="compliance-primary" type="submit" disabled={busy||!currency}>
            {busy?<IconLoader2 className="spin" size={17}/>:null}{native?(identitySessionId?"Confirm OTP":"Send OTP"):`Request ${currency||"account"}`} <IconArrowRight size={17}/>
          </button>
        </div>
      </form>
    }
  </RouteOtpGate>;
}
