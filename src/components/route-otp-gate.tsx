"use client";

import {FormEvent,useCallback,useEffect,useState,type ReactNode} from "react";
import {IconLoader2,IconMail,IconShieldCheck} from "@tabler/icons-react";
import {useToast} from "@/components/ui/toast";
import {sessionApi,sessionRequired} from "@/lib/money-route-api";
import {withDeadline} from "./account-readiness";

type SessionState="checking"|"active"|"missing"|"unavailable";
export type RequireRouteSession=(options?:{expired?:boolean})=>boolean;

export function RouteOtpGate({email,nativeAllowed=false,deferUnlock=false,children}:{email:string;nativeAllowed?:boolean;deferUnlock?:boolean;children:(sessionActive:boolean,requireSession:RequireRouteSession)=>ReactNode}){
  const {show}=useToast();
  const error=useCallback((message:string)=>show({tone:"danger",title:"Check this step",message}),[show]);
  const success=useCallback((message:string)=>show({tone:"success",title:"Saved",message}),[show]);
  const [sessionState,setSessionState]=useState<SessionState>("checking");
  const [prompted,setPrompted]=useState(false);
  const [busy,setBusy]=useState(false);
  const [otp,setOtp]=useState("");
  const [otpSent,setOtpSent]=useState(false);
  const [cooldown,setCooldown]=useState(0);

  useEffect(()=>{let cancelled=false;void (async()=>{
    try{
      const session=await withDeadline(sessionApi<{active:boolean}|null>("/session"));
      if(!cancelled)setSessionState(session?.active?"active":"missing");
    }catch{
      if(!cancelled)setSessionState("unavailable");
    }
  })();return()=>{cancelled=true;};},[]);

  useEffect(()=>{
    if(cooldown<=0)return;
    const timer=window.setInterval(()=>setCooldown(value=>Math.max(0,value-1)),1000);
    return()=>window.clearInterval(timer);
  },[cooldown]);

  async function sendOtp(){
    setBusy(true);
    try{
      await sessionApi<void>("/session/start",{method:"POST"});
      setOtpSent(true);
      setCooldown(30);
      success("Open the newest StrivePay email.");
    }catch(problem){
      error(problem instanceof Error?problem.message:"The code could not be sent");
    }finally{
      setBusy(false);
    }
  }

  async function verifyOtp(event:FormEvent){
    event.preventDefault();
    if(!/^\d{6}$/.test(otp)){error("Enter the 6-digit code from your email");return;}
    setBusy(true);
    try{
      await sessionApi("/session/otp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({otp})});
      setOtp("");
      setSessionState("active");
      success("Secure setup unlocked.");
    }catch(problem){
      error(problem instanceof Error?problem.message:"That code did not work");
    }finally{
      setBusy(false);
    }
  }

  async function retrySession(){
    setBusy(true);
    try{
      const session=await withDeadline(sessionApi<{active:boolean}|null>("/session"));
      setSessionState(session?.active?"active":"missing");
    }catch(problem){
      setSessionState("unavailable");
      error(problem instanceof Error?problem.message:"The secure session could not be checked");
    }finally{
      setBusy(false);
    }
  }

  function requireSession(options?:{expired?:boolean}){
    if(nativeAllowed||sessionState==="active"&&!options?.expired)return true;
    setPrompted(true);
    if(options?.expired){setOtp("");setOtpSent(false);setCooldown(0);}
    setSessionState(!options?.expired&&sessionState==="unavailable"?"unavailable":"missing");
    return false;
  }

  if(sessionState==="checking"&&!deferUnlock&&!nativeAllowed){
    return <div className="compliance-loading"><IconLoader2 className="spin"/>Checking secure access…</div>;
  }

  const needsUnlock=sessionState!=="checking"&&sessionState!=="active"&&!nativeAllowed&&(!deferUnlock||prompted);

  if(sessionState==="unavailable"&&needsUnlock){
    return <div className="compliance-form compliance-otp-form">
      <span className="compliance-form-emblem"><IconShieldCheck size={28}/></span>
      <h3>Session check paused</h3>
      <p className="compliance-form-copy">We could not confirm this session yet. Your details are still saved.</p>
      <button className="compliance-primary" type="button" disabled={busy} onClick={()=>void retrySession()}>{busy?<IconLoader2 className="spin" size={17}/>:null}Check again</button>
    </div>;
  }

  if(needsUnlock){
    return <form className="compliance-form compliance-otp-form" onSubmit={verifyOtp} noValidate>
      <span className="compliance-form-emblem"><IconMail size={28}/></span>
      <h3>Confirm this session</h3>
      <p className="compliance-form-copy">{otpSent?<>Enter the 6-digit code sent to <strong>{email}</strong>.</>:<>We’ll send a security code to <strong>{email}</strong>. Tap Send code to continue.</>}</p>
      {!otpSent?<button className="compliance-primary" type="button" disabled={busy} onClick={()=>void sendOtp()}>{busy?<IconLoader2 className="spin" size={17}/>:null}Send code</button>:<><input className="compliance-otp" aria-label="Email verification code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={event=>setOtp(event.target.value.replace(/\D/g,""))} autoFocus/><div className="compliance-form-actions"><button className="compliance-link-button" type="button" disabled={busy||cooldown>0} onClick={()=>void sendOtp()}>{cooldown>0?`Resend in ${cooldown}s`:"Send a new code"}</button><button className="compliance-primary" type="submit" disabled={busy}>{busy?<IconLoader2 className="spin" size={17}/>:null}Unlock setup</button></div></>}
    </form>;
  }

  return <>{children(sessionState==="active",requireSession)}</>;
}

export {sessionRequired};
export type {SessionState};
