"use client";
import {useMemo,useState} from "react";
import {CircleFlag} from "react-circle-flags";
import {IconCheck,IconChevronDown,IconSearch} from "@tabler/icons-react";
import {Modal} from "./modal";
// Showcase fallback only. Onboarding passes `options` from the Bakkt-backed jurisdiction list.
const COUNTRIES=[["NG","Nigeria","NGN"],["US","United States","USD"],["GB","United Kingdom","GBP"],["AE","United Arab Emirates","AED"],["DE","Germany","EUR"],["FR","France","EUR"],["ES","Spain","EUR"],["IT","Italy","EUR"],["NL","Netherlands","EUR"],["IE","Ireland","EUR"],["AT","Austria","EUR"],["BE","Belgium","EUR"],["DK","Denmark","DKK"],["FI","Finland","EUR"],["GR","Greece","EUR"],["NO","Norway","NOK"],["PL","Poland","PLN"],["PT","Portugal","EUR"],["SE","Sweden","SEK"],["AU","Australia","AUD"],["BR","Brazil","BRL"],["CA","Canada","CAD"],["IN","India","INR"],["JP","Japan","JPY"],["MX","Mexico","MXN"],["NZ","New Zealand","NZD"],["ZA","South Africa","ZAR"],["AR","Argentina","ARS"],["GH","Ghana","GHS"],["KE","Kenya","KES"],["PK","Pakistan","PKR"],["SG","Singapore","SGD"],["TR","Türkiye","TRY"],["UG","Uganda","UGX"],["TZ","Tanzania","TZS"],["ZM","Zambia","ZMW"],["RO","Romania","RON"]].map(([code,name,detail])=>({code,name,detail}));
export type CountryOption={code:string;name:string;detail?:string};
type CountrySelectProps={value?:string;onChange:(code:string)=>void;label?:string;className?:string;modalClassName?:string;options?:CountryOption[];placeholder?:string;error?:string};
export function CountrySelect({value,onChange,label="Country",className="",modalClassName="",options,placeholder="Choose your country",error}:CountrySelectProps){
  const[open,setOpen]=useState(false),[query,setQuery]=useState("");
  const list=options??COUNTRIES;
  const selected=list.find(country=>country.code===value);
  const visible=useMemo(()=>{const needle=query.toLowerCase();return list.filter(country=>`${country.code} ${country.name} ${country.detail??""}`.toLowerCase().includes(needle))},[query,list]);
  return <div className={`country-field${error?" invalid":""} ${className}`.trim()}>
    <label>{label}</label>
    <button className="country-trigger" type="button" onClick={()=>setOpen(true)}>{selected?<span><span className="country-flag"><CircleFlag countryCode={selected.code.toLowerCase()} height="42" /></span><span><strong>{selected.name}</strong><small>{selected.code}{selected.detail?` · ${selected.detail}`:""}</small></span></span>:<span className="placeholder">{placeholder}</span>}<IconChevronDown className="country-chevron" size={18} stroke={2.2}/></button>
    {error?<small role="alert">{error}</small>:null}
    <Modal open={open} onClose={()=>setOpen(false)} title="Choose your country" description="Search by country name or code." className={modalClassName}>
      <label className="country-search"><IconSearch size={19} stroke={2}/><input autoFocus placeholder="Search countries" value={query} onChange={event=>setQuery(event.target.value)}/></label>
      {visible.length===0?<p className="route-option-empty" role="status">{list.length===0?"Loading the countries we support…":"No countries match your search."}</p>:
      <div className="country-grid">{visible.map(country=><button type="button" key={country.code} className={country.code===value?"selected":""} onClick={()=>{onChange(country.code);setOpen(false);setQuery("")}}><span className="country-flag small"><CircleFlag countryCode={country.code.toLowerCase()} height="34" /></span><span><strong>{country.name}</strong><small>{country.code}{country.detail?` · ${country.detail}`:""}</small></span>{country.code===value&&<IconCheck className="country-check" size={19} stroke={2.4}/>}</button>)}</div>}
    </Modal>
  </div>;
}
