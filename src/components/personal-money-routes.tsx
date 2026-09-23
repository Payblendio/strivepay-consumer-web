"use client";

import {createClientId} from "@/lib/client-id";

import Image from "next/image";
import {FormEvent,useCallback,useEffect,useMemo,useRef,useState} from "react";
import {CircleFlag} from "react-circle-flags";
import {
  IconArrowLeft,IconArrowRight,IconBuildingBank,IconCheck,IconChevronDown,IconCoins,IconCopy,
  IconLoader2,IconLock,IconMail,IconSearch,IconShieldCheck,IconWallet,
} from "@tabler/icons-react";
import {Modal} from "@/components/ui/modal";
import {useToast} from "@/components/ui/toast";
import {customerFetch,setCustomerFetchAccountScope} from "@/lib/customer-session";
import {apiErrorMessage} from "@/lib/api-error";
import {RouteError,sessionRequired,bankAccountItems,walletAddressValid} from "@/lib/money-route-api";
import type {AccountScope} from "@/lib/account-scope";
import {BankForm,BankFormPayload,isDigitPayoutField,normalizeBankForm,normalizeFieldName,payoutFieldHint,payoutFieldKey,thirdPartyRecipientFields,visiblePayoutFields} from "./payout-form-schema";

type Customer={givenName:string;familyName:string;email:string;country:string;phoneE164?:string|null};
type Network={code:string;name:string};
type Asset={code:string;name:string;type:string;networks:Network[]};
type Coverage={fiatCurrencies:Array<{code:string;name:string}>;fundingCurrencies?:Array<{code:string;name:string}>;transferableAssets:Asset[]};
type Preference={fiatCurrency:string;token:string;network:string;routeType?:"NATIVE"|"COMPOSITE"|"STABLECOIN";address?:string|null;addressType?:string|null;vasp?:string|null};
type BankAccount={id:string;accountName:string;currency:string;status:string;mainRecipient:boolean;accountMask?:string|null};
type FundingAccount={id:string;currency?:string;status:string;accountName?:string|null;accountMask?:string|null;routingMask?:string|null;routingNumber?:string|null;accountNumber?:string|null;bankCode?:string|null;bankName?:string|null};
type NativeDestination={id:string;bankDestinationId:string;bankCode:string;maskedAccountNumber:string;accountName:string;status:string;depositAddress?:string|null};
type SupportedBank={name:string;code?:string|null;accountType?:string|null;logoUrl?:string|null};
type DestinationCurrency={code:string;routeCount:number;preview:boolean;routes:string[]};
type RouteStep={title:string;detail:string;icon:React.ReactNode};
type SelectOption={value:string;label:string;detail:string;kind:"fiat"|"crypto"|"network"};
type SessionState="checking"|"active"|"missing"|"unavailable";
type ProfileState="checking"|"ready"|"unavailable";

const ROUTE_TOKENS=new Set(["USDC","USDC_E","USDT","CEUR","CUSD","AGEUR","EURC"]);
const ASSET_RELEVANCE=new Map(["BTC","ETH","USDC","USDT","EURC","SOL","XRP","BNB","ADA","DOGE","MATIC","LTC","BCH","TRX","LINK","DOT","XLM","AAVE","SHIB","CAKE","FIL","USDC_E","CEUR","AGEUR","CUSD","DASH","XTZ","ONE","AXS","FLOKI","BABYDOGE","QDX"].map((code,index)=>[code,index]));
const TARGET_NETWORKS=new Set(["ETHEREUM","POLYGON","OPTIMISM","ARBITRUM","BASE","BSC","AVALANCHE","CELO","SOLANA"]);
const COUNTRY_CURRENCY:Record<string,string>={US:"USD",GB:"GBP",NG:"NGN",TR:"TRY",IN:"INR",PK:"PKR",BR:"BRL",AR:"ARS",ID:"IDR",KE:"KES",PH:"PHP",AE:"AED",VN:"VND",GH:"GHS",MX:"MXN",JP:"JPY",OM:"OMR",QA:"QAR",IT:"EUR",DE:"EUR",FR:"EUR",ES:"EUR",PT:"EUR",NL:"EUR",BE:"EUR",IE:"EUR",AT:"EUR",FI:"EUR",GR:"EUR",CY:"EUR",EE:"EUR",HR:"EUR",LT:"EUR",LU:"EUR",LV:"EUR",MT:"EUR",SI:"EUR",SK:"EUR"};
function residenceAllowsCurrency(country:string|null|undefined,currency:string|null|undefined){
  const residence=(country??"").trim().toUpperCase();
  const code=(currency??"").trim().toUpperCase();
  if(code==="USD")return residence==="US";
  if(code==="NGN")return residence==="NG";
  return Boolean(code);
}
const FIAT_NAME:Record<string,string>={AED:"UAE Dirham",ARS:"Argentine Peso",BRL:"Brazilian Real",CAD:"Canadian Dollar",COP:"Colombian Peso",EUR:"Euro",GBP:"British Pound",GHS:"Ghanaian Cedi",GTQ:"Guatemalan Quetzal",IDR:"Indonesian Rupiah",INR:"Indian Rupee",JPY:"Japanese Yen",KES:"Kenyan Shilling",MXN:"Mexican Peso",NGN:"Nigerian Naira",NPR:"Nepalese Rupee",OMR:"Omani Rial",PHP:"Philippine Peso",PKR:"Pakistani Rupee",QAR:"Qatari Riyal",SGD:"Singapore Dollar",TRY:"Turkish Lira",TZS:"Tanzanian Shilling",UGX:"Ugandan Shilling",USD:"US Dollar",VND:"Vietnamese Dong",XAF:"Central African CFA Franc",ZMW:"Zambian Kwacha"};
const FIAT_RELEVANCE=new Map(["EUR","GBP","USD","CAD","AED","NGN","SGD","JPY","INR","BRL","MXN","TRY","GHS","KES","ZMW","UGX","TZS","XAF","ARS","COP","IDR","PHP","PKR","VND","OMR","QAR","NPR","GTQ"].map((code,index)=>[code,index]));
const FIAT_FLAG:Record<string,string>={USD:"us",EUR:"eu",GBP:"gb",NGN:"ng",AED:"ae",TRY:"tr",INR:"in",PKR:"pk",BRL:"br",ARS:"ar",CAD:"ca",COP:"co",IDR:"id",KES:"ke",PHP:"ph",VND:"vn",GHS:"gh",GTQ:"gt",MXN:"mx",JPY:"jp",NPR:"np",OMR:"om",QAR:"qa",SGD:"sg",TZS:"tz",UGX:"ug",XAF:"cm",ZMW:"zm"};
const TOKEN_IMAGE:Record<string,string>={USDC:"USDC",USDC_E:"USDCE",USDT:"USDT",CEUR:"CEUR",CUSD:"CUSD",AGEUR:"AGEUR",EURC:"EURC"};
const NETWORK_IMAGE:Record<string,string>={ETHEREUM:"ETHEREUM",POLYGON:"POLYGON",OPTIMISM:"OP_MAINNET",ARBITRUM:"ARBITRUM",BASE:"BASE",BSC:"BNB_SMART_CHAIN",AVALANCHE:"AVALANCHE",CELO:"CELO",SOLANA:"SOLANA",TRON:"TRON"};
const PENDING_FUNDING_STATUSES=new Set(["WAITING_CREATION","CREATED","PENDING","PROCESSING"]);

