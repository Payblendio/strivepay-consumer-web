"use client";

import {FormEvent,useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import {
  IconArrowLeft,IconArrowRight,IconBuilding,IconExternalLink,IconFileCheck,
  IconFingerprint,IconId,IconLoader2,IconMail,IconRefresh,IconShieldCheck,
  IconMapPin,
} from "@tabler/icons-react";
import {isValidPhoneNumber,type Country,type Value} from "react-phone-number-input";
import {SumsubVerification} from "@/components/sumsub-verification";
import {DateOfBirthPicker} from "@/components/ui/date-of-birth-picker";
import {CountrySelect} from "@/components/ui/country-select";
import {InternationalPhoneField} from "@/components/ui/international-phone-field";
import {StatusIllustration} from "@/components/ui/status-state";
import {useToast} from "@/components/ui/toast";
import {customerFetch} from "@/lib/customer-session";
import {apiErrorMessage} from "@/lib/api-error";
import {addressCharacterError} from "@/lib/address-characters";
import {useJurisdictions} from "@/lib/jurisdictions";

type Customer={givenName:string;familyName:string;email:string;country:string;phoneE164?:string|null};
type Status={partyId?:string;onboardingStatus:string;complianceStatus:string;accountStatus?:string|null;actionRequired?:string|null};
type LegalDocument={id:string;type:string;version:string;url:string};
type Step={title:string;detail:string;icon:React.ReactNode};
type AddressDraft={addressLine1:string;addressLine2:string;postCode:string;city:string};
type PersonalDraft={firstName:string;lastName:string;country:Country;dateOfBirth:string;phone:string;identityNumber:string;address:AddressDraft;mailingSame:boolean;mailingAddress:AddressDraft;annualIncomeRange:string;investmentObjective:string;sourceOfFunds:string};
type LocalProfile={firstName:string;lastName:string;email:string;phone?:string|null;country:string;dateOfBirth?:string|null;address?:AddressDraft|null;mailingSame:boolean;mailingAddress?:AddressDraft|null;annualIncomeRange?:string|null;investmentObjective?:string|null;sourceOfFunds?:string|null};
type Coverage={countries:Array<{code:string;individualSupported:boolean}>};
type PostcodeRule={country:string;regex:string;fixedValue?:string|null};

const REQUIRED_LEGAL=new Set(["TERMS_AND_CONDITIONS","PRIVACY_POLICY","TERMS_OF_SERVICE"]);
const APPROVED_PERSONAL=new Set(["FULL_USER"]);
const PENDING_PERSONAL=new Set(["KYC_PENDING"]);

class JourneyError extends Error{status:number;type?:string;constructor(message:string,status:number,type?:string){super(message);this.status=status;this.type=type;}}
function validPostcode(value:string,rule:PostcodeRule|null){if(!rule)return true;try{return new RegExp(`^(?:${rule.regex})$`,"i").test(value.trim());}catch{return false;}}

async function api<T>(path:string,init:RequestInit={}):Promise<T>{
  const response=await customerFetch(`/api/onboarding${path}`,{...init,headers:{Accept:"application/json",...init.headers}});
  const value=response.status===204?null:await response.json().catch(()=>null);
  if(!response.ok)throw new JourneyError(apiErrorMessage(value,"That step could not be completed"),response.status,typeof value==="object"&&value&&"type" in value?String((value as {type?:string}).type):undefined);
  return value as T;
}

function useLegalDocuments(){
  const [state,setState]=useState<{status:"loading"|"ready"|"error";documents:LegalDocument[]}>({status:"loading",documents:[]});
  const request=useRef(0);
  const load=useCallback(()=>{
    const current=++request.current;
    return api<LegalDocument[]>("/legal-documents").then(documents=>{
      if(!Array.isArray(documents)||documents.some(document=>!document||[document.id,document.type,document.version,document.url].some(value=>typeof value!=="string")))throw new Error("Invalid agreement response");
      if(current===request.current)setState({status:"ready",documents:documents.filter(document=>REQUIRED_LEGAL.has(document.type))});
    }).catch(()=>{if(current===request.current)setState({status:"error",documents:[]});});
  },[]);
  useEffect(()=>{void load();return ()=>{request.current+=1;};},[load]);
  const retry=()=>{setState({status:"loading",documents:[]});void load();};
  const ready=state.status==="ready"&&(state.documents.length===0||new Set(state.documents.map(document=>document.type)).size===REQUIRED_LEGAL.size);
  return {...state,ready,retry};
}

function AgreementReview({legal,consent,onConsent,companyName}:{legal:ReturnType<typeof useLegalDocuments>;consent:boolean;onConsent:(value:boolean)=>void;companyName?:string}){
  if(legal.status==="loading")return <div className="compliance-loading" role="status"><IconLoader2 className="spin" aria-hidden="true"/>Loading agreements…</div>;
  if(!legal.ready)return <div>
    <p className="compliance-form-copy" role="status">{legal.status==="error"?"Agreements could not be loaded. Please retry.":"The full agreement set is not available yet. Retry or contact support."}</p>
    <button className="compliance-secondary" type="button" onClick={()=>{onConsent(false);legal.retry();}}><IconRefresh size={16}/>Retry agreements</button>
  </div>;
  if(legal.documents.length===0)return <p className="compliance-form-copy">No agreements were returned for this step.</p>;
  return <>
    <p className="compliance-form-copy">{companyName?`Accept the current agreements for ${companyName}.`:"Read the current agreements. One acceptance covers all three."}</p>
    <div className="compliance-documents">{legal.documents.map(document=><a href={document.url} target="_blank" rel="noreferrer" key={document.id}><IconFileCheck size={18}/><span>{document.type.replaceAll("_"," ").toLowerCase()}</span><small>v{document.version}</small><IconExternalLink size={14}/></a>)}</div>
    <label className="compliance-consent"><input type="checkbox" checked={consent} onChange={event=>onConsent(event.target.checked)}/><span>{companyName?"I can accept these agreements for the company.":"I accept the terms, privacy policy and service agreement."}</span></label>
  </>;
}

function Field({label,hint,children}:{label:string;hint?:string;children:React.ReactNode}){
  return <label className="compliance-field"><span>{label}</span>{children}{hint?<small>{hint}</small>:null}</label>;
}

function useJourneyError(){
  const {show}=useToast();
  return useCallback((message:string)=>{if(message)show({tone:"danger",title:"Check this step",message});},[show]);
}

function JourneyBody({eyebrow,title,statusLabel,steps,active,children,aside,focusMode}:{eyebrow:string;title:string;statusLabel:string;steps:Step[];active:number;children:React.ReactNode;aside?:React.ReactNode;focusMode?:boolean}){
  const total=steps.length;
  const stepIndex=Math.min(Math.max(active,0),Math.max(total-1,0));
  const showProgress=active>=0&&active<total;
  if(focusMode)return <div className="compliance-idv-focus" role="dialog" aria-label="Identity verification">{children}</div>;
  return <div className="compliance-window-body compliance-journey-body compliance-journey-simple">
    <section className="compliance-form-panel">
      <header className="compliance-form-heading"><div><span>{eyebrow}</span><h2>{title}</h2></div><p><i className={statusLabel==="Complete"?"complete":""}/>{statusLabel}</p></header>
      {showProgress?<div className="compliance-journey-progress" aria-label={`Step ${stepIndex+1} of ${total}`}>
        <div className="compliance-journey-progress-meta"><strong>Step {stepIndex+1} of {total}</strong><span>{steps[stepIndex]?.title}</span></div>
        <div className="compliance-journey-progress-track" aria-hidden="true"><span style={{width:`${((stepIndex+1)/total)*100}%`}}/></div>
      </div>:null}
      {children}
      {aside}
    </section>
  </div>;
}

const personalSteps:Step[]=[
  {title:"Your profile",detail:"The essentials.",icon:<IconId size={18}/>},
  {title:"Home address",detail:"Where you live.",icon:<IconMapPin size={18}/>},
  {title:"Money purpose",detail:"How you plan to use StrivePay.",icon:<IconBuilding size={18}/>},
  {title:"Agreements",detail:"Read and accept.",icon:<IconFileCheck size={18}/>},
  {title:"Email code",detail:"Secure this session.",icon:<IconMail size={18}/>},
  {title:"Identity check",detail:"Finish verification.",icon:<IconFingerprint size={18}/>},
];

function PersonalJourney({customer,ownerMode,memberMode,onApproved,onProfileSaved}:{customer:Customer;ownerMode?:boolean;memberMode?:boolean;onApproved?:()=>void;onProfileSaved?:(profile:Customer)=>void}){
  const [active,setActive]=useState(0),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [status,setStatus]=useState<Status|null>(null);
  const legal=useLegalDocuments(),documents=legal.documents;
  const setError=useJourneyError();
  const [consent,setConsent]=useState(false),[otp,setOtp]=useState(""),[otpSent,setOtpSent]=useState(false),[sessionVerified,setSessionVerified]=useState(false),[cooldown,setCooldown]=useState(0);
  const [identityToken,setIdentityToken]=useState(""),[submitted,setSubmitted]=useState(false),[repairingApplicant,setRepairingApplicant]=useState(false),[applicantReady,setApplicantReady]=useState(false);
  const initialCountry=customer.country.toUpperCase() as Country;
  const emptyAddress:AddressDraft={addressLine1:"",addressLine2:"",postCode:"",city:""};
  const [allowedCountries,setAllowedCountries]=useState<Country[]>([initialCountry]);
  const [postcodeRule,setPostcodeRule]=useState<PostcodeRule|null>(null);
  const [draft,setDraft]=useState<PersonalDraft>({firstName:customer.givenName,lastName:customer.familyName,country:initialCountry,dateOfBirth:"",phone:customer.phoneE164??"",identityNumber:"",address:{...emptyAddress},mailingSame:true,mailingAddress:{...emptyAddress},annualIncomeRange:"",investmentObjective:"",sourceOfFunds:""});
  const identityLabel=draft.country==="NG"?"BVN":draft.country==="US"?"SSN":null;

  const refreshStatus=useCallback(async(silent=false)=>{
    try{
      const response=await api<Status>("");setStatus(response);
      if(APPROVED_PERSONAL.has(response.complianceStatus)){setActive(6);onApproved?.();}
      else if(PENDING_PERSONAL.has(response.complianceStatus)){setActive(6);setSubmitted(true);}
      else setActive(5);
    }catch(problem){if(!(problem instanceof JourneyError&&problem.status===400)&&!silent)setError(problem instanceof Error?problem.message:"Could not load your progress");}
  },[onApproved,setError]);

  useEffect(()=>{void (async()=>{
    const [profile,coverage,currentSession]=await Promise.all([
      api<LocalProfile>("/local-profile").catch(()=>null),
      api<Coverage>("/coverage").catch(()=>null),
      api<{active:boolean;expiresAt:string}|null>("/session").catch(()=>null),
    ]);
    if(profile){const country=profile.country.toUpperCase() as Country;setDraft(current=>({...current,firstName:profile.firstName,lastName:profile.lastName,phone:profile.phone??current.phone,country,dateOfBirth:profile.dateOfBirth??current.dateOfBirth,address:profile.address??current.address,mailingSame:profile.mailingSame,mailingAddress:profile.mailingAddress??current.mailingAddress,annualIncomeRange:profile.annualIncomeRange??current.annualIncomeRange,investmentObjective:profile.investmentObjective??current.investmentObjective,sourceOfFunds:profile.sourceOfFunds??current.sourceOfFunds}));}
    const supported=coverage?.countries.filter(item=>item.individualSupported).map(item=>item.code.toUpperCase() as Country)??[];if(supported.length)setAllowedCountries(supported);
    setSessionVerified(Boolean(currentSession?.active));
    await refreshStatus(true);setLoading(false);
  })();},[refreshStatus]);

  useEffect(()=>{if(cooldown<=0)return;const timer=window.setInterval(()=>setCooldown(value=>Math.max(0,value-1)),1000);return()=>window.clearInterval(timer);},[cooldown]);
  useEffect(()=>{let current=true;void api<PostcodeRule>(`/postcode/${draft.country}`).then(rule=>{if(!current)return;setPostcodeRule(rule);if(rule.fixedValue)setDraft(value=>({...value,address:{...value.address,postCode:rule.fixedValue??""},mailingAddress:{...value.mailingAddress,postCode:rule.fixedValue??""}}));}).catch(()=>{if(current)setPostcodeRule(null)});return()=>{current=false};},[draft.country]);
  useEffect(()=>{if(active!==6||status&&APPROVED_PERSONAL.has(status.complianceStatus))return;const timer=window.setInterval(()=>void refreshStatus(true),10000);return()=>window.clearInterval(timer);},[active,status,refreshStatus]);

  const update=<K extends keyof PersonalDraft,>(key:K,value:PersonalDraft[K])=>setDraft(current=>({...current,[key]:value}));
  const updateAddress=(scope:"address"|"mailingAddress",key:keyof AddressDraft,value:string)=>setDraft(current=>({...current,[scope]:{...current[scope],[key]:value}}));
  const back=()=>{setError("");setActive(value=>Math.max(0,value-1));};
  const addressPayload=(value:AddressDraft)=>({addressLine1:value.addressLine1,addressLine2:value.addressLine2||undefined,postCode:value.postCode,city:value.city,country:draft.country});
  const localPayload=()=>({firstName:draft.firstName,lastName:draft.lastName,phone:draft.phone,country:draft.country,dateOfBirth:draft.dateOfBirth,address:draft.address.addressLine1?addressPayload(draft.address):undefined,mailingSame:draft.mailingSame,mailingAddress:!draft.mailingSame&&draft.mailingAddress.addressLine1?addressPayload(draft.mailingAddress):undefined,annualIncomeRange:draft.annualIncomeRange||undefined,investmentObjective:draft.investmentObjective||undefined,sourceOfFunds:draft.sourceOfFunds||undefined});
  const verificationPayload=()=>({firstName:draft.firstName,lastName:draft.lastName,email:customer.email,country:draft.country,dateOfBirth:draft.dateOfBirth,phone:draft.phone,bvn:draft.country==="NG"?draft.identityNumber:undefined,ssn:draft.country==="US"?draft.identityNumber:undefined,address:addressPayload(draft.address),mailingAddress:draft.mailingSame?addressPayload(draft.address):addressPayload(draft.mailingAddress),annualIncomeRange:draft.annualIncomeRange,investmentObjective:draft.investmentObjective,sourceOfFunds:draft.sourceOfFunds});
  async function profileNext(event:FormEvent){event.preventDefault();const identityMissing=identityLabel&&(!draft.identityNumber||(identityLabel==="BVN"&&draft.identityNumber.length!==11)||(identityLabel==="SSN"&&draft.identityNumber.length!==9));if(!draft.firstName.trim()||!draft.lastName.trim()||!draft.dateOfBirth||!draft.phone||!isValidPhoneNumber(draft.phone)||identityMissing){setError(identityLabel?`Check your name, date of birth, phone and ${identityLabel}.` :"Check your name, date of birth and phone.");return;}setBusy(true);setError("");try{const saved=await api<LocalProfile>("/local-profile",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(localPayload())});onProfileSaved?.({givenName:saved.firstName,familyName:saved.lastName,email:saved.email,phoneE164:saved.phone,country:saved.country});setActive(repairingApplicant?2:1);}catch(problem){setError(problem instanceof Error?problem.message:"Your profile could not be saved");}finally{setBusy(false);}}
  async function addressNext(event:FormEvent){event.preventDefault();const characterError=addressCharacterError(draft.address,"Residential address")||(!draft.mailingSame?addressCharacterError(draft.mailingAddress,"Mailing address"):null);if(characterError){setError(characterError);return;}if(!draft.address.addressLine1.trim()||!draft.address.city.trim()||!draft.address.postCode.trim()||!draft.mailingSame&&(!draft.mailingAddress.addressLine1.trim()||!draft.mailingAddress.city.trim()||!draft.mailingAddress.postCode.trim())){setError("Add a complete residential and mailing address.");return;}if(!validPostcode(draft.address.postCode,postcodeRule)||!draft.mailingSame&&!validPostcode(draft.mailingAddress.postCode,postcodeRule)){setError(`Enter a valid ${draft.country} postcode.`);return;}setBusy(true);setError("");try{await api("/local-profile",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(localPayload())});setActive(2);}catch(problem){setError(problem instanceof Error?problem.message:"Your address could not be saved");}finally{setBusy(false);}}
  async function purposeNext(event:FormEvent){event.preventDefault();if(!draft.sourceOfFunds||!draft.annualIncomeRange||!draft.investmentObjective){setError("Choose your source of funds, income range and main goal");return;}setBusy(true);setError("");try{await api("/local-profile",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(localPayload())});setActive(3);}catch(problem){setError(problem instanceof Error?problem.message:"Your choices could not be saved");}finally{setBusy(false);}}

  const sendOtp=useCallback(async()=>{
    setBusy(true);setError("");
    try{await api<void>("/session/start",{method:"POST"});setOtpSent(true);setSessionVerified(false);setCooldown(30);}
    catch(problem){setError(problem instanceof Error?problem.message:"The code could not be sent");}
    finally{setBusy(false);}
  },[setError]);

  useEffect(()=>{if(active!==4||otpSent||sessionVerified)return;void sendOtp();},[active,otpSent,sessionVerified,sendOtp]);

  async function createProfile(){
    const characterError=addressCharacterError(draft.address,"Residential address")||(!draft.mailingSame?addressCharacterError(draft.mailingAddress,"Mailing address"):null);
    if(characterError){setError(characterError);setActive(1);return;}
    if(!legal.ready){setError("Load the current agreements before continuing.");return;}
    const hashesRequired=documents.length>0;
    if(hashesRequired&&documents.length<3){setError("Verification agreements are not ready. Contact support.");return;}
    if(hashesRequired&&!consent){setError("Accept the three agreements to continue");return;}
    setBusy(true);setError("");
    try{
      if(hashesRequired)await api("/legal-acceptances",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({documentIds:documents.map(item=>item.id)})});
      const created=await api<Status>("/profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(verificationPayload())});
      setStatus(created);setRepairingApplicant(false);setApplicantReady(true);setActive(4);setOtpSent(false);setSessionVerified(false);
    }catch(problem){setError(problem instanceof Error?problem.message:"Your profile could not be created");}
    finally{setBusy(false);}
  }

  async function verifyOtp(event:FormEvent){
    event.preventDefault();if(!sessionVerified&&!/^\d{6}$/.test(otp)){setError("Enter the 6-digit code from your verification email");return;}
    setBusy(true);setError("");
    try{
      if(!sessionVerified){await api<{verified:boolean}>("/session/otp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({otp})});setSessionVerified(true);setOtp("");}
      await api("/profile",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        firstName:draft.firstName,lastName:draft.lastName,phone:draft.phone,country:draft.country,
        address:addressPayload(draft.address),mailingAddress:draft.mailingSame?addressPayload(draft.address):addressPayload(draft.mailingAddress),
      })});
      setSessionVerified(false);setActive(5);
    }
    catch(problem){setError(problem instanceof Error?problem.message:"That code did not work");}
    finally{setBusy(false);}
  }

  async function startIdentity(){
    setBusy(true);setError("");
    try{
      let session;
      try{session=await api<{verificationToken:string}>("/identity-verification/session",{method:"POST"});}
      catch(problem){if(!(problem instanceof JourneyError&&problem.type==="identity_applicant_missing")||!applicantReady)throw problem;session=await api<{verificationToken:string}>("/identity-verification/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(verificationPayload())});}
      setApplicantReady(false);setDraft(value=>({...value,identityNumber:""}));setIdentityToken(session.verificationToken);
    }
    catch(problem){if(problem instanceof JourneyError&&problem.type==="identity_already_complete"){await refreshStatus(true);setActive(6);if(!ownerMode)onApproved?.();}else if(problem instanceof JourneyError&&problem.type==="verification_session_expired"){setSessionVerified(false);setOtpSent(false);setActive(4);setError("Send a new email code to continue.");}else if(problem instanceof JourneyError&&problem.type==="identity_applicant_missing"){setRepairingApplicant(true);setActive(identityLabel?0:2);setError(identityLabel?`Re-enter your ${identityLabel}, then add your source of funds.`:"Add your source of funds to continue.");}else setError(problem instanceof Error?problem.message:"The identity check could not start");}
    finally{setBusy(false);}
  }

  async function completeSimulation(){
    setBusy(true);setError("");
    try{const value=await api<Status>("/simulator/compliance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"FULL_USER"})});setStatus(value);setActive(6);onApproved?.();}
    catch(problem){setError(problem instanceof Error?problem.message:"The simulated check could not finish");}
    finally{setBusy(false);}
  }

  const idvSubmitted=useCallback(()=>{setIdentityToken("");setSubmitted(true);setActive(6);void refreshStatus(true);},[refreshStatus]);
  const idvError=useCallback((message:string)=>setError(message),[setError]);

  if(loading)return <JourneyBody eyebrow="Checking" title="Finding your place" statusLabel="Loading" steps={personalSteps} active={0}><div className="compliance-loading"><IconLoader2 className="spin"/>Loading your progress…</div></JourneyBody>;
  const approved=Boolean(status&&APPROVED_PERSONAL.has(status.complianceStatus));
  const statusLabel=approved?"Complete":active===6?"In review":active>0?"In progress":"Not started";

  const checkEyebrow=memberMode?"YOUR CHECK":ownerMode?"OWNER CHECK":"PERSONAL CHECK";
  const verifiedTitle=memberMode?"Identity verified":ownerMode?"Owner verified":"You’re verified";
  const idvFocus=Boolean(identityToken&&!identityToken.startsWith("sim-verification-"));
  return <JourneyBody eyebrow={checkEyebrow} title={approved?verifiedTitle:personalSteps[Math.min(active,5)].title} statusLabel={statusLabel} steps={personalSteps} active={active} focusMode={idvFocus}>
    {idvFocus?<div className="compliance-idv-focus-panel">
      <button type="button" className="compliance-secondary compliance-idv-close" onClick={()=>setIdentityToken("")}><IconArrowLeft size={16}/> Close</button>
      <SumsubVerification token={identityToken} onSubmitted={idvSubmitted} onError={idvError}/>
    </div>:null}
    {!idvFocus&&active===0?<form className="compliance-form" onSubmit={profileNext} noValidate>
      <p className="compliance-form-copy">{memberMode?"Confirm your details for company financial access.":"Check these details before verification."}</p>
      <div className={`compliance-form-grid${identityLabel?"":" compliance-form-grid-no-identity"}`}>
        <Field label="First name"><input autoComplete="given-name" value={draft.firstName} onChange={event=>update("firstName",event.target.value)} required/></Field>
        <Field label="Last name"><input autoComplete="family-name" value={draft.lastName} onChange={event=>update("lastName",event.target.value)} required/></Field>
        <div className="compliance-field"><span>Date of birth</span><DateOfBirthPicker value={draft.dateOfBirth} onChange={value=>update("dateOfBirth",value)}/></div>
        {identityLabel?<Field label={identityLabel}><input type="password" inputMode="numeric" autoComplete="off" maxLength={identityLabel==="BVN"?11:9} value={draft.identityNumber} onChange={event=>update("identityNumber",event.target.value.replace(/\D/g,""))} required/></Field>:null}
        <InternationalPhoneField className="compliance-phone-country" country={draft.country} value={draft.phone as Value} allowedCountries={allowedCountries} onCountryChange={country=>setDraft(current=>country===current.country?current:{...current,country,identityNumber:"",address:{...emptyAddress},mailingSame:true,mailingAddress:{...emptyAddress}})} onChange={value=>update("phone",value??"")} error={draft.phone&&!isValidPhoneNumber(draft.phone)?"Enter a valid international phone number.":undefined}/>
      </div>
      <div className="compliance-form-actions"><button className="compliance-primary" type="submit" disabled={busy}>{busy?<IconLoader2 className="spin" size={17}/>:null}Save and continue <IconArrowRight size={17}/></button></div>
    </form>:null}

    {!idvFocus&&active===1?<form className="compliance-form" onSubmit={addressNext} noValidate>
      <p className="compliance-form-copy">Use the home address on your verification document.</p>
      <div className="compliance-address-heading"><span><IconMapPin size={17}/>Residential address</span><b>{draft.country}</b></div>
      <div className="compliance-form-grid">
        <Field label="Address line 1"><input autoComplete="address-line1" value={draft.address.addressLine1} onChange={event=>updateAddress("address","addressLine1",event.target.value)} required/></Field>
        <Field label="Address line 2" hint="Optional"><input autoComplete="address-line2" value={draft.address.addressLine2} onChange={event=>updateAddress("address","addressLine2",event.target.value)}/></Field>
        <Field label="City"><input autoComplete="address-level2" value={draft.address.city} onChange={event=>updateAddress("address","city",event.target.value)} required/></Field>
        <Field label="Postcode" hint={postcodeRule?.fixedValue?`Use ${postcodeRule.fixedValue} for ${draft.country} addresses.`:`Use the ${draft.country} postal format.`}><input autoComplete="postal-code" value={draft.address.postCode} readOnly={Boolean(postcodeRule?.fixedValue)} onChange={event=>updateAddress("address","postCode",event.target.value.toUpperCase())} required/></Field>
      </div>
      <label className="compliance-consent compliance-mailing-toggle"><input type="checkbox" checked={draft.mailingSame} onChange={event=>update("mailingSame",event.target.checked)}/><span>Mailing address is the same.</span></label>
      {!draft.mailingSame?<><div className="compliance-address-heading"><span><IconMail size={17}/>Mailing address</span><b>{draft.country}</b></div><div className="compliance-form-grid">
        <Field label="Address line 1"><input value={draft.mailingAddress.addressLine1} onChange={event=>updateAddress("mailingAddress","addressLine1",event.target.value)} required/></Field>
        <Field label="Address line 2" hint="Optional"><input value={draft.mailingAddress.addressLine2} onChange={event=>updateAddress("mailingAddress","addressLine2",event.target.value)}/></Field>
        <Field label="City"><input value={draft.mailingAddress.city} onChange={event=>updateAddress("mailingAddress","city",event.target.value)} required/></Field>
        <Field label="Postcode"><input value={draft.mailingAddress.postCode} readOnly={Boolean(postcodeRule?.fixedValue)} onChange={event=>updateAddress("mailingAddress","postCode",event.target.value.toUpperCase())} required/></Field>
      </div></>:null}
      <div className="compliance-form-actions"><button className="compliance-secondary" type="button" onClick={back}><IconArrowLeft size={17}/> Back</button><button className="compliance-primary" type="submit" disabled={busy}>{busy?<IconLoader2 className="spin" size={17}/>:null}Save address <IconArrowRight size={17}/></button></div>
    </form>:null}

    {!idvFocus&&active===2?<form className="compliance-form" onSubmit={purposeNext} noValidate>
      <p className="compliance-form-copy">{memberMode?"Tell us how you plan to fund and use this company account.":"Tell us how you plan to fund and use your account."}</p>
      <div className="compliance-form-grid compliance-purpose-grid">
        <Field label="Source of funds"><select value={draft.sourceOfFunds} onChange={e=>update("sourceOfFunds",e.target.value)} required><option value="">Choose a source</option><option value="SALARY">Salary</option><option value="BUSINESS_INCOME">Business income</option><option value="PENSION">Pension</option><option value="OTHER">Other</option></select></Field>
        <Field label="Annual income"><select value={draft.annualIncomeRange} onChange={e=>update("annualIncomeRange",e.target.value)} required><option value="">Choose a range</option><option value="UNDER_25K">Under $25k</option><option value="FROM_25K_TO_50K">$25k – $50k</option><option value="FROM_50K_TO_100K">$50k – $100k</option><option value="FROM_100K_TO_200K">$100k – $200k</option><option value="FROM_200K_TO_300K">$200k – $300k</option><option value="FROM_300K_TO_500K">$300k – $500k</option><option value="FROM_500K_TO_1M">$500k – $1m</option><option value="FROM_1M_TO_5M">$1m – $5m</option><option value="OVER_5M">Over $5m</option></select></Field>
        <Field label="Investment objective"><select value={draft.investmentObjective} onChange={e=>update("investmentObjective",e.target.value)} required><option value="">Choose an objective</option><option value="BALANCED">Balanced</option><option value="CAPITAL_PRESERVATION">Capital preservation</option><option value="GROWTH">Growth</option><option value="INCOME">Income</option><option value="SPECULATION">Speculation</option><option value="OTHER">Other</option></select></Field>
      </div>
      <div className="compliance-form-actions"><button className="compliance-secondary" type="button" onClick={back}><IconArrowLeft size={17}/> Back</button><button className="compliance-primary" type="submit" disabled={busy}>{busy?<IconLoader2 className="spin" size={17}/>:null}Continue <IconArrowRight size={17}/></button></div>
    </form>:null}

    {!idvFocus&&active===3?<div className="compliance-form">
      <AgreementReview legal={legal} consent={consent} onConsent={setConsent}/>
      <div className="compliance-form-actions"><button className="compliance-secondary" type="button" onClick={back}><IconArrowLeft size={17}/> Back</button><button className="compliance-primary" type="button" disabled={busy||!legal.ready} onClick={()=>void createProfile()}>{busy?<IconLoader2 className="spin" size={17}/>:null}{documents.length>0?"Create profile":"Continue to verification"}</button></div>
    </div>:null}

    {!idvFocus&&active===4?<form className="compliance-form compliance-otp-form" onSubmit={verifyOtp} noValidate>
      <span className="compliance-form-emblem"><IconMail size={28}/></span><h3>Check your email</h3><p className="compliance-form-copy">{otpSent?<>Enter the 6-digit code sent to <strong>{customer.email}</strong>.</>:<>We’ll send a security code to <strong>{customer.email}</strong>. Tap Send code to continue.</>}</p>
      {!otpSent?<button className="compliance-primary" type="button" disabled={busy} onClick={()=>void sendOtp()}>{busy?<IconLoader2 className="spin" size={17}/>:null}Send code</button>:sessionVerified?<><p className="compliance-form-copy">Code verified. Continue to finish your secure profile.</p><div className="compliance-form-actions"><button className="compliance-primary" type="submit" disabled={busy}>{busy?<IconLoader2 className="spin" size={17}/>:null}Continue</button></div></>:<>
        <input className="compliance-otp" aria-label="Email verification code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,""))} autoFocus/>
        <div className="compliance-form-actions"><button className="compliance-link-button" type="button" disabled={cooldown>0||busy} onClick={()=>void sendOtp()}>{cooldown>0?`Resend in ${cooldown}s`:"Send a new code"}</button><button className="compliance-primary" type="submit" disabled={busy}>{busy?<IconLoader2 className="spin" size={17}/>:null}Verify code</button></div>
      </>}
    </form>:null}

    {!idvFocus&&active===5?<div className="compliance-form">
      {!identityToken&&status?.complianceStatus==="KYC_NEEDED"?<button className="compliance-secondary" type="button" disabled={busy} onClick={()=>{setError("");setActive(1);}}>Review address</button>:null}
      {!identityToken?<div className="compliance-idv-intro"><span className="compliance-form-emblem"><IconFingerprint size={30}/></span><h3>One secure identity check</h3><p className="compliance-form-copy">Have a valid ID ready. Your documents are checked securely.</p><button className="compliance-primary" type="button" disabled={busy} onClick={()=>void startIdentity()}>{busy?<IconLoader2 className="spin" size={17}/>:null}Start identity check <IconArrowRight size={17}/></button></div>:identityToken.startsWith("sim-verification-")?<div className="compliance-idv-intro"><span className="compliance-form-emblem"><IconShieldCheck size={30}/></span><h3>Simulator check ready</h3><p className="compliance-form-copy">No identity document is collected in local simulator mode.</p><button className="compliance-primary" type="button" disabled={busy} onClick={()=>void completeSimulation()}>{busy?<IconLoader2 className="spin" size={17}/>:null}Complete simulated check</button></div>:null}
    </div>:null}

    {!idvFocus&&active===6?<div className="compliance-complete compliance-complete-centered">
      {approved?<StatusIllustration status="kyc" size={168}/>:<span className="pending"><IconRefresh size={28}/></span>}
      <h3>{approved?(memberMode?"Identity verified":ownerMode?"You’re verified":"You’re verified"):"We’re checking your details"}</h3>
      <p>{approved?(memberMode?"Next, open Accounts to set your personal money routes.":ownerMode?"Next, finish the company record.":"Next, open Accounts to set pay-in and payout routes."):submitted?"You can leave this page. We’ll keep your place.":"Your check is still being processed."}</p>
      <div className="compliance-form-actions">{!approved?<button className="compliance-secondary" type="button" onClick={()=>void refreshStatus()}><IconRefresh size={16}/> Refresh status</button>:ownerMode?<button className="compliance-primary" type="button" onClick={()=>onApproved?.()}>Continue to company <IconArrowRight size={17}/></button>:memberMode?<button className="compliance-primary" type="button" onClick={()=>onApproved?.()}>Continue <IconArrowRight size={17}/></button>:<Link className="compliance-primary" href="/dashboard/accounts">Set up accounts <IconArrowRight size={17}/></Link>}</div>
    </div>:null}
  </JourneyBody>;
}

const companySteps:Step[]=[
  {title:"Company record",detail:"Legal registration.",icon:<IconBuilding size={18}/>},
  {title:"Company details",detail:"Contact and registered address.",icon:<IconMapPin size={18}/>},
  {title:"Agreements",detail:"Accept for the company.",icon:<IconFileCheck size={18}/>},
  {title:"Company check",detail:"Complete company verification.",icon:<IconShieldCheck size={18}/>},
];

type CompanyDraft={legalName:string;registrationNumber:string;incorporationCountry:string;businessType:string;contactName:string;contactEmail:string;contactPhone:string;addressLine1:string;addressLine2:string;postCode:string;city:string};

function CompanyJourney({customer,onApproved}:{customer:Customer;onApproved?:()=>void}){
  const [active,setActive]=useState(0),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[consent,setConsent]=useState(false);
  const setError=useJourneyError();
  const [status,setStatus]=useState<Status|null>(null),[verificationUrl,setVerificationUrl]=useState(""),[postcodeRule,setPostcodeRule]=useState<PostcodeRule|null>(null);
  const legal=useLegalDocuments(),documents=legal.documents;
  const {jurisdictions}=useJurisdictions();
  const corporateCountries=(jurisdictions??[]).filter(item=>item.corporateSupported).map(item=>({code:item.code,name:item.name}));
  const [draft,setDraft]=useState<CompanyDraft>({legalName:"",registrationNumber:"",incorporationCountry:customer.country.toUpperCase(),businessType:"",contactName:`${customer.givenName} ${customer.familyName}`,contactEmail:customer.email,contactPhone:customer.phoneE164??"",addressLine1:"",addressLine2:"",postCode:"",city:""});
  const approved=status?.complianceStatus==="ACTIVE";
  const update=(key:keyof CompanyDraft,value:string)=>setDraft(current=>({...current,[key]:value}));
  const refresh=useCallback(async()=>{try{const value=await api<Status>("/business/status");setStatus(value);if(value.complianceStatus==="KYB_PENDING")setActive(4);}catch(problem){if(!(problem instanceof JourneyError&&problem.status===400))setError(problem instanceof Error?problem.message:"Could not load company progress");}},[setError]);

  useEffect(()=>{void (async()=>{
    const profile=await api<{legalName:string;registrationNumber:string;country?:string|null}|null>("/business/profile").catch(()=>null);
    if(profile){setDraft(current=>({...current,legalName:profile.legalName,registrationNumber:profile.registrationNumber,incorporationCountry:profile.country?.toUpperCase()||current.incorporationCountry}));setActive(1);await refresh();}
    setLoading(false);
  })();},[refresh]);
  useEffect(()=>{let current=true;void api<PostcodeRule>(`/postcode/${draft.incorporationCountry}`).then(rule=>{if(!current)return;setPostcodeRule(rule);if(rule.fixedValue)setDraft(value=>({...value,postCode:rule.fixedValue??""}));}).catch(()=>{if(current)setPostcodeRule(null)});return()=>{current=false};},[draft.incorporationCountry]);
  useEffect(()=>{if(active!==4||approved)return;const timer=window.setInterval(()=>void refresh(),12000);return()=>window.clearInterval(timer);},[active,approved,refresh]);

  async function saveRecord(event:FormEvent){event.preventDefault();if(!draft.legalName.trim()||!draft.registrationNumber.trim()){setError("Add the legal company name and registration number.");return;}setBusy(true);setError("");try{await api("/business/profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({legalName:draft.legalName,registrationNumber:draft.registrationNumber,country:draft.incorporationCountry})});setActive(1);}catch(problem){setError(problem instanceof Error?problem.message:"Company record could not be saved");}finally{setBusy(false);}}
  function detailsNext(event:FormEvent){event.preventDefault();const characterError=addressCharacterError(draft,"Registered address");if(characterError){setError(characterError);return;}if(!draft.businessType||!draft.contactName.trim()||!draft.contactEmail.trim()||!draft.contactPhone.trim()||!draft.addressLine1.trim()||!draft.city.trim()||!draft.postCode.trim()){setError("Complete the company contact and registered address.");return;}if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.contactEmail)){setError("Enter a valid company contact email.");return;}if(!isValidPhoneNumber(draft.contactPhone)){setError("Use the international format for the company phone.");return;}if(!validPostcode(draft.postCode,postcodeRule)){setError(`Enter a valid ${draft.incorporationCountry} postcode.`);return;}setError("");setActive(2);}
  async function createCompany(){
    if(!legal.ready){setError("Load the current agreements before continuing.");return;}
    const hashesRequired=documents.length>0;
    if(hashesRequired&&documents.length<3){setError("Verification agreements are not ready. Contact support.");return;}
    if(hashesRequired&&!consent){setError("Accept the agreements for the company");return;}
    setBusy(true);setError("");try{
      if(hashesRequired)await api("/business/legal-acceptances",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({documentIds:documents.map(item=>item.id)})});
      const created=await api<{partyId?:string;onboardingStatus:string;complianceStatus:string;verification?:{verificationUrl?:string}}>("/business",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        legalName:draft.legalName,registrationNumber:draft.registrationNumber,businessType:draft.businessType,
        contact:{name:draft.contactName,email:draft.contactEmail,phone:draft.contactPhone},
        registeredAddress:{addressLine1:draft.addressLine1,addressLine2:draft.addressLine2,postCode:draft.postCode,city:draft.city,country:draft.incorporationCountry},
      })});
      const url=created.verification?.verificationUrl??(await api<{verificationUrl:string}>("/business/verification-session",{method:"POST"})).verificationUrl;
      setVerificationUrl(url);setStatus({partyId:created.partyId,onboardingStatus:created.onboardingStatus,complianceStatus:created.complianceStatus});setActive(3);
    }catch(problem){setError(problem instanceof Error?problem.message:"Company verification could not start");}finally{setBusy(false);}
  }
  function openVerification(){if(!verificationUrl)return;window.open(verificationUrl,"_blank","noopener,noreferrer");setActive(4);}
  async function completeCompanySimulation(){
    setBusy(true);setError("");
    try{const value=await api<Status>("/simulator/compliance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({subjectPartyId:status?.partyId,status:"ACTIVE"})});setStatus(value);}
    catch(problem){setError(problem instanceof Error?problem.message:"The simulated company check could not finish");}
    finally{setBusy(false);}
  }

  if(loading)return <JourneyBody eyebrow="Company" title="Finding your place" statusLabel="Loading" steps={companySteps} active={0}><div className="compliance-loading"><IconLoader2 className="spin"/>Loading company setup…</div></JourneyBody>;
  if(approved)return <JourneyBody eyebrow="COMPANY CHECK" title="Company approved" statusLabel="Complete" steps={companySteps} active={4}>
    <div className="compliance-complete compliance-complete-centered">
      <StatusIllustration status="kyb" size={168}/>
      <h3>Company approved</h3>
      <p>Next, open Accounts to set company pay-in and payout routes.</p>
      <div className="compliance-form-actions"><button className="compliance-primary" type="button" onClick={()=>onApproved?.()}>Continue <IconArrowRight size={17}/></button></div>
    </div>
  </JourneyBody>;
  return <JourneyBody eyebrow="COMPANY CHECK" title={active<4?companySteps[active].title:"Company review"} statusLabel={active===4?"In review":"In progress"} steps={companySteps} active={active}>
    {active===0?<form className="compliance-form" onSubmit={saveRecord} noValidate><p className="compliance-form-copy">Use the company name and number exactly as registered.</p><div className="compliance-form-grid">
      <Field label="Legal company name"><input value={draft.legalName} onChange={e=>update("legalName",e.target.value)} required/></Field><Field label="Registration number"><input value={draft.registrationNumber} onChange={e=>update("registrationNumber",e.target.value)} required/></Field><CountrySelect value={draft.incorporationCountry} onChange={value=>update("incorporationCountry",value)} options={corporateCountries} label="Incorporation country" className="compliance-country-field" modalClassName="compliance-selector-dialog"/>
    </div><div className="compliance-form-actions"><button className="compliance-primary" disabled={busy} type="submit">{busy?<IconLoader2 className="spin" size={17}/>:null}Save company <IconArrowRight size={17}/></button></div></form>:null}
    {active===1?<form className="compliance-form" onSubmit={detailsNext} noValidate><p className="compliance-form-copy">Company contact and registered address. Settlement wallets are set with company money routes.</p><div className="compliance-form-grid">
      <Field label="Business type"><select value={draft.businessType} onChange={e=>update("businessType",e.target.value)} required><option value="">Choose a type</option><option value="LIMITED_LIABILITY">Limited liability</option><option value="SOLE_TRADER">Sole trader</option><option value="PARTNERSHIP">Partnership</option><option value="PUBLIC_LIMITED_COMPANY">Public limited company</option><option value="JOINT_STOCK_COMPANY">Joint stock company</option><option value="CHARITY">Charity</option></select></Field>
      <Field label="Contact name"><input value={draft.contactName} onChange={e=>update("contactName",e.target.value)} required/></Field><Field label="Contact email"><input type="email" value={draft.contactEmail} onChange={e=>update("contactEmail",e.target.value)} required/></Field><Field label="Contact phone"><input type="tel" value={draft.contactPhone} onChange={e=>update("contactPhone",e.target.value)} required/></Field>
      <Field label="Registered address"><input value={draft.addressLine1} onChange={e=>update("addressLine1",e.target.value)} required/></Field><Field label="Address line 2"><input value={draft.addressLine2} onChange={e=>update("addressLine2",e.target.value)}/></Field><Field label="City"><input value={draft.city} onChange={e=>update("city",e.target.value)} required/></Field><Field label="Postcode" hint={postcodeRule?.fixedValue?`Use ${postcodeRule.fixedValue} for ${draft.incorporationCountry} addresses.`:`Use the ${draft.incorporationCountry} postal format.`}><input value={draft.postCode} readOnly={Boolean(postcodeRule?.fixedValue)} onChange={e=>update("postCode",e.target.value.toUpperCase())} required/></Field>
    </div><div className="compliance-form-actions"><button className="compliance-secondary" type="button" onClick={()=>setActive(0)}><IconArrowLeft size={17}/> Back</button><button className="compliance-primary" type="submit">Continue <IconArrowRight size={17}/></button></div></form>:null}
    {active===2?<div className="compliance-form"><AgreementReview legal={legal} consent={consent} onConsent={setConsent} companyName={draft.legalName}/><div className="compliance-form-actions"><button className="compliance-secondary" type="button" onClick={()=>setActive(1)}><IconArrowLeft size={17}/> Back</button><button className="compliance-primary" type="button" disabled={busy||!legal.ready} onClick={()=>void createCompany()}>{busy?<IconLoader2 className="spin" size={17}/>:null}{documents.length>0?"Create company profile":"Continue to verification"}</button></div></div>:null}
    {active===3?<div className="compliance-idv-intro"><span className="compliance-form-emblem"><IconBuilding size={30}/></span><h3>Open company check</h3><p className="compliance-form-copy">{verificationUrl.includes("/simulator/company/")?"No company documents are collected in local simulator mode.":"The company check opens in a secure tab. Return here when it is submitted."}</p>{verificationUrl.includes("/simulator/company/")?<button className="compliance-primary" type="button" disabled={busy} onClick={()=>void completeCompanySimulation()}>{busy?<IconLoader2 className="spin" size={17}/>:null}Complete simulated check</button>:<button className="compliance-primary" type="button" onClick={openVerification}>Open company check <IconExternalLink size={16}/></button>}</div>:null}
    {active===4?<div className="compliance-complete"><span className="pending"><IconRefresh size={28}/></span><small>UNDER REVIEW</small><h3>We’re reviewing the company</h3><p>You can leave this page. We’ll keep your place.</p><div className="compliance-form-actions"><button className="compliance-secondary" type="button" onClick={()=>void refresh()}><IconRefresh size={16}/> Refresh status</button></div></div>:null}
  </JourneyBody>;
}

function SetupHandoff({kind}:{kind:"kyc"|"kyb"|"member"}){
  return <div className="compliance-setup-done">
    <StatusIllustration status={kind==="kyb"?"kyb":"kyc"} size={220}/>
    <small>{kind==="kyb"?"COMPANY VERIFIED":"YOU’RE VERIFIED"}</small>
    <h2>{kind==="kyb"?"Company check complete":"Verification complete"}</h2>
    <p>{kind==="kyb"?"Open Accounts to set company pay-in and payout routes, or go straight to the dashboard.":kind==="member"?"Open Accounts to finish your personal money routes, then return to the company workspace when you need it.":"Open Accounts to set pay-in and payout routes, or go straight to the dashboard."}</p>
    <div className="compliance-form-actions compliance-handoff-actions">
      <Link className="compliance-primary" href="/dashboard/accounts">Set up accounts <IconArrowRight size={17}/></Link>
      <Link className="compliance-secondary" href="/dashboard">Open dashboard</Link>
    </div>
  </div>;
}

export function ComplianceJourney({accountType,membershipRole,initialComplianceApproved=false,onProfileSaved,...customer}:Customer&{accountType:"PERSONAL"|"BUSINESS";membershipRole?:string|null;initialComplianceApproved?:boolean;onProfileSaved?:(profile:Customer)=>void}){
  const business=accountType==="BUSINESS";
  const memberIdentity=business&&Boolean(membershipRole)&&membershipRole!=="OWNER";
  const [ownerApproved,setOwnerApproved]=useState(accountType==="PERSONAL"||Boolean(initialComplianceApproved));
  const [companyApproved,setCompanyApproved]=useState(memberIdentity);
  const [personalApproved,setPersonalApproved]=useState(initialComplianceApproved&&!business);

  useEffect(()=>{
    if(memberIdentity&&initialComplianceApproved)setOwnerApproved(true);
    if(!business&&initialComplianceApproved)setPersonalApproved(true);
  },[business,initialComplianceApproved,memberIdentity]);

  if(business&&!memberIdentity&&companyApproved){
    return <div className="compliance-window compliance-window-done" aria-labelledby="compliance-title">
      <h1 id="compliance-title" className="sr-only">Company verified</h1>
      <SetupHandoff kind="kyb"/>
    </div>;
  }
  if(memberIdentity&&ownerApproved){
    return <div className="compliance-window compliance-window-done" aria-labelledby="compliance-title">
      <h1 id="compliance-title" className="sr-only">Identity verified</h1>
      <SetupHandoff kind="member"/>
    </div>;
  }
  if(!business&&personalApproved){
    return <div className="compliance-window compliance-window-done" aria-labelledby="compliance-title">
      <h1 id="compliance-title" className="sr-only">Verification complete</h1>
      <SetupHandoff kind="kyc"/>
    </div>;
  }

  return <div className="compliance-window compliance-window-simple">
    <h1 id="compliance-title" className="sr-only">{business?(memberIdentity?"Verify your identity":ownerApproved?"Company verification":"Owner verification"):"Personal verification"}</h1>
    {business&&!ownerApproved?<PersonalJourney customer={customer} ownerMode={!memberIdentity} memberMode={memberIdentity} onApproved={()=>setOwnerApproved(true)} onProfileSaved={onProfileSaved}/>
      :business&&!companyApproved?<CompanyJourney customer={customer} onApproved={()=>setCompanyApproved(true)}/>
      :!business?<PersonalJourney customer={customer} onApproved={()=>setPersonalApproved(true)} onProfileSaved={onProfileSaved}/>
      :null}
  </div>;
}
