"use client";

import {createClientId} from "@/lib/client-id";

import {FormEvent,useCallback,useEffect,useMemo,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {IconAlertTriangle,IconArrowLeft,IconArrowRight,IconLoader2} from "@tabler/icons-react";
import {useToast} from "@/components/ui/toast";
import {moneyRouteApi,sessionApi,sessionRequired,titleCase,bankAccountItems} from "@/lib/money-route-api";
import {BankForm,BankFormPayload,isDigitPayoutField,normalizeBankForm,normalizeFieldName,payoutFieldHint,payoutFieldKey,thirdPartyRecipientFields,visiblePayoutFields} from "./payout-form-schema";
import {COUNTRY_CURRENCY,FIAT_NAME,FIAT_RELEVANCE,Field,BankSelect,ChoiceSelect,RouteSelect,applySelectedBank,seedDetails,residenceAllowsCurrency,type SupportedBank} from "./money-route-controls";
import {RouteOtpGate,type RequireRouteSession} from "./route-otp-gate";
import {loadErrorMessage,withDeadline} from "./account-readiness";
import {useDashboardFinance} from "./dashboard-customer";
import type {DashboardCustomer} from "@/lib/dashboard-access";
import {isValidIban,normalizeIban} from "@/lib/iban";

type Coverage={fiatCurrencies:Array<{code:string;name:string}>;fundingCurrencies?:Array<{code:string;name:string}>;transferableAssets:Array<{code:string;type:string}>};
type Preference={fiatCurrency:string;token:string;network:string;routeType?:"NATIVE"|"COMPOSITE"|"STABLECOIN"};
type BankAccount={id:string;accountName:string;currency:string};
type DestinationCurrency={code:string;routeCount:number;preview:boolean;routes:string[]};

export function PayoutAccountEditor({customer}:{customer:DashboardCustomer}){
  const router=useRouter();
  const {canMutateFinances}=useDashboardFinance();
  const {show}=useToast();
  const error=useCallback((message:string)=>show({tone:"danger",title:"Check this step",message}),[show]);
  const success=useCallback((message:string)=>show({tone:"success",title:"Saved",message}),[show]);
  const payoutIdempotency=useRef(createClientId());
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState("");
  const [loadAttempt,setLoadAttempt]=useState(0);
  const [busy,setBusy]=useState(false);
  const [coverage,setCoverage]=useState<Coverage|null>(null);
  const [forms,setForms]=useState<BankForm[]>([]);
  const [destinationCurrencies,setDestinationCurrencies]=useState<DestinationCurrency[]>([]);
  const [payoutCurrency,setPayoutCurrency]=useState("");
  const [formId,setFormId]=useState("");
  const [accountName,setAccountName]=useState("");
  const [details,setDetails]=useState<Record<string,string|boolean>>({});
  const [recipientType,setRecipientType]=useState<"SELF"|"THIRD_PARTY">("SELF");
  const [mainRecipient,setMainRecipient]=useState(true);
  const [thirdPartyDetails,setThirdPartyDetails]=useState<Record<string,string>>({});
  const [supportedBanks,setSupportedBanks]=useState<SupportedBank[]>([]);
  const [banksLoading,setBanksLoading]=useState(false);
  const [banksError,setBanksError]=useState("");
  const [banksAttempt,setBanksAttempt]=useState(0);

  useEffect(()=>{let cancelled=false;void (async()=>{try{
    const preferences=await withDeadline(moneyRouteApi<Preference[]>("/preferences"));
    const saved=preferences[0];
    const nativePref=saved?.routeType==="NATIVE";
    // Native-pref users still need Bakkt catalogs for EUR/GBP banks; soften only when catalogs fail.
    const loadCatalog=<T,>(request:Promise<T>,fallback:T)=>withDeadline(request).catch(problem=>{if(nativePref)return fallback;throw problem;});
    const [loadedCoverage,bankFormPayloads,loadedDestinationCurrencies,existing]=await Promise.all([
      loadCatalog(sessionApi<Coverage|null>("/coverage?refresh=true"),null),
      loadCatalog(moneyRouteApi<BankFormPayload[]>("/bank-requirements"),[]),
      // Keep this optional catalog request resilient to older API clients/mocks
      // that can throw synchronously before returning a promise.
      withDeadline(Promise.resolve().then(()=>moneyRouteApi<DestinationCurrency[]>("/destination-currencies"))).catch(()=>[] as DestinationCurrency[]),
      loadCatalog(moneyRouteApi<unknown>("/bank-accounts?size=100").then(bankAccountItems<BankAccount>),[]),
    ]);
    if(cancelled)return;
    if(!nativePref&&!loadedCoverage)throw new Error("Payout options could not be loaded.");
    const bankForms=bankFormPayloads.map(normalizeBankForm).filter((item):item is BankForm=>item!==null);
    const home=COUNTRY_CURRENCY[customer.country.toUpperCase()];
    const available=new Set(bankForms.map(item=>item.currency));
    // Match mobile: prefer NGN when the saved route is native; otherwise home / first form.
    const nextCurrency=nativePref?"NGN":existing[0]?.currency||(home&&available.has(home)?home:bankForms[0]?.currency??(residenceAllowsCurrency(customer.country,"NGN")?"NGN":""));
    const matching=bankForms.find(item=>item.currency===nextCurrency)??null;
    setCoverage(loadedCoverage);
    setForms(bankForms);
    setDestinationCurrencies(loadedDestinationCurrencies);
    setPayoutCurrency(nextCurrency);
    setFormId(matching?.id??"");
    setAccountName(nextCurrency==="NGN"?`${customer.givenName} ${customer.familyName}`:`${nextCurrency} payout account`);
    setDetails(seedDetails(matching,nextCurrency));
    setMainRecipient(existing.length===0);
    setLoadError("");
  }catch(problem){if(!cancelled)setLoadError(loadErrorMessage(problem,"Payout options could not be loaded."));}
  finally{if(!cancelled)setLoading(false);}
  })();return()=>{cancelled=true;};},[customer.country,customer.familyName,customer.givenName,loadAttempt]);

  // Match mobile: native payout path is currency===NGN, not an exclusive routeType lock.
  const nativePayout=payoutCurrency==="NGN";

  const bankCurrencies=useMemo(()=>{
    const catalogCodes=new Set(destinationCurrencies.map(item=>item.code.toUpperCase()));
    const formCodes=forms.map(item=>item.currency);
    // The catalog is the currency-level source of truth. Keep a schema-derived
    // fallback for older API deployments that do not expose the new route yet.
    const international=formCodes.filter(code=>catalogCodes.size===0||catalogCodes.has(code));
    return Array.from(new Set([
      ...international,
      ...(residenceAllowsCurrency(customer.country,"NGN")?["NGN"]:[]),
    ])).filter(code=>residenceAllowsCurrency(customer.country,code));
  },[destinationCurrencies,forms,customer.country]);
  const fiatNames=new Map(coverage?.fiatCurrencies.map(item=>[item.code,item.name])??[]);
  const homeCurrency=COUNTRY_CURRENCY[customer.country.toUpperCase()];
  const payoutOptions=[...bankCurrencies].sort((a,b)=>(a===homeCurrency?-2:FIAT_RELEVANCE.get(a)??Number.MAX_SAFE_INTEGER)-(b===homeCurrency?-2:FIAT_RELEVANCE.get(b)??Number.MAX_SAFE_INTEGER)||a.localeCompare(b)).map(value=>{
    const catalog=destinationCurrencies.find(item=>item.code===value);
    const routeDetail=catalog?.routeCount===1?"One payout route":catalog?.routeCount?`${catalog.routeCount} payout routes`:"Payout account available";
    return {value,label:fiatNames.get(value)??FIAT_NAME[value]??value,detail:value===homeCurrency?`${routeDetail} · Your local currency`:routeDetail,kind:"fiat" as const};
  });
  const currencyForms=forms.filter(item=>item.currency===payoutCurrency);
  const nativeFallback:BankForm={currency:"NGN",id:"ngn-bank",title:"NGN bank account",route:"Bank account",preview:false,requiredFields:["account_number","bank_code"],optionalFields:[],accountDetailsSchema:{required:["account_number","bank_code"],properties:{account_number:{type:"string",description:"Your NGN account number."},bank_code:{type:"string",description:"The receiving bank code."}}}};
  const selectedForm=currencyForms.find(item=>item.id===formId)??currencyForms[0]??(nativePayout?nativeFallback:null);
  const payoutFields=visiblePayoutFields(selectedForm,supportedBanks.length);
  const recipientFields=thirdPartyRecipientFields(selectedForm);

  useEffect(()=>{
    if(!payoutCurrency){setSupportedBanks([]);setBanksError("");setBanksLoading(false);return;}
    const form=forms.find(item=>item.id===formId)??forms.find(item=>item.currency===payoutCurrency)??null;
    const properties=form?.accountDetailsSchema.properties??{};
    const needsBankList=Object.keys(properties).some(key=>{
      const name=normalizeFieldName(key);
      return name==="bankcode"||name==="bankname";
    });
    if(!needsBankList){setSupportedBanks([]);setBanksError("");setBanksLoading(false);return;}
    let cancelled=false;
    setBanksLoading(true);setBanksError("");setSupportedBanks([]);
    void withDeadline(moneyRouteApi<SupportedBank[]>(`/supported-banks?currency=${encodeURIComponent(payoutCurrency)}`))
      .then(items=>{if(!cancelled)setSupportedBanks(items);})
      .catch(problem=>{if(!cancelled)setBanksError(loadErrorMessage(problem,"The bank list could not be loaded."));})
      .finally(()=>{if(!cancelled)setBanksLoading(false);});
    return()=>{cancelled=true;};
  },[payoutCurrency,formId,forms,banksAttempt]);

  function choosePayoutCurrency(value:string){
    setPayoutCurrency(value);
    const next=forms.find(item=>item.currency===value)??null;
    setFormId(next?.id??"");
    setDetails(seedDetails(next,value));
    setThirdPartyDetails({});
    setRecipientType("SELF");
    setAccountName(value==="NGN"?`${customer.givenName} ${customer.familyName}`:`${value} payout account`);
  }

  function chooseForm(value:string){
    const next=forms.find(item=>item.id===value)??null;
    setFormId(value);
    setDetails(seedDetails(next,payoutCurrency));
    setThirdPartyDetails({});
  }

  async function saveBank(event:FormEvent,sessionActive:boolean,requireSession:RequireRouteSession){
    event.preventDefault();
    if(!selectedForm||!accountName.trim()){error(nativePayout?"Add the verified account holder name":"Choose a payout route and name this account");return;}
    const missing=(selectedForm.accountDetailsSchema.required??[]).filter(key=>key!=="currency"&&(details[key]===undefined||details[key]===""));
    if(missing.length){error(`Complete ${missing.map(titleCase).join(", ")}`);return;}
    const normalizedDetails={...details};
    for(const [key,value] of Object.entries(normalizedDetails)){
      if(normalizeFieldName(key)!=="iban"||typeof value!=="string"||!value)continue;
      if(!isValidIban(value)){error("Check your IBAN. Its length or check digits are invalid. Copy it from your bank; spaces are accepted.");return;}
      normalizedDetails[key]=normalizeIban(value);
    }
    if(recipientType==="THIRD_PARTY"){
      const missingRecipient=recipientFields.filter(field=>!thirdPartyDetails[field.key]?.trim());
      if(missingRecipient.length){error(`Complete ${missingRecipient.map(field=>field.label).join(", ")}`);return;}
    }
    if(!nativePayout&&!sessionActive&&!requireSession())return;
    setBusy(true);
    try{
      const created=nativePayout
        ? await moneyRouteApi<{id:string}>("/native-destinations",{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":payoutIdempotency.current},body:JSON.stringify({bankCode:String(details.bank_code??""),accountNumber:String(details.account_number??""),accountName:accountName.trim()})})
        : await moneyRouteApi<BankAccount>("/bank-accounts",{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":payoutIdempotency.current},body:JSON.stringify({accountName:accountName.trim(),currency:payoutCurrency,recipientType,mainRecipient,accountDetails:{...normalizedDetails,currency:payoutCurrency},thirdPartyDetails:recipientType==="THIRD_PARTY"?thirdPartyDetails:undefined})});
      payoutIdempotency.current=createClientId();
      success("Your payout account is ready.");
      const accountId=created?.id?.trim();
      router.push(accountId?`/dashboard/sell/${encodeURIComponent(accountId)}`:"/dashboard/sell");
      router.refresh();
    }catch(problem){
      if(sessionRequired(problem)){requireSession({expired:true});error(problem instanceof Error?problem.message:"Confirm this session to continue");return;}
      error(problem instanceof Error?problem.message:"The payout account could not be saved");
    }finally{
      setBusy(false);
    }
  }

  if(loading)return <div className="compliance-loading"><IconLoader2 className="spin"/>Loading payout options…</div>;
  if(!canMutateFinances)return <div className="compliance-form"><p className="compliance-form-copy">Company money routes are view-only for your role. Adding a payout account needs administrator financial access.</p><div className="compliance-form-actions"><Link className="compliance-secondary" href="/dashboard/sell">Back to Sell</Link></div></div>;
  if(loadError)return <div className="accounts-load-error" role="alert"><IconAlertTriangle size={22}/><div><strong>Payout options could not be loaded</strong><p>{loadError}</p></div><button type="button" className="compliance-primary" onClick={()=>{setLoading(true);setLoadAttempt(value=>value+1);}}>Try again</button></div>;
  if(!selectedForm)return <div className="compliance-form"><p className="compliance-form-copy">No payout currencies are available for your account right now.</p><div className="compliance-form-actions"><Link className="compliance-secondary" href="/dashboard/sell">Back to Sell</Link><button type="button" className="compliance-primary" onClick={()=>{setLoading(true);setLoadAttempt(value=>value+1);}}>Check again</button></div></div>;

  return <RouteOtpGate email={customer.email} nativeAllowed={nativePayout}>
    {(sessionActive,requireSession)=>
      <form className="compliance-form" onSubmit={event=>void saveBank(event,sessionActive,requireSession)} noValidate>
        <p className="compliance-form-copy">Add another bank account that can receive money when you sell crypto.</p>
        {banksLoading?<p role="status">Loading banks…</p>:banksError?<div className="accounts-load-error" role="alert"><div><strong>The bank list could not be loaded</strong><p>{banksError}</p></div><button type="button" className="compliance-secondary" onClick={()=>setBanksAttempt(value=>value+1)}>Retry banks</button></div>:null}
        <div className="compliance-form-grid">
          <RouteSelect label="Payout currency" value={payoutCurrency} options={payoutOptions} onChange={choosePayoutCurrency} placeholder="Choose a currency"/>
          {currencyForms.length>1&&!nativePayout?<Field label="Account format" hint={selectedForm?.route?`Settles over ${selectedForm.route}.`:undefined}><select value={selectedForm?.id??""} onChange={event=>chooseForm(event.target.value)}>{currencyForms.map(item=><option value={item.id} key={item.id}>{item.title}</option>)}</select></Field>:null}
          <Field label={nativePayout?"Account holder name":"Account name"} hint={nativePayout?"Use the verified name on this account.":"A private label that helps you identify this payout account."} wide={currencyForms.length>1&&!nativePayout}><input value={accountName} onChange={event=>setAccountName(event.target.value)} placeholder={nativePayout?`${customer.givenName} ${customer.familyName}`:`${payoutCurrency} payout account`}/></Field>
          {!nativePayout?<div className="compliance-field compliance-field-wide"><span>Who owns this bank account?</span><div className="recipient-type-options" role="radiogroup" aria-label="Who owns this bank account?"><label><input type="radio" name="payout-recipient-type" checked={recipientType==="SELF"} onChange={()=>{setRecipientType("SELF");setThirdPartyDetails({});}}/>My account</label><label><input type="radio" name="payout-recipient-type" checked={recipientType==="THIRD_PARTY"} disabled={!recipientFields.length} onChange={()=>setRecipientType("THIRD_PARTY")}/>Someone else</label></div>{!recipientFields.length?<small>Someone else is not available for this payout currency.</small>:null}</div>:null}
          {payoutFields.map(field=>{
            const label=field.label;
            const selectedBankValue=String(details[payoutFieldKey(selectedForm,"bank_code")??""]??details[payoutFieldKey(selectedForm,"bank_name")??""]??details[field.key]??"");
            return <Field label={label} hint={payoutFieldHint(field.key,field.rule,field.control)} key={field.key} wide={field.wide}>
              {field.control==="bank-select"?<BankSelect value={selectedBankValue} banks={supportedBanks} onChange={bank=>setDetails(current=>applySelectedBank(selectedForm,bank,current))}/>:field.control==="choice"?<ChoiceSelect label={label} value={String(details[field.key]??"")} options={field.rule.enum??[]} onChange={next=>setDetails(current=>({...current,[field.key]:field.rule.type==="boolean"?next==="true":next}))}/>:<input value={String(details[field.key]??"")} inputMode={isDigitPayoutField(field.key)?"numeric":"text"} maxLength={normalizeFieldName(field.key)==="iban"?undefined:field.rule.maxLength} onChange={event=>setDetails(current=>({...current,[field.key]:normalizeFieldName(field.key)==="iban"?event.target.value.toUpperCase():event.target.value}))} placeholder={typeof field.rule.example==="string"?field.rule.example:""}/>}
            </Field>;
          })}
          {recipientType==="THIRD_PARTY"?recipientFields.map(field=><Field label={field.label} hint={payoutFieldHint(field.key,field.rule,field.control)} key={field.key} wide={field.wide}>{field.control==="choice"?<ChoiceSelect label={field.label} value={thirdPartyDetails[field.key]??""} options={field.rule.enum??[]} onChange={next=>setThirdPartyDetails(current=>({...current,[field.key]:next}))}/>:<input value={thirdPartyDetails[field.key]??""} onChange={event=>setThirdPartyDetails(current=>({...current,[field.key]:event.target.value}))} placeholder={typeof field.rule.example==="string"?field.rule.example:""}/>}</Field>):null}
          {!nativePayout?<label className="payout-primary-choice compliance-field-wide"><input type="checkbox" checked={mainRecipient} onChange={event=>setMainRecipient(event.target.checked)}/>Use as my primary payout account</label>:null}
        </div>
        <div className="compliance-form-actions">
          <Link className="compliance-secondary" href="/dashboard/sell"><IconArrowLeft size={17}/> Back</Link>
          <button className="compliance-primary" type="submit" disabled={busy||!selectedForm}>{busy?<IconLoader2 className="spin" size={17}/>:null}Save payout account <IconArrowRight size={17}/></button>
        </div>
      </form>
    }
  </RouteOtpGate>;
}
