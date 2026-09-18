"use client";

import Image from "next/image";
import {useId,useMemo,useState} from "react";
import {CircleFlag} from "react-circle-flags";
import {IconBuildingBank,IconCheck,IconChevronDown,IconSearch} from "@tabler/icons-react";
import {Modal} from "@/components/ui/modal";
import {titleCase} from "@/lib/money-route-api";
import {payoutFieldKey,type BankForm} from "./payout-form-schema";

export type SelectOption={value:string;label:string;detail:string;kind:"fiat"|"crypto"|"network"};
export type SupportedBank={name:string;code?:string|null;accountType?:string|null;logoUrl?:string|null};

export const ROUTE_TOKENS=new Set(["USDC","USDC_E","USDT","CEUR","CUSD","AGEUR","EURC"]);
export const TARGET_NETWORKS=new Set(["ETHEREUM","POLYGON","OPTIMISM","ARBITRUM","BASE","BSC","AVALANCHE","CELO","SOLANA","TRON"]);
export const ASSET_RELEVANCE=new Map(["BTC","ETH","USDC","USDT","EURC","SOL","XRP","BNB","ADA","DOGE","MATIC","LTC","BCH","TRX","LINK","DOT","XLM","AAVE","SHIB","CAKE","FIL","USDC_E","CEUR","AGEUR","CUSD","DASH","XTZ","ONE","AXS","FLOKI","BABYDOGE","QDX"].map((code,index)=>[code,index]));
export const FIAT_RELEVANCE=new Map(["EUR","GBP","USD","CAD","AED","NGN","SGD","JPY","INR","BRL","MXN","TRY","GHS","KES","ZMW","UGX","TZS","XAF","ARS","COP","IDR","PHP","PKR","VND","OMR","QAR","NPR","GTQ"].map((code,index)=>[code,index]));
export const COUNTRY_CURRENCY:Record<string,string>={US:"USD",GB:"GBP",NG:"NGN",TR:"TRY",IN:"INR",PK:"PKR",BR:"BRL",AR:"ARS",ID:"IDR",KE:"KES",PH:"PHP",AE:"AED",VN:"VND",GH:"GHS",MX:"MXN",JP:"JPY",OM:"OMR",QA:"QAR",IT:"EUR",DE:"EUR",FR:"EUR",ES:"EUR",PT:"EUR",NL:"EUR",BE:"EUR",IE:"EUR",AT:"EUR",FI:"EUR",GR:"EUR",CY:"EUR",EE:"EUR",HR:"EUR",LT:"EUR",LU:"EUR",LV:"EUR",MT:"EUR",SI:"EUR",SK:"EUR"};

/** USD is US-only; NGN is Nigeria-only. Other fiats stay available to any residence that already receives them. */
export function residenceAllowsCurrency(country:string|null|undefined,currency:string|null|undefined){
  const residence=(country??"").trim().toUpperCase();
  const code=(currency??"").trim().toUpperCase();
  if(code==="USD")return residence==="US";
  if(code==="NGN")return residence==="NG";
  return Boolean(code);
}

