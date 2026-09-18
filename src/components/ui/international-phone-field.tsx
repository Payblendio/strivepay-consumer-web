"use client";
import {useId,useMemo,useState,type ClipboardEvent} from "react";
import {CircleFlag} from "react-circle-flags";
import {IconCheck,IconChevronDown,IconSearch} from "@tabler/icons-react";
import PhoneNumberInput,{type Country,type Value} from "react-phone-number-input/input";
import {getCountries,getCountryCallingCode,parsePhoneNumber} from "react-phone-number-input";
import countryLabels from "react-phone-number-input/locale/en";
import {Modal} from "./modal";

const countries=getCountries().map(code=>({code,name:countryLabels[code]??code,dial:`+${getCountryCallingCode(code)}`})).sort((a,b)=>a.name.localeCompare(b.name));
const filterCountries=(query:string)=>{const needle=query.trim().toLowerCase();return countries.filter(item=>`${item.name} ${item.code} ${item.dial}`.toLowerCase().includes(needle))};
const countryFromValue=(value?:Value,preferredCountry?:Country)=>{
  if(!value)return undefined;
  const normalized=String(value);
  const preferred=preferredCountry?countries.find(item=>item.code===preferredCountry):undefined;
  if(preferred&&normalized.startsWith(preferred.dial))return preferred.code;
  return [...countries].sort((a,b)=>b.dial.length-a.dial.length).find(item=>normalized.startsWith(item.dial))?.code;
};

