"use client";

import {FormEvent,useEffect,useMemo,useState} from "react";
import {useRouter,useSearchParams} from "next/navigation";
import {IconLoader2} from "@tabler/icons-react";
import {isValidPhoneNumber,type Country,type Value} from "react-phone-number-input";
import {AccessShell} from "@/components/access-shell";
import {InternationalPhoneField} from "@/components/ui/international-phone-field";
import {acceptInvitation,previewInvitation,roleLabel,type InvitationPreview} from "@/lib/team-api";
import {supportedCodes,useJurisdictions} from "@/lib/jurisdictions";

export function InviteAcceptScreen(){
  const router=useRouter();
  const params=useSearchParams();
  const tokenFromUrl=params.get("token")??"";
  const {jurisdictions}=useJurisdictions();
  const residenceCodes=useMemo(()=>jurisdictions?supportedCodes(jurisdictions,"individual") as Country[]:[],[jurisdictions]);
  const [token,setToken]=useState(tokenFromUrl);
  const [preview,setPreview]=useState<InvitationPreview|null>(null);
  const [previewBusy,setPreviewBusy]=useState(Boolean(tokenFromUrl.trim()));
  const [previewError,setPreviewError]=useState("");
  const [givenName,setGivenName]=useState("");
  const [familyName,setFamilyName]=useState("");
  const [country,setCountry]=useState<Country|undefined>();
  const [phone,setPhone]=useState<Value|undefined>();
  const [phoneError,setPhoneError]=useState("");
  const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  const companyName=preview?.companyName?.trim()||"";
  const ready=useMemo(()=>Boolean(token.trim()&&givenName.trim()&&familyName.trim()&&country&&password.length>=12),[token,givenName,familyName,country,password]);

  useEffect(()=>{
    const value=token.trim();
    if(!value){
      setPreview(null);
      setPreviewBusy(false);
      setPreviewError("");
      return;
    }
    let cancelled=false;
    setPreviewBusy(true);
    setPreviewError("");
    void previewInvitation(value)
      .then(next=>{if(!cancelled){setPreview(next);setPreviewBusy(false);}})
      .catch(problem=>{
        if(cancelled)return;
        setPreview(null);
        setPreviewBusy(false);
        setPreviewError(problem instanceof Error?problem.message:"Invitation is invalid or expired.");
      });
    return ()=>{cancelled=true;};
  },[token]);

  async function onSubmit(event:FormEvent){
    event.preventDefault();
    if(!ready||busy||!country)return;
    setBusy(true);
    setError("");
    setPhoneError("");
    const phoneValue=typeof phone==="string"?phone.trim():"";
    if(phoneValue&&!isValidPhoneNumber(phoneValue)){
      setPhoneError("Enter a valid phone number for the selected country.");
      setBusy(false);
      return;
    }
    try{
      await acceptInvitation({
        token:token.trim(),
        givenName:givenName.trim(),
        familyName:familyName.trim(),
        country,
        phone:phoneValue||undefined,
        password,
      });
      router.replace("/dashboard");
      router.refresh();
    }catch(problem){
      setError(problem instanceof Error?problem.message:"Invitation could not be accepted.");
      setBusy(false);
    }
  }

  const title=companyName?`Join ${companyName} on StrivePay.`:"Join your company workspace.";
  const copy=companyName
    ?`Accept your invitation to ${companyName}${preview?.role?` as ${roleLabel(preview.role)}`:""}. Create a password to access the business account.`
    :"Accept your StrivePay invitation, create a password, and start managing the business account.";
  const panelTitle=companyName?`Join ${companyName}`:"Accept invitation";
  const submitLabel=companyName?`Join ${companyName}`:"Join business and continue";

  return (
    <AccessShell title={title} copy={copy} panelTitle={panelTitle}>
      <form className="access-form team-invite-accept" onSubmit={event=>void onSubmit(event)}>
        {companyName?(
          <div className="team-invite-company" role="status">
            <span>You're joining</span>
            <strong>{companyName}</strong>
            {preview?.role?<small>{roleLabel(preview.role)} · {preview.email}</small>:null}
          </div>
        ):null}
        <label className="compliance-field">
          <span>Invitation code</span>
          <input value={token} onChange={event=>setToken(event.target.value)} required placeholder="Paste invitation code" autoComplete="off"/>
        </label>
        {previewBusy?<p className="team-invite-preview-status">Checking invitation…</p>:null}
        {previewError?<p className="access-error" role="alert">{previewError}</p>:null}
        <div className="team-invite-grid">
          <label className="compliance-field">
            <span>First name</span>
            <input value={givenName} onChange={event=>setGivenName(event.target.value)} required autoComplete="given-name"/>
          </label>
          <label className="compliance-field">
            <span>Last name</span>
            <input value={familyName} onChange={event=>setFamilyName(event.target.value)} required autoComplete="family-name"/>
          </label>
        </div>
        <InternationalPhoneField
          className="access-phone-fields"
          country={country}
          value={phone}
          allowedCountries={residenceCodes}
          error={phoneError}
          onCountryChange={next=>{
            setCountry(next);
            setPhone(undefined);
            setPhoneError("");
          }}
          onChange={value=>{
            setPhone(value);
            setPhoneError("");
          }}
        />
        <label className="compliance-field">
          <span>Create password</span>
          <input type="password" value={password} onChange={event=>setPassword(event.target.value)} required minLength={12} autoComplete="new-password"/>
          <small>At least 12 characters with upper, lower, and a number</small>
        </label>
        {error?<p className="access-error" role="alert">{error}</p>:null}
        <button className="compliance-primary" type="submit" disabled={!ready||busy||Boolean(previewError)}>
          {busy?<IconLoader2 className="spin" size={16}/>:null}
          {submitLabel}
        </button>
      </form>
    </AccessShell>
  );
}