async function api<T>(path:string,init:RequestInit={}):Promise<T>{
  const response=await customerFetch(`/api/onboarding/money-routes${path}`,{...init,headers:{Accept:"application/json",...init.headers}});
  const value=response.status===204?null:await response.json().catch(()=>null);
  if(!response.ok)throw new RouteError(apiErrorMessage(value,"That setup step could not be completed"),response.status,typeof value==="object"&&value&&"type" in value?String((value as {type?:string}).type):undefined);
  return value as T;
}

async function sessionApi<T>(path:string,init:RequestInit={}):Promise<T>{
  const response=await customerFetch(`/api/onboarding${path}`,{...init,headers:{Accept:"application/json",...init.headers}});
  const value=response.status===204?null:await response.json().catch(()=>null);
  if(!response.ok)throw new RouteError(apiErrorMessage(value,"The secure session could not continue"),response.status,typeof value==="object"&&value&&"type" in value?String((value as {type?:string}).type):undefined);
  return value as T;
}

function Field({label,hint,children,wide=false}:{label:string;hint?:string;children:React.ReactNode;wide?:boolean}){return <label className={`compliance-field${wide?" compliance-field-wide":""}`}><span>{label}</span>{children}{hint?<small>{hint}</small>:null}</label>;}
function title(value:string){return value.replace(/([a-z0-9])([A-Z])/g,"$1 $2").replaceAll("_"," ").replace(/\b\w/g,letter=>letter.toUpperCase());}
function ChoiceSelect({value,onChange,label,options}:{value:string;onChange:(value:string)=>void;label:string;options:Array<string|boolean>}){
  const [open,setOpen]=useState(false);
  const selected=options.find(item=>String(item)===value);
  return <><button className="compliance-route-select-trigger compact-choice-trigger" type="button" onClick={()=>setOpen(true)}><span>{selected?<strong>{title(String(selected))}</strong>:<span className="placeholder">Choose {label.toLowerCase()}</span>}</span><IconChevronDown size={17}/></button><Modal open={open} onClose={()=>setOpen(false)} title={label} description={`Choose ${label.toLowerCase()}.`} className="compliance-selector-dialog"><div className="choice-option-list">{options.map(item=>{const key=String(item);return <button type="button" className={key===value?"selected":""} key={key} onClick={()=>{onChange(key);setOpen(false);}}>{title(key)}{key===value?<IconCheck size={16}/>:null}</button>;})}</div></Modal></>;
}
function seedDetails(form:BankForm|null,currency:string){const values:Record<string,string|boolean>={currency};for(const [key,rule] of Object.entries(form?.accountDetailsSchema.properties??{})){if(key==="currency"||key==="third_party_details")continue;if(rule.enum?.length===1)values[key]=rule.enum[0];}return values;}
function assetLogo(code:string,size=32){return ROUTE_TOKENS.has(code)?<Image src={`/branding/tokens/${TOKEN_IMAGE[code]??code}.png`} alt={code.replace("_",".")} width={size} height={size}/>:<Image src={`/branding/crypto/${code.toLowerCase()}.svg`} alt={code} width={size} height={size}/>;}
function networkLogo(code:string,size=32){const file=NETWORK_IMAGE[code];if(file)return <Image src={`/branding/networks/${file}.png`} alt={title(code)} width={size} height={size}/>;const native:{[k:string]:string}={BITCOIN:"btc",LITECOIN:"ltc",DOGE:"doge",DASH:"dash",RIPPLE:"xrp",BITCOIN_CASH:"bch",CARDANO:"ada",STELLAR:"xlm"};const crypto=native[code];if(crypto)return <Image src={`/branding/crypto/${crypto}.svg`} alt={title(code)} width={size} height={size}/>;return <Image src={`/branding/crypto/${code.toLowerCase()}.svg`} alt={title(code)} width={size} height={size}/>;}
function networkRail(code:string){const rails:{[k:string]:string}={ETHEREUM:"ERC20",TRON:"TRC20",BSC:"BEP20",POLYGON:"Polygon",SOLANA:"SPL",ARBITRUM:"Arbitrum One",OPTIMISM:"OP Mainnet",BASE:"Base",AVALANCHE:"Avalanche C-Chain",CELO:"Celo"};return rails[code]??title(code);}
function optionLogo(option:SelectOption,size=34){return option.kind==="fiat"?<span className="route-option-logo fiat"><CircleFlag countryCode={FIAT_FLAG[option.value]??"un"} height={String(size)}/></span>:<span className="route-option-logo">{option.kind==="network"?networkLogo(option.value,size):assetLogo(option.value,size)}</span>;}
function fiatLogo(code:string,size=34){return <span className="route-option-logo fiat"><CircleFlag countryCode={FIAT_FLAG[code]??"un"} height={String(size)}/></span>;}
function routeLogoPair(fiat:string,token:string,size=40){return <><span className="route-logo-pair-fiat">{fiatLogo(fiat,size)}</span><span className="route-logo-pair-crypto">{assetLogo(token,size)}</span></>;}
function fundingHasDetails(account:FundingAccount){return Boolean(account.accountNumber||account.accountMask||account.bankCode||account.routingMask||account.routingNumber);}
function fundingNeedsRefresh(account:FundingAccount|null){if(!account||fundingHasDetails(account))return false;return PENDING_FUNDING_STATUSES.has(account.status.toUpperCase());}
function nextMoneyStep(saved:Preference|undefined,funding:FundingAccount|null,payoutCount:number){if(!saved)return 1;if(!funding)return 2;if(!payoutCount)return 3;return 4;}
function fundingDetailRows(account:FundingAccount,currency:string){const rows:Array<{key:string;label:string;value:string;copyable?:boolean}>=[];if(account.accountNumber)rows.push({key:"accountNumber",label:"Account number",value:account.accountNumber,copyable:true});if(account.accountMask)rows.push({key:"accountMask",label:account.accountNumber?"Account":"IBAN / Account",value:account.accountMask,copyable:true});const routing=account.routingNumber||account.routingMask;if(routing)rows.push({key:"routing",label:/^[A-Z]{4}[A-Z]{2}/.test(routing.replace(/\s+/g,"").toUpperCase())?"SWIFT / BIC":"Sort code / Routing",value:routing,copyable:true});if(account.bankCode)rows.push({key:"bankCode",label:"Bank code",value:account.bankCode,copyable:true});if(account.bankName)rows.push({key:"bankName",label:"Bank",value:account.bankName});rows.push({key:"currency",label:"Currency",value:account.currency??currency});return rows;}
async function fetchFundingAccount(nativeRoute:boolean,currency:string,refresh=false){if(nativeRoute)return api<FundingAccount|null>("/native-funding-account").catch(()=>null);const accounts=await api<FundingAccount[]>(`/funding-accounts${refresh?"?refresh=true":""}`).catch(()=>[]);return accounts.find(item=>item.currency===currency)??null;}