export function filterResidenceCurrencies<T extends string>(country:string|null|undefined,codes:T[]):T[]{
  return codes.filter(code=>residenceAllowsCurrency(country,code));
}
export const FIAT_NAME:Record<string,string>={AED:"UAE Dirham",ARS:"Argentine Peso",BRL:"Brazilian Real",CAD:"Canadian Dollar",COP:"Colombian Peso",EUR:"Euro",GBP:"British Pound",GHS:"Ghanaian Cedi",GTQ:"Guatemalan Quetzal",IDR:"Indonesian Rupiah",INR:"Indian Rupee",JPY:"Japanese Yen",KES:"Kenyan Shilling",MXN:"Mexican Peso",NGN:"Nigerian Naira",NPR:"Nepalese Rupee",OMR:"Omani Rial",PHP:"Philippine Peso",PKR:"Pakistani Rupee",QAR:"Qatari Riyal",SGD:"Singapore Dollar",TRY:"Turkish Lira",TZS:"Tanzanian Shilling",UGX:"Ugandan Shilling",USD:"US Dollar",VND:"Vietnamese Dong",XAF:"Central African CFA Franc",ZMW:"Zambian Kwacha"};
export const FIAT_FLAG:Record<string,string>={USD:"us",EUR:"eu",GBP:"gb",NGN:"ng",AED:"ae",TRY:"tr",INR:"in",PKR:"pk",BRL:"br",ARS:"ar",CAD:"ca",COP:"co",IDR:"id",KES:"ke",PHP:"ph",VND:"vn",GHS:"gh",GTQ:"gt",MXN:"mx",JPY:"jp",NPR:"np",OMR:"om",QAR:"qa",SGD:"sg",TZS:"tz",UGX:"ug",XAF:"cm",ZMW:"zm"};
const TOKEN_IMAGE:Record<string,string>={USDC:"USDC",USDC_E:"USDCE",USDT:"USDT",CEUR:"CEUR",CUSD:"CUSD",AGEUR:"AGEUR",EURC:"EURC"};
const NETWORK_IMAGE:Record<string,string>={ETHEREUM:"ETHEREUM",POLYGON:"POLYGON",OPTIMISM:"OP_MAINNET",ARBITRUM:"ARBITRUM",BASE:"BASE",BSC:"BNB_SMART_CHAIN",AVALANCHE:"AVALANCHE",CELO:"CELO",SOLANA:"SOLANA",TRON:"TRON"};
/** Native-coin rails reuse the crypto asset mark; we only ship dedicated PNGs for multi-network L1/L2s. */
const NATIVE_NETWORK_CRYPTO:Record<string,string>={BITCOIN:"btc",LITECOIN:"ltc",DOGE:"doge",DASH:"dash",RIPPLE:"xrp",BITCOIN_CASH:"bch",CARDANO:"ada",STELLAR:"xlm",BNB:"bnb",SOL:"sol",ETH:"eth",TRX:"trx",MATIC:"matic"};
/** Wallet-facing rail labels (ERC20 / TRC20 / …) instead of “{ASSET} network”. */
const NETWORK_RAIL:Record<string,string>={ETHEREUM:"ERC20",TRON:"TRC20",BSC:"BEP20",POLYGON:"Polygon",SOLANA:"SPL",ARBITRUM:"Arbitrum One",OPTIMISM:"OP Mainnet",BASE:"Base",AVALANCHE:"Avalanche C-Chain",CELO:"Celo",BITCOIN:"Bitcoin",LITECOIN:"Litecoin",DOGE:"Dogecoin",DASH:"Dash",RIPPLE:"XRP Ledger",BITCOIN_CASH:"Bitcoin Cash",CARDANO:"Cardano",STELLAR:"Stellar"};

export function assetLogo(code:string,size=32){
  return ROUTE_TOKENS.has(code)?<Image src={`/branding/tokens/${TOKEN_IMAGE[code]??code}.png`} alt={code.replace("_",".")} width={size} height={size}/>:<Image src={`/branding/crypto/${code.toLowerCase()}.svg`} alt={code} width={size} height={size}/>;
}
export function networkLogo(code:string,size=32){
  const file=NETWORK_IMAGE[code];
  if(file)return <Image src={`/branding/networks/${file}.png`} alt={titleCase(code)} width={size} height={size}/>;
  const crypto=NATIVE_NETWORK_CRYPTO[code];
  if(crypto)return <Image src={`/branding/crypto/${crypto}.svg`} alt={titleCase(code)} width={size} height={size}/>;
  return <Image src={`/branding/crypto/${code.toLowerCase()}.svg`} alt={titleCase(code)} width={size} height={size}/>;
}
export function networkRailLabel(code:string){
  return NETWORK_RAIL[code]??titleCase(code);
}
export function fiatLogo(code:string,size=34){
  return <span className="route-option-logo fiat" suppressHydrationWarning><CircleFlag countryCode={FIAT_FLAG[code]??"un"} height={String(size)}/></span>;
}
function optionLogo(option:SelectOption,size=34){
  return option.kind==="fiat"?fiatLogo(option.value,size):<span className="route-option-logo">{option.kind==="network"?networkLogo(option.value,size):assetLogo(option.value,size)}</span>;
}