export function InternationalPhoneField({country,value,onCountryChange,onChange,countryError,error,allowedCountries,className=""}:{country?:Country;value?:Value;onCountryChange:(country:Country)=>void;onChange:(value:Value|undefined)=>void;countryError?:string;error?:string;allowedCountries?:Country[];className?:string}){
  const fieldId=useId().replaceAll(":","");
  const[residenceOpen,setResidenceOpen]=useState(false),[residenceQuery,setResidenceQuery]=useState("");
  const[phoneOpen,setPhoneOpen]=useState(false),[phoneQuery,setPhoneQuery]=useState(""),[phoneCountry,setPhoneCountry]=useState<Country|undefined>();
  const effectivePhoneCountry=phoneCountry??countryFromValue(value,country)??country;
  const residence=countries.find(item=>item.code===country),phoneRegion=countries.find(item=>item.code===effectivePhoneCountry);
  const residenceOptions=useMemo(()=>{const allowed=allowedCountries?.length?new Set(allowedCountries):null;return filterCountries(residenceQuery).filter(item=>!allowed||allowed.has(item.code))},[residenceQuery,allowedCountries]),phoneOptions=useMemo(()=>filterCountries(phoneQuery),[phoneQuery]);
  const modalClassName=className.includes("compliance")?"compliance-selector-dialog":className.includes("access")?"access-selector-dialog":"";
  function choosePhoneCountry(next:Country){setPhoneCountry(next);onChange(undefined);setPhoneOpen(false);setPhoneQuery("")}
  function pasteInternationalPhone(event:ClipboardEvent<HTMLDivElement>){
    if(!(event.target instanceof HTMLInputElement)||event.target.id!==`${fieldId}-phone`)return;
    const pasted=event.clipboardData.getData("text").trim();
    if(!pasted.startsWith("+"))return;
    const parsed=parsePhoneNumber(pasted);
    if(!parsed)return;
    const nextCountry=parsed.country??countryFromValue(parsed.number,effectivePhoneCountry);
    if(!nextCountry)return;
    event.preventDefault();
    setPhoneCountry(nextCountry);
    onChange(parsed.number);
  }
  return <div className={`international-phone-fields ${className}`.trim()} onPasteCapture={pasteInternationalPhone}>
    <div className={`auth-field${countryError?" invalid":""}`}><div className="auth-label-row"><label htmlFor={`${fieldId}-residence`}>Country of residence</label></div><button id={`${fieldId}-residence`} className="phone-country-trigger" type="button" onClick={()=>setResidenceOpen(true)} aria-haspopup="dialog" aria-expanded={residenceOpen} aria-describedby={countryError?`${fieldId}-country-error`:undefined}>{residence?<><span className="country-flag"><CircleFlag countryCode={residence.code.toLowerCase()} height="38"/></span><span><strong>{residence.name}</strong><small>{residence.code} · Country of residence</small></span></>:<span className="phone-country-placeholder">Select your country of residence</span>}<IconChevronDown size={18} stroke={2.2}/></button>{countryError&&<small id={`${fieldId}-country-error`}>{countryError}</small>}</div>
    <div className={`auth-field${error?" invalid":""}`}><div className="auth-label-row"><label htmlFor={`${fieldId}-phone`}>Phone number</label></div><div className={`auth-input phone-number-control${!country?" disabled":""}`}><button className="phone-prefix-trigger" type="button" disabled={!country} onClick={()=>setPhoneOpen(true)} aria-label="Change phone country" aria-haspopup="dialog" aria-expanded={phoneOpen}>{phoneRegion?<><span className="phone-input-flag"><CircleFlag countryCode={phoneRegion.code.toLowerCase()} height="28"/></span><strong>{phoneRegion.dial}</strong><IconChevronDown size={15}/></>:<span>Code</span>}</button><PhoneNumberInput id={`${fieldId}-phone`} defaultCountry={effectivePhoneCountry} value={value} onChange={next=>{const region=next?parsePhoneNumber(next)?.country:undefined;if(region)setPhoneCountry(region);onChange(next)}} disabled={!effectivePhoneCountry} placeholder={effectivePhoneCountry?"Enter phone number":"Select a country first"} autoComplete="tel" aria-invalid={Boolean(error)} aria-describedby={error?`${fieldId}-phone-error`:`${fieldId}-phone-hint`}/></div>{error&&<small id={`${fieldId}-phone-error`}>{error}</small>}<span className="phone-helper" id={`${fieldId}-phone-hint`}>The phone country can be different from your country of residence.</span></div>
    <CountryModal open={residenceOpen} onClose={()=>{setResidenceOpen(false);setResidenceQuery("");}} title="Country of residence" description="Choose the country where you currently live." query={residenceQuery} setQuery={setResidenceQuery} options={residenceOptions} selected={country} onSelect={next=>{onCountryChange(next);setResidenceOpen(false);setResidenceQuery("")}} className={modalClassName}/>
    <CountryModal open={phoneOpen} onClose={()=>{setPhoneOpen(false);setPhoneQuery("");}} title="Phone country code" description="Choose the country that issued this phone number." query={phoneQuery} setQuery={setPhoneQuery} options={phoneOptions} selected={effectivePhoneCountry} onSelect={choosePhoneCountry} className={modalClassName}/>
  </div>
}

function CountryModal({open,onClose,title,description,query,setQuery,options,selected,onSelect,className=""}:{open:boolean;onClose:()=>void;title:string;description:string;query:string;setQuery:(value:string)=>void;options:typeof countries;selected?:Country;onSelect:(country:Country)=>void;className?:string}){
  const isCompliance=className.includes("compliance-selector-dialog");
  return <Modal open={open} onClose={onClose} title={title} description={description} size="large" className={className}>
    <label className="country-search"><IconSearch size={19}/><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} aria-label="Search country, code or dial prefix" placeholder="Search country, code or dial prefix"/></label>
    {isCompliance?<div className="compliance-selector-summary"><span>Available countries</span><strong>{options.length}</strong></div>:null}
    {options.length===0?<p className="route-option-empty" role="status">No countries match your search. Try a name, country code or dial prefix.</p>:<div className="country-grid phone-country-grid">{options.map(item=><button type="button" key={item.code} className={item.code===selected?"selected":""} aria-pressed={item.code===selected} onClick={()=>onSelect(item.code)}><span className="country-flag small"><CircleFlag countryCode={item.code.toLowerCase()} height="36"/></span><span><strong>{item.name}</strong>{" "}<small>{item.code} · {item.dial}</small></span>{item.code===selected&&<IconCheck className="country-check" size={19}/>}</button>)}</div>}
  </Modal>;
}