function RouteSelect({label,value,options,onChange,placeholder,disabled=false}:{label:string;value:string;options:SelectOption[];onChange:(value:string)=>void;placeholder:string;disabled?:boolean}){
  const [open,setOpen]=useState(false),[query,setQuery]=useState("");const selected=options.find(item=>item.value===value);
  const visible=useMemo(()=>{const needle=query.trim().toLowerCase();if(!needle)return options;const rank=(item:SelectOption)=>item.value.toLowerCase()===needle?0:item.value.toLowerCase().startsWith(needle)?1:item.label.toLowerCase().startsWith(needle)?2:3;return options.filter(item=>`${item.value} ${item.label} ${item.detail}`.toLowerCase().includes(needle)).map((item,index)=>({item,index})).sort((a,b)=>rank(a.item)-rank(b.item)||a.index-b.index).map(({item})=>item);},[options,query]);
  return <div className="compliance-field"><span>{label}</span><button className="compliance-route-select-trigger" type="button" disabled={disabled} onClick={()=>setOpen(true)}>{selected?<>{optionLogo(selected)}<span><strong>{selected.value}</strong><small>{selected.label}</small></span></>:<span className="placeholder">{placeholder}</span>}<IconChevronDown size={17}/></button><Modal open={open} onClose={()=>setOpen(false)} title={label} description="Choose the route you want to configure." size="large" className="compliance-selector-dialog route-selector-dialog"><label className="country-search"><IconSearch size={18}/><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} placeholder={`Search ${label.toLowerCase()}`}/></label><div className="compliance-selector-summary"><span>Available routes</span><strong>{visible.length}</strong></div><div className="route-option-grid">{visible.map(item=><button type="button" className={item.value===value?"selected":""} key={item.value} onClick={()=>{onChange(item.value);setOpen(false);setQuery("")}}>{optionLogo(item,38)}<span><strong>{item.value} · {item.label}</strong><small>{item.detail}</small></span>{item.value===value?<IconCheck size={18}/>:null}</button>)}</div></Modal></div>;
}

function applySelectedBank(form:BankForm|null,bank:SupportedBank,current:Record<string,string|boolean>){
  const bankCodeKey=payoutFieldKey(form,"bank_code"),bankNameKey=payoutFieldKey(form,"bank_name"),accountTypeKey=payoutFieldKey(form,"bank_account_type");
  return {...current,...(bankCodeKey?{[bankCodeKey]:bank.code??""}:{}),...(bankNameKey?{[bankNameKey]:bank.name}:{}),...(accountTypeKey&&bank.accountType?{[accountTypeKey]:bank.accountType}:{})};
}

function bankLogo(bank?:SupportedBank|null){return bank?.logoUrl?<img className="bank-option-logo-image" src={bank.logoUrl} alt="" width={19} height={19} loading="lazy" referrerPolicy="no-referrer"/>:<IconBuildingBank size={19}/>;}
function BankSelect({value,banks,onChange}:{value:string;banks:SupportedBank[];onChange:(bank:SupportedBank)=>void}){
  const [open,setOpen]=useState(false),[query,setQuery]=useState("");
  const selected=banks.find(bank=>bank.code===value||bank.name===value);
  const visible=useMemo(()=>{const needle=query.trim().toLowerCase();if(!needle)return banks;return banks.filter(bank=>`${bank.name} ${bank.code??""} ${bank.accountType??""}`.toLowerCase().includes(needle));},[banks,query]);
  return <><button className="compliance-route-select-trigger bank-select-trigger" type="button" onClick={()=>setOpen(true)}><span className="bank-option-logo">{bankLogo(selected)}</span>{selected?<span><strong>{selected.name}</strong><small>{[selected.code,selected.accountType].filter(Boolean).join(" · ")||"Supported bank"}</small></span>:<span className="placeholder">Choose a supported bank</span>}<IconChevronDown size={17}/></button><Modal open={open} onClose={()=>{setOpen(false);setQuery("")}} title="Choose your bank" description="Search the banks available for this payout currency." size="large" className="compliance-selector-dialog route-selector-dialog"><label className="country-search"><IconSearch size={18}/><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search bank name or code"/></label><div className="compliance-selector-summary"><span>Supported banks</span><strong>{visible.length}</strong></div><div className="route-option-grid bank-option-grid">{visible.map(bank=>{const selectedBank=bank.code===value||bank.name===value;return <button type="button" className={selectedBank?"selected":""} key={`${bank.code??""}-${bank.name}`} onClick={()=>{onChange(bank);setOpen(false);setQuery("")}}><span className="bank-option-logo">{bankLogo(bank)}</span><span><strong>{bank.name}</strong><small>{[bank.code,bank.accountType].filter(Boolean).join(" · ")||"Available for payout"}</small></span>{selectedBank?<IconCheck size={18}/>:null}</button>;})}</div>{visible.length===0?<p className="bank-search-empty">No supported bank matches your search.</p>:null}</Modal></>;
}

const routeSteps:RouteStep[]=[
  {title:"Secure setup",detail:"Confirm this session.",icon:<IconLock size={18}/>},
  {title:"Crypto route",detail:"Asset, network and wallet.",icon:<IconCoins size={18}/>},
  {title:"Pay-in account",detail:"Where bank funds arrive.",icon:<IconBuildingBank size={18}/>},
  {title:"Payout account",detail:"Where sales settle.",icon:<IconWallet size={18}/>},
];

function RouteBody({active,titleText,status,children,secureRequired=false,eyebrow="MONEY ROUTES"}:{active:number;titleText:string;status?:string;children:React.ReactNode;secureRequired?:boolean;eyebrow?:string}){const offset=secureRequired?0:1,steps=routeSteps.slice(offset),visibleActive=Math.max(0,active-offset);return <div className="compliance-window-body compliance-journey-body"><section className="compliance-form-panel"><header className="compliance-form-heading"><div><span>{eyebrow} / STEP {String(Math.min(visibleActive+1,steps.length)).padStart(2,"0")}</span><h2>{titleText}</h2></div>{status?<p><i className={visibleActive>=steps.length?"complete":""}/>{status}</p>:null}</header>{children}</section><aside className="compliance-journey-steps" aria-label="Money route setup progress"><ol>{steps.map((step,index)=>{const journeyIndex=index+offset;return <li className={journeyIndex<active?"done":journeyIndex===active?"current":""} key={step.title}><span className="compliance-journey-step-icon">{journeyIndex<active?<IconCheck size={16}/>:step.icon}</span><div><small>{String(index+1).padStart(2,"0")}</small><strong>{step.title}</strong><p>{step.detail}</p></div></li>;})}</ol></aside></div>;}