export function Field({label,hint,children,wide=false}:{label:string;hint?:string;children:React.ReactNode;wide?:boolean}){
  return <label className={`compliance-field${wide?" compliance-field-wide":""}`}><span>{label}</span>{children}{hint?<small>{hint}</small>:null}</label>;
}

export function ChoiceSelect({value,onChange,label,options}:{value:string;onChange:(value:string)=>void;label:string;options:Array<string|boolean>}){
  const [open,setOpen]=useState(false);
  const selected=options.find(item=>String(item)===value);
  return <>
    <button className="compliance-route-select-trigger compact-choice-trigger" type="button" onClick={()=>setOpen(true)} aria-label={`${label}: ${selected!==undefined?titleCase(String(selected)):`Choose ${label.toLowerCase()}`}`} aria-haspopup="dialog" aria-expanded={open}>
      <span>{selected!==undefined?<strong>{titleCase(String(selected))}</strong>:<span className="placeholder">Choose {label.toLowerCase()}</span>}</span>
      <IconChevronDown size={17}/>
    </button>
    <Modal open={open} onClose={()=>setOpen(false)} title={label} description={`Choose ${label.toLowerCase()}.`} className="compliance-selector-dialog">
      <div className="choice-option-list">{options.map(item=>{const key=String(item);return <button type="button" className={key===value?"selected":""} key={key} aria-pressed={key===value} onClick={()=>{onChange(key);setOpen(false);}}>{titleCase(key)}{key===value?<IconCheck size={16}/>:null}</button>;})}</div>
    </Modal>
  </>;
}

export function RouteSelect({label,value,options,onChange,placeholder,disabled=false}:{label:string;value:string;options:SelectOption[];onChange:(value:string)=>void;placeholder:string;disabled?:boolean}){
  const id=useId();
  const [open,setOpen]=useState(false),[query,setQuery]=useState("");
  const selected=options.find(item=>item.value===value);
  const visible=useMemo(()=>{
    const needle=query.trim().toLowerCase();
    if(!needle)return options;
    const rank=(item:SelectOption)=>item.value.toLowerCase()===needle?0:item.value.toLowerCase().startsWith(needle)?1:item.label.toLowerCase().startsWith(needle)?2:3;
    return options.filter(item=>`${item.value} ${item.label} ${item.detail}`.toLowerCase().includes(needle)).map((item,index)=>({item,index})).sort((a,b)=>rank(a.item)-rank(b.item)||a.index-b.index).map(({item})=>item);
  },[options,query]);
  return <div className="compliance-field">
    <span id={`${id}-label`}>{label}</span>
    <button className="compliance-route-select-trigger" type="button" disabled={disabled} onClick={()=>setOpen(true)} aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="dialog" aria-expanded={open}>
      {selected?<>{optionLogo(selected)}<span id={`${id}-value`}><strong>{selected.value}</strong>{" "}<small>{selected.label}</small></span></>:<span id={`${id}-value`} className="placeholder">{placeholder}</span>}
      <IconChevronDown size={17}/>
    </button>
    <Modal open={open} onClose={()=>{setOpen(false);setQuery("");}} title={label} description="Choose the route you want to configure." size="large" className="compliance-selector-dialog route-selector-dialog">
      <label className="country-search"><IconSearch size={18}/><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} aria-label={`Search ${label.toLowerCase()}`} placeholder={`Search ${label.toLowerCase()}`}/></label>
      <div className="compliance-selector-summary"><span>Available routes</span><strong>{visible.length}</strong></div>
      {visible.length===0
        ?<p className="route-option-empty" role="status">{query.trim()?`No matches for “${query.trim()}”. Try another ticker or name.`:"No routes available for this selection."}</p>
        :<div className="route-option-grid">{visible.map(item=><button type="button" className={item.value===value?"selected":""} key={item.value} aria-pressed={item.value===value} onClick={()=>{onChange(item.value);setOpen(false);setQuery("");}}>{optionLogo(item,38)}<span><strong>{item.value} · {item.label}</strong><small>{item.detail}</small></span>{item.value===value?<IconCheck size={18}/>:null}</button>)}</div>}
    </Modal>
  </div>;
}

