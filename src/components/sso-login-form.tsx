"use client";

import {FormEvent,Suspense,useEffect,useState} from "react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {IconAlertCircle,IconArrowRight,IconLoader2} from "@tabler/icons-react";
import {AccessField} from "@/components/access-field";
import {apiErrorMessage} from "@/lib/api-error";

function ssoErrorMessage(code:string|null){
  switch(code){
    case "use_company_sign_in":
      return "Start from this page with your work email. The ACS URL is only for your identity provider after you sign in.";
    case "not_active":
      return "Company SSO is not active yet. Open SSO settings, click Sign in to verify, then activate SSO.";
    case "start_test":
      return "Start the connection test from StrivePay SSO settings (Sign in to verify), not from the Okta app tile.";
    case "relay_state":
      return "This sign-in request expired or was invalid. Clear Default Relay State in Okta (leave it blank), then try Sign in to verify again from SSO settings.";
    case "domain":
      return "That email is outside your company’s allowed SSO domain.";
    case "not_a_member":
      return "That identity is not an active company member yet. With SSO active and your company domain configured, just-in-time provisioning should add you on first sign-in. Ask an administrator to check SSO settings if this continues.";
    case "replay":
      return "That sign-in response was already used. Start a new company sign-in.";
    case "authentication_failed":
      return "Company sign-in failed. Check your Okta assignment and SAML settings, then try again.";
    case "sso-session":
      return "We couldn’t create your company session. Try signing in again.";
    default:
      return code? "Company sign-in could not be completed. Try again from this page.": "";
  }
}

function SsoLoginFormInner(){
  const params=useSearchParams();
  const [email,setEmail]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    const message=ssoErrorMessage(params.get("error"));
    if(message)setError(message);
    const preset=params.get("email")?.trim()??"";
    if(preset)setEmail(preset);
  },[params]);

  async function submit(event:FormEvent){
    event.preventDefault();
    setError("");
    const value=email.trim().toLowerCase();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)){
      setError("Enter a valid work email address.");
      return;
    }
    setBusy(true);
    try{
      const response=await fetch("/api/auth/sso/discover",{
        method:"POST",
        headers:{Accept:"application/json","Content-Type":"application/json"},
        body:JSON.stringify({email:value}),
      });
      const data=await response.json().catch(()=>null) as {redirectUrl?:string}|null;
      if(!response.ok||!data?.redirectUrl){
        setError(apiErrorMessage(data,"No company single sign-on is available for that email."));
        setBusy(false);
        return;
      }
      window.location.assign(data.redirectUrl);
    }catch{
      setError("Could not continue with company sign-in. Try again.");
      setBusy(false);
    }
  }

  return (
    <section className="access-card" aria-labelledby="sso-login-title">
      <header className="access-card-heading">
        <span>Company account</span>
        <h2 id="sso-login-title">Sign in with your company</h2>
        <p>Use your work email. We’ll send you to your company’s identity provider.</p>
      </header>

      {error?(
        <div className="access-alert access-alert-error" role="alert">
          <IconAlertCircle size={20} aria-hidden="true"/>
          <p>{error}</p>
        </div>
      ):null}

      <form className="access-form" method="post" onSubmit={submit} noValidate>
        <AccessField id="sso-email" label="Work email" error={undefined}>
          <input
            id="sso-email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoComplete="username"
            spellCheck={false}
            aria-invalid={Boolean(error)}
            value={email}
            onChange={event=>{setEmail(event.target.value);if(error)setError("");}}
            placeholder="you@company.com"
            disabled={busy}
          />
        </AccessField>

        <button className="access-primary-button" type="submit" disabled={busy}>
          {busy?(
            <><IconLoader2 className="access-spinner" size={20}/> Continuing…</>
          ):(
            <>Continue <IconArrowRight size={20}/></>
          )}
        </button>
      </form>

      <p className="access-card-footer">
        Prefer password? <Link href="/login">Sign in with email</Link>
      </p>
    </section>
  );
}

export function SsoLoginForm(){
  return <Suspense fallback={<div className="access-card">Loading…</div>}><SsoLoginFormInner/></Suspense>;
}