export function PersonalMoneyRoutes({customer,onComplete,accountScope="PERSONAL",readOnly=false,titleEyebrow}:{customer:Customer;onComplete:()=>void;accountScope?:AccountScope;readOnly?:boolean;titleEyebrow?:string}){
  const routeEyebrow=titleEyebrow??"MONEY ROUTES";
  const {show}=useToast();const error=useCallback((message:string)=>show({tone:"danger",title:"Check this step",message}),[show]);const success=useCallback((message:string)=>show({tone:"success",title:"Saved",message}),[show]);
  const fundingIdempotency=useRef(createClientId()),payoutIdempotency=useRef(createClientId()),resumeAfterOtp=useRef<number|null>(null);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[active,setActive]=useState(0);
  const [sessionState,setSessionState]=useState<SessionState>("checking");
  const [profileState,setProfileState]=useState<ProfileState>("checking");
  const [otp,setOtp]=useState(""),[otpSent,setOtpSent]=useState(false),[cooldown,setCooldown]=useState(0);
  const [coverage,setCoverage]=useState<Coverage|null>(null),[forms,setForms]=useState<BankForm[]>([]),[destinationCurrencies,setDestinationCurrencies]=useState<DestinationCurrency[]>([]);
  const [currency,setCurrency]=useState(COUNTRY_CURRENCY[customer.country.toUpperCase()]??""),[payoutCurrency,setPayoutCurrency]=useState(COUNTRY_CURRENCY[customer.country.toUpperCase()]??""),[token,setToken]=useState(""),[network,setNetwork]=useState(""),[address,setAddress]=useState(""),[addressType,setAddressType]=useState("SELF_HOSTED"),[vasp,setVasp]=useState("");
  const [funding,setFunding]=useState<FundingAccount|null>(null),[formId,setFormId]=useState(""),[accountName,setAccountName]=useState(""),[details,setDetails]=useState<Record<string,string|boolean>>({});
  const [recipientType,setRecipientType]=useState<"SELF"|"THIRD_PARTY">("SELF"),[mainRecipient,setMainRecipient]=useState(true),[thirdPartyDetails,setThirdPartyDetails]=useState<Record<string,string>>({}),[supportedBanks,setSupportedBanks]=useState<SupportedBank[]>([]);
  const [identityType,setIdentityType]=useState<"BVN"|"NIN">("BVN");
  const [identityNumber,setIdentityNumber]=useState("");
  const [identityPrefill,setIdentityPrefill]=useState<{type:string;last4:string;verified?:boolean}|null>(null);
  const [changeIdentity,setChangeIdentity]=useState(false);
  const [identitySessionId,setIdentitySessionId]=useState<string|null>(null);
  const [identityOtp,setIdentityOtp]=useState("");
  const [identityMasked,setIdentityMasked]=useState("");
  const [identityHint,setIdentityHint]=useState("");

  useEffect(()=>{
    setCustomerFetchAccountScope(accountScope);
    return()=>setCustomerFetchAccountScope(null);
  },[accountScope]);

  useEffect(()=>{void (async()=>{
    const [sessionResult,loadedCoverage,preferences,bankFormPayloads,loadedDestinationCurrencies]=await Promise.all([sessionApi<{active:boolean;expiresAt?:string|null}|null>("/session").then(value=>({value,failed:false})).catch(()=>({value:null,failed:true})),sessionApi<Coverage>("/coverage?refresh=true").catch(()=>null),api<Preference[]>("/preferences").catch(()=>[]),api<BankFormPayload[]>("/bank-requirements").catch(()=>[]),Promise.resolve().then(()=>api<DestinationCurrency[]>("/destination-currencies")).catch(()=>[] as DestinationCurrency[])]);const bankForms=bankFormPayloads.map(normalizeBankForm).filter((item):item is BankForm=>item!==null);
    setCoverage(loadedCoverage);setForms(bankForms);setDestinationCurrencies(loadedDestinationCurrencies);const saved=preferences[0];const home=COUNTRY_CURRENCY[customer.country.toUpperCase()];const availableCurrencies=new Set(bankForms.map(item=>item.currency));const acceptedCurrencies=new Set(loadedCoverage?.fundingCurrencies?.map(item=>item.code)??availableCurrencies);const nextCurrency=saved?.fiatCurrency??(home&&availableCurrencies.has(home)&&acceptedCurrencies.has(home)?home:bankForms.find(item=>acceptedCurrencies.has(item.currency))?.currency??loadedCoverage?.fundingCurrencies?.[0]?.code??"");setCurrency(nextCurrency);setToken(saved?.token??"");setNetwork(saved?.network??"");setAddress(saved?.address??"");setAddressType(saved?.addressType??"SELF_HOSTED");setVasp(saved?.vasp??"");
    let savedFunding:FundingAccount|null=null,payoutCount=0,savedPayoutCurrency="";
    if(saved?.routeType==="NATIVE"){savedFunding=await fetchFundingAccount(true,nextCurrency);payoutCount=(await api<NativeDestination[]>("/native-destinations").catch(()=>[])).length;savedPayoutCurrency="NGN";}else if(saved){savedFunding=await fetchFundingAccount(false,nextCurrency,false);const savedAccounts=bankAccountItems<BankAccount>(await api<unknown>("/bank-accounts?size=100").catch(()=>[]));const savedPayout=savedAccounts.find(item=>item.mainRecipient)??savedAccounts[0];payoutCount=savedAccounts.length;savedPayoutCurrency=savedPayout?.currency??"";}
    const nextPayoutCurrency=savedPayoutCurrency||(home&&availableCurrencies.has(home)?home:availableCurrencies.has(nextCurrency)?nextCurrency:bankForms[0]?.currency??"");const matching=bankForms.find(item=>item.currency===nextPayoutCurrency)??null;setPayoutCurrency(nextPayoutCurrency);setFormId(matching?.id??"");setAccountName(saved?.routeType==="NATIVE"?`${customer.givenName} ${customer.familyName}`:`Primary ${nextPayoutCurrency} account`);setDetails(seedDetails(matching,nextPayoutCurrency));
    const nextStep=nextMoneyStep(saved,savedFunding,payoutCount);setFunding(savedFunding);if(sessionResult.failed)setSessionState("unavailable");else if(sessionResult.value?.active)setSessionState("active");else setSessionState("missing");
    if(readOnly){
      setProfileState("ready");
      if(nextStep===4){onComplete();setLoading(false);return;}
      setActive(Math.max(1,nextStep));
      setLoading(false);
      return;
    }
    try{await api<{status:string}>("/crypto-profile",{method:"POST"});setProfileState("ready");if(nextStep===4){onComplete();return;}setActive(nextStep);}catch{setProfileState("unavailable");setActive(saved?nextStep:1);}setLoading(false);
  })();},[accountScope,customer.country,customer.familyName,customer.givenName,onComplete,readOnly]);

  useEffect(()=>{if(cooldown<=0)return;const timer=window.setInterval(()=>setCooldown(value=>Math.max(0,value-1)),1000);return()=>window.clearInterval(timer);},[cooldown]);

  const assets=useMemo(()=>coverage?.transferableAssets.filter(item=>item.type==="CRYPTO"&&item.networks.length>0||item.type==="STABLECOIN"&&ROUTE_TOKENS.has(item.code)&&item.networks.some(value=>TARGET_NETWORKS.has(value.code))).sort((a,b)=>(ASSET_RELEVANCE.get(a.code)??Number.MAX_SAFE_INTEGER)-(ASSET_RELEVANCE.get(b.code)??Number.MAX_SAFE_INTEGER)||a.name.localeCompare(b.name))??[],[coverage]);
  const selectedAsset=assets.find(item=>item.code===token)??null;const networks=selectedAsset?.networks.filter(item=>selectedAsset.type==="CRYPTO"||TARGET_NETWORKS.has(item.code))??[];const nativeRoute=currency==="NGN";
  const bankCurrencies=useMemo(()=>{const catalogCodes=new Set(destinationCurrencies.map(item=>item.code.toUpperCase()));return Array.from(new Set(forms.map(item=>item.currency).filter(code=>catalogCodes.size===0||catalogCodes.has(code)))).filter(code=>residenceAllowsCurrency(customer.country,code));},[destinationCurrencies,forms,customer.country]);const fiatNames=new Map(coverage?.fiatCurrencies.map(item=>[item.code,item.name])??[]);const acceptedFunding=new Set((coverage?.fundingCurrencies?.map(item=>item.code)??bankCurrencies).filter(code=>residenceAllowsCurrency(customer.country,code)));const homeCurrency=COUNTRY_CURRENCY[customer.country.toUpperCase()];
  const fundingOptions=bankCurrencies.filter(value=>acceptedFunding.has(value)).map(value=>({value,label:fiatNames.get(value)??FIAT_NAME[value]??value,detail:"Available for your residence",kind:"fiat" as const}));
  const payoutOptions=[...bankCurrencies].sort((a,b)=>(a===homeCurrency?-2:a===currency?-1:FIAT_RELEVANCE.get(a)??Number.MAX_SAFE_INTEGER)-(b===homeCurrency?-2:b===currency?-1:FIAT_RELEVANCE.get(b)??Number.MAX_SAFE_INTEGER)||a.localeCompare(b)).map(value=>{const catalog=destinationCurrencies.find(item=>item.code===value);const routeDetail=catalog?.routeCount===1?"One payout route":catalog?.routeCount?`${catalog.routeCount} payout routes`:"Payout account available";return {value,label:fiatNames.get(value)??FIAT_NAME[value]??value,detail:value===homeCurrency?`${routeDetail} · Your local payout currency`:forms.some(item=>item.currency===value&&item.preview)?`${routeDetail} · Limited availability`:routeDetail,kind:"fiat" as const};});
  const assetOptions=assets.map(item=>({value:item.code,label:item.name,detail:item.type==="STABLECOIN"?"Direct stablecoin route":"Crypto delivery route",kind:"crypto" as const}));
  const networkOptions=networks.map(item=>({value:item.code,label:item.name||title(item.code),detail:networkRail(item.code),kind:"network" as const}));
  const currencyForms=forms.filter(item=>item.currency===payoutCurrency);const nativeFallback:BankForm={currency:"NGN",id:"ngn-bank",title:"NGN bank account",route:"Bank account",preview:false,requiredFields:["account_number","bank_code"],optionalFields:[],accountDetailsSchema:{required:["account_number","bank_code"],properties:{account_number:{type:"string",description:"Your NGN account number."},bank_code:{type:"string",description:"The receiving bank code."}}}};
  const selectedForm=currencyForms.find(item=>item.id===formId)??currencyForms[0]??(nativeRoute?nativeFallback:null);const payoutFields=visiblePayoutFields(selectedForm,supportedBanks.length);
  const recipientFields=thirdPartyRecipientFields(selectedForm);
  useEffect(()=>{
    if(!payoutCurrency){setSupportedBanks([]);return;}
    const form=forms.find(item=>item.id===formId)??forms.find(item=>item.currency===payoutCurrency)??null;
    const properties=form?.accountDetailsSchema.properties??{};
    const needsBankList=Object.keys(properties).some(key=>{
      const name=normalizeFieldName(key);
      return name==="bankcode"||name==="bankname";
    });
    if(!needsBankList){setSupportedBanks([]);return;}
    let cancelled=false;
    void api<SupportedBank[]>(`/supported-banks?currency=${encodeURIComponent(payoutCurrency)}`)
      .then(items=>{if(!cancelled)setSupportedBanks(items);})
      .catch(()=>{if(!cancelled)setSupportedBanks([]);});
    return()=>{cancelled=true;};
  },[payoutCurrency,formId,forms]);
  const refreshFunding=useCallback(async()=>{const account=await fetchFundingAccount(nativeRoute,currency,true);setFunding(account);return account;},[currency,nativeRoute]);

  useEffect(()=>{if(active!==2||!funding||nativeRoute||!fundingNeedsRefresh(funding))return;let cancelled=false;const poll=async()=>{if(cancelled)return;await refreshFunding().catch(()=>null);};void poll();const timer=window.setInterval(()=>void poll(),5000);return()=>{cancelled=true;window.clearInterval(timer);};},[active,funding,nativeRoute,refreshFunding]);

  useEffect(()=>{if(active!==2||!nativeRoute||funding)return;let cancelled=false;void api<{type:string;last4:string;verified?:boolean}|null>("/native-funding-account/identity").then(value=>{if(cancelled||!value)return;setIdentityPrefill({type:value.type,last4:value.last4,verified:Boolean(value.verified)});setIdentityType((value.type as "BVN"|"NIN")||"BVN");}).catch(()=>{});return()=>{cancelled=true;};},[active,nativeRoute,funding]);

  function chooseFundingCurrency(value:string){setCurrency(value);setFunding(null);}
  function choosePayoutCurrency(value:string){setPayoutCurrency(value);const next=forms.find(item=>item.currency===value)??null;setFormId(next?.id??"");setDetails(seedDetails(next,value));setThirdPartyDetails({});setRecipientType("SELF");setAccountName(`Primary ${value} account`);}
  function chooseAsset(value:string){setToken(value);setAddress("");setFunding(null);const item=assets.find(asset=>asset.code===value);setNetwork(item?.networks.find(entry=>item.type==="CRYPTO"||TARGET_NETWORKS.has(entry.code))?.code??"");const home=COUNTRY_CURRENCY[customer.country.toUpperCase()];const nextCurrency=currency&&acceptedFunding.has(currency)&&bankCurrencies.includes(currency)?currency:home&&acceptedFunding.has(home)&&bankCurrencies.includes(home)?home:bankCurrencies.find(entry=>acceptedFunding.has(entry))??"";chooseFundingCurrency(nextCurrency);}
  function chooseForm(value:string){const next=forms.find(item=>item.id===value)??null;setFormId(value);setDetails(seedDetails(next,payoutCurrency));setThirdPartyDetails({});}
  function continueAfterSession(fallback=1){const next=resumeAfterOtp.current??(token?funding?3:2:fallback);resumeAfterOtp.current=null;setActive(next);}
  function promptSession(step:number){resumeAfterOtp.current=step;setActive(0);setSessionState(sessionState==="unavailable"?"unavailable":"missing");}

  async function sendOtp(){setBusy(true);try{await sessionApi<void>("/session/start",{method:"POST"});setOtpSent(true);setCooldown(30);success("Open the newest StrivePay email.");}catch(problem){error(problem instanceof Error?problem.message:"The code could not be sent");}finally{setBusy(false);}}
  async function provisionProfile(){setProfileState("checking");try{await api<{status:string}>("/crypto-profile",{method:"POST"});setProfileState("ready");return true;}catch(problem){setProfileState("unavailable");error(problem instanceof Error?problem.message:"Crypto access could not be prepared");return false;}}
  async function verifyOtp(event:FormEvent){event.preventDefault();if(!/^\d{6}$/.test(otp)){error("Enter the 6-digit code from your email");return;}setBusy(true);try{await sessionApi("/session/otp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({otp})});setOtp("");setSessionState("active");if(await provisionProfile())continueAfterSession(1);success("Secure setup unlocked.");}catch(problem){error(problem instanceof Error?problem.message:"That code did not work");}finally{setBusy(false);}}
  async function retrySession(){setBusy(true);try{const session=await sessionApi<{active:boolean}|null>("/session");if(session?.active){setSessionState("active");if(await provisionProfile())continueAfterSession(1);return;}setSessionState("missing");}catch(problem){setSessionState("unavailable");error(problem instanceof Error?problem.message:"The secure session could not be checked");}finally{setBusy(false);}}
  async function retryProfile(){setBusy(true);try{await provisionProfile();}finally{setBusy(false);}}

  async function saveCrypto(event:FormEvent){event.preventDefault();if(readOnly){setActive(2);return;}if(!currency||!token||!network||!address.trim()||addressType==="HOSTED"&&!vasp.trim()){error("Choose the route and add the wallet that should receive crypto");return;}const wallet=address.trim();if(!walletAddressValid(network,wallet)){error("Enter a valid wallet address for the selected network");return;}if(sessionState!=="active"&&!(selectedAsset?.type==="CRYPTO"&&currency==="NGN")){promptSession(1);return;}setBusy(true);try{await api<Preference>("/crypto",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({fiatCurrency:currency,token,network,address:wallet,addressType,vasp:addressType==="HOSTED"?vasp.trim():undefined})});if(selectedAsset?.type==="CRYPTO"&&currency==="NGN")choosePayoutCurrency("NGN");setActive(2);success("Your crypto route is ready.");}catch(problem){if(sessionRequired(problem)){promptSession(1);return;}error(problem instanceof Error?problem.message:"The crypto route could not be saved");}finally{setBusy(false);}}

  async function requestFunding(){if(readOnly){setActive(3);return;}if(!nativeRoute&&sessionState!=="active"){promptSession(2);return;}setBusy(true);try{
    if(nativeRoute){
      if(!identitySessionId){
        try{
          const account=await api<FundingAccount>("/native-funding-account",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({})});
          setFunding(account);setIdentityHint("");success(fundingNeedsRefresh(account)?"Pay-in account requested. Details will appear shortly.":"Your pay-in account is ready.");
          setBusy(false);return;
        }catch{
          // No reusable VA yet — continue to a fresh OTP challenge.
        }
        const needNumber=changeIdentity||!identityPrefill;
        if(needNumber&&identityNumber.replace(/\D/g,"").length!==11){error(`Enter a valid 11-digit ${identityType}`);setBusy(false);return;}
        const session=await api<{sessionId:string|null;maskedNumber:string;type:string;otpRequired:boolean;message?:string}>("/native-funding-account/identity",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:identityType,number:needNumber?identityNumber:undefined})});
        if(session.otpRequired===false||!session.sessionId){
          const account=await api<FundingAccount>("/native-funding-account",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({})});
          setFunding(account);setIdentityHint("");success(fundingNeedsRefresh(account)?"Pay-in account requested. Details will appear shortly.":"Your pay-in account is ready.");
        }else{
          const hint=session.message?.trim()||"Enter the OTP sent for identity verification.";
          setIdentitySessionId(session.sessionId);setIdentityMasked(session.maskedNumber);setIdentityType((session.type as "BVN"|"NIN")||identityType);setIdentityHint(hint);success(hint);setBusy(false);return;
        }
      }else{
        if(!/^\d{4,8}$/.test(identityOtp)){error("Enter the OTP from your bank SMS");setBusy(false);return;}
        const account=await api<FundingAccount>("/native-funding-account",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({identitySessionId,otp:identityOtp})});
        setFunding(account);setIdentitySessionId(null);setIdentityOtp("");setIdentityHint("");success(fundingNeedsRefresh(account)?"Pay-in account requested. Details will appear shortly.":"Your pay-in account is ready.");
      }
    }else{
      const account=await api<FundingAccount>("/funding-accounts",{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":fundingIdempotency.current},body:JSON.stringify({currency})});
      setFunding(account);success(fundingNeedsRefresh(account)?"Pay-in account requested. Details will appear shortly.":"Your pay-in account is ready.");
    }
  }catch(problem){if(sessionRequired(problem)){promptSession(2);return;}error(problem instanceof Error?problem.message:"The pay-in account could not be requested");}finally{setBusy(false);}}

  async function saveBank(event:FormEvent){event.preventDefault();if(readOnly){onComplete();return;}if(!selectedForm||!accountName.trim()){error(nativeRoute?"Add the verified account holder name":"Choose a payout route and name this account");return;}const missing=(selectedForm.accountDetailsSchema.required??[]).filter(key=>key!=="currency"&&(details[key]===undefined||details[key]===""));if(missing.length){error(`Complete ${missing.map(title).join(", ")}`);return;}if(recipientType==="THIRD_PARTY"){const missingRecipient=recipientFields.filter(field=>!thirdPartyDetails[field.key]?.trim());if(missingRecipient.length){error(`Complete ${missingRecipient.map(field=>field.label).join(", ")}`);return;}}if(!nativeRoute&&sessionState!=="active"){promptSession(3);return;}setBusy(true);try{if(nativeRoute)await api<NativeDestination>("/native-destinations",{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":payoutIdempotency.current},body:JSON.stringify({bankCode:String(details.bank_code??""),accountNumber:String(details.account_number??""),accountName:accountName.trim()})});else await api<BankAccount>("/bank-accounts",{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":payoutIdempotency.current},body:JSON.stringify({accountName:accountName.trim(),currency:payoutCurrency,recipientType,mainRecipient,accountDetails:{...details,currency:payoutCurrency},thirdPartyDetails:recipientType==="THIRD_PARTY"?thirdPartyDetails:undefined})});payoutIdempotency.current=createClientId();success("Your payout account is ready.");onComplete();}catch(problem){if(sessionRequired(problem)){promptSession(3);return;}error(problem instanceof Error?problem.message:"The payout account could not be saved");}finally{setBusy(false);}}

  function copy(value?:string|null){if(!value)return;void navigator.clipboard.writeText(value);success("Account detail copied.");}
  if(loading)return <RouteBody eyebrow={routeEyebrow} active={1} titleText="Finding your routes" status="Loading"><div className="compliance-loading"><IconLoader2 className="spin"/>Loading your setup…</div></RouteBody>;

  if(active===0&&sessionState==="unavailable")return <RouteBody eyebrow={routeEyebrow} active={0} titleText="Check secure access" status="Try again" secureRequired><div className="compliance-form compliance-otp-form"><span className="compliance-form-emblem"><IconShieldCheck size={28}/></span><h3>Session check paused</h3><p className="compliance-form-copy">We could not confirm this session yet. Your setup is still saved.</p><button className="compliance-primary" type="button" disabled={busy} onClick={()=>void retrySession()}>{busy?<IconLoader2 className="spin" size={17}/>:null}Check again</button></div></RouteBody>;

  if(active===0)return <RouteBody eyebrow={routeEyebrow} active={0} titleText="Secure this setup" status="Action needed" secureRequired><form className="compliance-form compliance-otp-form" onSubmit={verifyOtp} noValidate><span className="compliance-form-emblem"><IconMail size={28}/></span><h3>Confirm this session</h3><p className="compliance-form-copy">{otpSent?<>Enter the 6-digit code sent to <strong>{customer.email}</strong>.</>:<>We’ll send a security code to <strong>{customer.email}</strong>. Tap Send code to continue.</>}</p>{!otpSent?<button className="compliance-primary" type="button" disabled={busy} onClick={()=>void sendOtp()}>{busy?<IconLoader2 className="spin" size={17}/>:null}Send code</button>:<><input className="compliance-otp" aria-label="Email verification code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={event=>setOtp(event.target.value.replace(/\D/g,""))} autoFocus/><div className="compliance-form-actions"><button className="compliance-link-button" type="button" disabled={busy||cooldown>0} onClick={()=>void sendOtp()}>{cooldown>0?`Resend in ${cooldown}s`:"Send a new code"}</button><button className="compliance-primary" type="submit" disabled={busy}>{busy?<IconLoader2 className="spin" size={17}/>:null}Unlock setup</button></div></>}</form></RouteBody>;

  if(active===1&&profileState!=="ready")return <RouteBody eyebrow={routeEyebrow} active={1} titleText="Prepare crypto access" status={profileState==="checking"?"Preparing":"Try again"}><div className="compliance-form compliance-otp-form"><span className="compliance-form-emblem"><IconCoins size={28}/></span><h3>{profileState==="checking"?"Preparing your crypto profile":"Crypto access paused"}</h3><p className="compliance-form-copy">{profileState==="checking"?"This usually takes a moment.":"Your route form will open after access is ready."}</p>{profileState==="unavailable"?<button className="compliance-primary" type="button" disabled={busy} onClick={()=>void retryProfile()}>{busy?<IconLoader2 className="spin" size={17}/>:null}Try again</button>:<IconLoader2 className="spin"/>}</div></RouteBody>;

  if(active===1)return <RouteBody eyebrow={routeEyebrow} active={1} titleText="Set your crypto route" status="In progress"><form className="compliance-form" onSubmit={saveCrypto} noValidate><div className="compliance-form-grid"><RouteSelect label="Bank currency" value={currency} options={fundingOptions} onChange={chooseFundingCurrency} placeholder="Choose a currency"/><RouteSelect label="Crypto asset" value={token} options={assetOptions} onChange={chooseAsset} placeholder="Choose an asset"/><RouteSelect label="Network" value={network} options={networkOptions} onChange={setNetwork} placeholder="Choose a network" disabled={!token}/><Field label="Wallet type"><select value={addressType} onChange={event=>setAddressType(event.target.value)}><option value="SELF_HOSTED">I control this wallet</option><option value="HOSTED">Exchange or custodian</option></select></Field><Field label="Receiving wallet" hint="Use an address for the selected network." wide><input value={address} onChange={event=>setAddress(event.target.value.trim())} placeholder={network==="BITCOIN"?"bc1…":network==="SOLANA"?"Solana address":"Wallet address"}/></Field>{addressType==="HOSTED"?<Field label="Wallet service" wide><input value={vasp} onChange={event=>setVasp(event.target.value)} placeholder="Exchange or custodian name"/></Field>:null}</div><div className="compliance-form-actions"><button className="compliance-primary" type="submit" disabled={busy}>{busy?<IconLoader2 className="spin" size={17}/>:null}{readOnly?"Continue":"Save crypto route"} <IconArrowRight size={17}/></button></div></form></RouteBody>;

  if(active===2){const fundingDetails=funding?fundingDetailRows(funding,currency):[];const fundingPending=funding?fundingNeedsRefresh(funding):false;const showIdentity=nativeRoute&&!funding;return <RouteBody eyebrow={routeEyebrow} active={2} titleText="Request pay-in account" status={funding?(fundingPending?"Preparing":"Ready"):"Action needed"}><div className="compliance-form"><p className="compliance-form-copy">Get a reusable {currency} account for bank deposits into this route.</p>{funding?<div className="funding-account-card"><div className="funding-account-card-head"><span className="funding-account-card-logo">{fiatLogo(funding.currency??currency,34)}</span><div><small>PAY-IN ACCOUNT</small><strong>{funding.bankName??funding.accountName??`${currency} deposit account`}</strong></div><b className={fundingPending?"pending":""}>{title(funding.status)}</b></div>{fundingPending&&!fundingHasDetails(funding)?<p className="funding-account-pending"><IconLoader2 className="spin" size={15}/>Your account is being created. Deposit details will appear here shortly.</p>:null}<dl>{fundingDetails.map(row=><div key={row.key}><dt>{row.label}</dt><dd>{row.key==="currency"?<>{fiatLogo(row.value,22)}{row.value}</>:row.value}{row.copyable?<button type="button" onClick={()=>copy(row.value)} aria-label={`Copy ${row.label.toLowerCase()}`}><IconCopy size={15}/></button>:null}</dd></div>)}</dl>{fundingPending?<button className="compliance-link-button funding-account-refresh" type="button" disabled={busy} onClick={()=>void refreshFunding()}>{busy?<IconLoader2 className="spin" size={15}/>:null}Refresh account details</button>:null}</div>:showIdentity?<div className="payin-request-panel native-identity-panel"><div><small>NGN identity check</small><h3>{identitySessionId?"Enter OTP":"Confirm BVN or NIN"}</h3><p>{identitySessionId?(identityHint||`OTP sent for ${identityMasked||identityType}.`):"Safe Haven needs a one-time identity check before creating your static pay-in account."}</p></div>{!identitySessionId?<div className="compliance-form-grid"><Field label="ID type"><select value={identityType} onChange={event=>{setIdentityType(event.target.value as "BVN"|"NIN");setChangeIdentity(true);}}><option value="BVN">BVN</option><option value="NIN">NIN</option></select></Field>{identityPrefill&&!changeIdentity?<Field label="Saved number" hint="We only keep the last four digits on screen." wide><input value={`•••• ${identityPrefill.last4}`} readOnly/><button className="compliance-link-button" type="button" onClick={()=>setChangeIdentity(true)}>Change number</button></Field>:<Field label={`${identityType} number`} wide><input inputMode="numeric" autoComplete="off" maxLength={11} value={identityNumber} onChange={event=>setIdentityNumber(event.target.value.replace(/\D/g,""))} placeholder="11 digits"/></Field>}</div>:<Field label="OTP" wide><input className="compliance-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={identityOtp} onChange={event=>setIdentityOtp(event.target.value.replace(/\D/g,""))}/></Field>}</div>:<div className="payin-request-panel"><span className="route-logo-pair" aria-hidden="true">{routeLogoPair(currency,token,40)}</span><div><small>{currency} → {token}</small><h3>Request your deposit account</h3><p>One account you can reuse whenever you fund this route.</p></div></div>}<div className="compliance-form-actions"><button className="compliance-secondary" type="button" onClick={()=>{if(identitySessionId){setIdentitySessionId(null);setIdentityOtp("");setIdentityHint("");return;}setActive(1);}}><IconArrowLeft size={17}/> Back</button>{funding?<button className="compliance-primary" type="button" onClick={()=>setActive(3)}>Continue to payout <IconArrowRight size={17}/></button>:<button className="compliance-primary" type="button" disabled={busy} onClick={()=>void requestFunding()}>{busy?<IconLoader2 className="spin" size={17}/>:null}{readOnly?"Continue":identitySessionId?"Confirm OTP":nativeRoute?"Send OTP":"Request account"} <IconArrowRight size={17}/></button>}</div></div></RouteBody>;}

  return <RouteBody eyebrow={routeEyebrow} active={3} titleText="Add payout account">
    <form className="compliance-form" onSubmit={saveBank} noValidate>
      <p className="compliance-form-copy">Add the bank account that receives money when you sell crypto.</p>
      <div className="compliance-form-grid">
        <RouteSelect label="Payout currency" value={payoutCurrency} options={nativeRoute?payoutOptions.filter(item=>item.value==="NGN"):payoutOptions} onChange={nativeRoute?()=>{}:choosePayoutCurrency} placeholder="Choose a currency"/>
        {currencyForms.length>1&&!nativeRoute?<Field label="Account format" hint={selectedForm?.route?`Settles over ${selectedForm.route}.`:undefined}><select value={selectedForm?.id??""} onChange={event=>chooseForm(event.target.value)}>{currencyForms.map(item=><option value={item.id} key={item.id}>{item.title}</option>)}</select></Field>:null}
        <Field label={nativeRoute?"Account holder name":"Account name"} hint={nativeRoute?"Use the verified name on this account.":"A private label that helps you identify this payout account."} wide={currencyForms.length>1&&!nativeRoute}><input value={accountName} onChange={event=>setAccountName(event.target.value)} placeholder={nativeRoute?`${customer.givenName} ${customer.familyName}`:`Primary ${payoutCurrency} account`}/></Field>
        {!nativeRoute?<div className="compliance-field compliance-field-wide"><span>Who owns this bank account?</span><div className="recipient-type-options" role="radiogroup" aria-label="Who owns this bank account?"><label><input type="radio" name="payout-recipient-type" checked={recipientType==="SELF"} onChange={()=>{setRecipientType("SELF");setThirdPartyDetails({})}}/>My account</label><label><input type="radio" name="payout-recipient-type" checked={recipientType==="THIRD_PARTY"} disabled={!recipientFields.length} onChange={()=>setRecipientType("THIRD_PARTY")}/>Someone else</label></div>{!recipientFields.length?<small>Someone else is not available for this payout currency.</small>:null}</div>:null}
        {payoutFields.map(field=>{const label=field.label;const selectedBankValue=String(details[payoutFieldKey(selectedForm,"bank_code")??""]??details[payoutFieldKey(selectedForm,"bank_name")??""]??details[field.key]??"");return <Field label={label} hint={payoutFieldHint(field.key,field.rule,field.control)} key={field.key} wide={field.wide}>{field.control==="bank-select"?<BankSelect value={selectedBankValue} banks={supportedBanks} onChange={bank=>setDetails(current=>applySelectedBank(selectedForm,bank,current))}/>:field.control==="choice"?<ChoiceSelect label={label} value={String(details[field.key]??"")} options={field.rule.enum??[]} onChange={next=>setDetails(current=>({...current,[field.key]:field.rule.type==="boolean"?next==="true":next}))}/>:<input value={String(details[field.key]??"")} inputMode={isDigitPayoutField(field.key)?"numeric":"text"} maxLength={field.rule.maxLength} onChange={event=>setDetails(current=>({...current,[field.key]:normalizeFieldName(field.key)==="iban"?event.target.value.toUpperCase():event.target.value}))} placeholder={typeof field.rule.example==="string"?field.rule.example:""}/>}</Field>;})}
        {recipientType==="THIRD_PARTY"?<>{recipientFields.map(field=><Field label={field.label} hint={payoutFieldHint(field.key,field.rule,field.control)} key={field.key} wide={field.wide}>{field.control==="choice"?<ChoiceSelect label={field.label} value={thirdPartyDetails[field.key]??""} options={field.rule.enum??[]} onChange={next=>setThirdPartyDetails(current=>({...current,[field.key]:next}))}/>:<input value={thirdPartyDetails[field.key]??""} onChange={event=>setThirdPartyDetails(current=>({...current,[field.key]:event.target.value}))} placeholder={typeof field.rule.example==="string"?field.rule.example:""}/>}</Field>)}</>:null}
        {!nativeRoute?<label className="payout-primary-choice compliance-field-wide"><input type="checkbox" checked={mainRecipient} onChange={event=>setMainRecipient(event.target.checked)}/>Use as my primary payout account</label>:null}
      </div>
      <div className="compliance-form-actions"><button className="compliance-secondary" type="button" onClick={()=>setActive(2)}><IconArrowLeft size={17}/> Back</button><button className="compliance-primary" type="submit" disabled={busy||(!readOnly&&!selectedForm)}>{busy?<IconLoader2 className="spin" size={17}/>:null}{readOnly?"Continue":"Save payout account"} <IconArrowRight size={17}/></button></div>
    </form>
  </RouteBody>;
}