export function applySelectedBank(form:BankForm|null,bank:SupportedBank,current:Record<string,string|boolean>){
  const bankCodeKey=payoutFieldKey(form,"bank_code"),bankNameKey=payoutFieldKey(form,"bank_name"),accountTypeKey=payoutFieldKey(form,"bank_account_type");
  return {...current,...(bankCodeKey?{[bankCodeKey]:bank.code??""}:{}),...(bankNameKey?{[bankNameKey]:bank.name}:{}),...(accountTypeKey&&bank.accountType?{[accountTypeKey]:bank.accountType}:{})};
}

function BankLogo({bank,size=19}:{bank?:SupportedBank|null;size?:number}){
  if(bank?.logoUrl)return <img className="bank-option-logo-image" src={bank.logoUrl} alt="" width={size} height={size} loading="lazy" referrerPolicy="no-referrer"/>;
  return <IconBuildingBank size={size}/>;
}

export function BankSelect({value,banks,onChange}:{value:string;banks:SupportedBank[];onChange:(bank:SupportedBank)=>void}){
  const [open,setOpen]=useState(false),[query,setQuery]=useState("");
  const selected=banks.find(bank=>bank.code===value||bank.name===value);
  const visible=useMemo(()=>{const needle=query.trim().toLowerCase();if(!needle)return banks;return banks.filter(bank=>`${bank.name} ${bank.code??""} ${bank.accountType??""}`.toLowerCase().includes(needle));},[banks,query]);
  return <>
    <button className="compliance-route-select-trigger bank-select-trigger" type="button" onClick={()=>setOpen(true)} aria-label={`Bank: ${selected?.name??"Choose a supported bank"}`} aria-haspopup="dialog" aria-expanded={open}>
      <span className="bank-option-logo"><BankLogo bank={selected}/></span>
      {selected?<span><strong>{selected.name}</strong><small>{[selected.code,selected.accountType].filter(Boolean).join(" · ")||"Supported bank"}</small></span>:<span className="placeholder">Choose a supported bank</span>}
      <IconChevronDown size={17}/>
    </button>
    <Modal open={open} onClose={()=>{setOpen(false);setQuery("");}} title="Choose your bank" description="Search the banks available for this payout currency." size="large" className="compliance-selector-dialog route-selector-dialog">
      <label className="country-search"><IconSearch size={18}/><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} aria-label="Search bank name or code" placeholder="Search bank name or code"/></label>
      <div className="compliance-selector-summary"><span>Supported banks</span><strong>{visible.length}</strong></div>
      <div className="route-option-grid bank-option-grid">{visible.map(bank=>{const selectedBank=bank.code===value||bank.name===value;return <button type="button" className={selectedBank?"selected":""} key={`${bank.code??""}-${bank.name}`} aria-pressed={selectedBank} onClick={()=>{onChange(bank);setOpen(false);setQuery("");}}><span className="bank-option-logo"><BankLogo bank={bank}/></span><span><strong>{bank.name}</strong><small>{[bank.code,bank.accountType].filter(Boolean).join(" · ")||"Available for payout"}</small></span>{selectedBank?<IconCheck size={18}/>:null}</button>;})}</div>
      {visible.length===0?<p className="bank-search-empty" role="status">{banks.length?"No supported bank matches your search.":"No banks are available for this payout currency."}</p>:null}
    </Modal>
  </>;
}

export function seedDetails(form:BankForm|null,currency:string){
  const values:Record<string,string|boolean>={currency};
  for(const [key,rule] of Object.entries(form?.accountDetailsSchema.properties??{})){
    if(key==="currency"||key==="third_party_details")continue;
    if(rule.enum?.length===1)values[key]=rule.enum[0];
  }
  return values;
}
