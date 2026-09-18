"use client";
import Link from "next/link";
import {useRouter,useSearchParams} from "next/navigation";
import {useCallback,useEffect,useState} from "react";
import {IconArrowRight,IconLoader2,IconRefresh} from "@tabler/icons-react";
import {clearVerificationChallenge,readVerificationChallenge,storeVerificationChallenge} from "@/lib/verification-challenge";

type VerificationState="waiting"|"verifying"|"verified"|"error";
type VerificationError="invalid"|"network"|"send"|"missing"|null;
const REQUEST_TIMEOUT_MS=15_000;

async function postAuth(path:string,body:Record<string,unknown>){
  const controller=new AbortController();
  const timeout=window.setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
  try{
    const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json","X-StrivePay-Client":"strivepay-web"},body:JSON.stringify(body),signal:controller.signal});
    const data=await response.json().catch(()=>({}));
    return{response,data};
  }finally{window.clearTimeout(timeout)}
}

function maskedEmail(value:string){
  const[local,domain]=value.split("@");
  if(!local||!domain)return value;
  const visible=local.slice(0,Math.min(3,local.length));
  return `${visible}${"•".repeat(Math.max(3,Math.min(6,local.length-visible.length)))}@${domain}`;
}

export function EmailVerificationForm({verificationEmail=""}:{verificationEmail?:string}){
  const router=useRouter(),params=useSearchParams();
  const email=verificationEmail||params.get("email")||"";
  const[code,setCode]=useState("");
  const[state,setState]=useState<VerificationState>("waiting"),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const[errorKind,setErrorKind]=useState<VerificationError>(null);
  const[cooldown,setCooldown]=useState(60);

  useEffect(()=>{
    if(cooldown<=0)return;
    const timer=window.setInterval(()=>setCooldown(value=>Math.max(0,value-1)),1000);
    return()=>window.clearInterval(timer);
  },[cooldown]);

  const verifyWith=useCallback(async(otp:string)=>{
    const digits=otp.replace(/\D/g,"").slice(0,6);
    if(digits.length!==6){setState("error");setErrorKind("invalid");setError("Enter the 6-digit code from your email.");return}
    const challengeId=readVerificationChallenge(email||undefined);
    if(!challengeId){
      setState("error");setErrorKind("missing");
      setError(email?"Request a new code so we can continue verification.":"Return to registration or sign in, then request a verification code.");
      return;
    }
    setState("verifying");setBusy(true);setError("");setErrorKind(null);
    try{
      const{response,data}=await postAuth("/api/auth/email/verify",{challengeId,code:digits});
      if(!response.ok){setBusy(false);setState("error");setErrorKind("invalid");setError(data.title??"That verification code is invalid, expired, or was replaced by a newer email.");return}
      clearVerificationChallenge();
      setBusy(false);setState("verified");
      window.setTimeout(()=>{router.replace("/onboarding/account-type");router.refresh()},1200);
    }catch{
      setBusy(false);setState("error");setErrorKind("network");setError("We couldn’t confirm your email. Check your connection and try again.");
    }
  },[email,router]);

  async function resend(){
    if(!email){setError("Return to sign in and enter your email so we know where to send a fresh code.");return}
    setBusy(true);setError("");setErrorKind(null);setState("waiting");setCode("");
    try{
      const{response,data}=await postAuth("/api/auth/email/resend",{email});
      setBusy(false);
      if(!response.ok){setState("error");setErrorKind("send");setError("We couldn’t send it yet. Check your connection and try again.");return}
      if(data.verificationChallengeId)storeVerificationChallenge(email,data.verificationChallengeId);
      setCooldown(60);
      const{default:Swal}=await import("sweetalert2");
      await Swal.fire({
        icon:"success",
        title:"Email sent",
        text:"Enter the newest 6-digit StrivePay code. It expires in 10 minutes.",
        confirmButtonText:"Got it",
        showCloseButton:true,
        closeButtonHtml:"&times;",
        buttonsStyling:false,
        heightAuto:false,
        customClass:{container:"strivepay-swal-container",popup:"strivepay-swal",icon:"strivepay-swal-icon",title:"strivepay-swal-title",htmlContainer:"strivepay-swal-copy",actions:"strivepay-swal-actions",confirmButton:"access-primary-button strivepay-swal-confirm",closeButton:"floating-close-button strivepay-swal-close"}
      });
    }catch{
      setBusy(false);setState("error");setErrorKind("send");setError("We couldn’t send it yet. Check your connection and try again.");
    }
  }

  const heading=state==="verifying"?"Checking your code":state==="verified"?"Email verified":state==="error"?(errorKind==="invalid"?"Code expired":errorKind==="send"?"Couldn’t send email":errorKind==="missing"?"Start again":"Couldn’t confirm email"):"Check your inbox";

  return <div className="access-card access-verification" aria-live="polite">
    <div className="access-card-heading">
      <span>{state==="verified"?"Verification complete":"One quick check"}</span>
      <h2>{heading}</h2>
      {state==="verifying"?<p>Confirming your email…</p>:null}
      {state==="verified"?<p>Done. Moving you to the next step.</p>:null}
      {state==="waiting"?<p>{email?<>Enter the 6-digit code sent to <strong>{maskedEmail(email)}</strong>.</>:"Enter the 6-digit code from your StrivePay verification email."}</p>:null}
      {state==="error"?<p>{errorKind==="invalid"||errorKind==="missing"?"Request a new code and use the latest email.":"Try again when your connection is stable."}</p>:null}
    </div>
    {error?<div className="access-verification-notice error" role="alert">{error}</div>:null}
    {(state==="waiting"||state==="error"&&(errorKind==="invalid"||errorKind==="missing"))?(
      <form className="access-code-form" onSubmit={(event)=>{event.preventDefault();void verifyWith(code);}}>
        <label className="field">
          <span>Verification code</span>
          <input
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={6}
            name="code"
            onChange={(event)=>setCode(event.target.value.replace(/\D/g,"").slice(0,6))}
            pattern="[0-9]{6}"
            placeholder="••••••"
            value={code}
          />
        </label>
        <button className="access-primary-button" disabled={busy||code.length!==6} type="submit">
          {busy?<><IconLoader2 className="access-spinner" size={19}/>Checking…</>:<>Verify email<IconArrowRight size={19}/></>}
        </button>
      </form>
    ):null}
    {state==="verified"?<Link className="access-primary-button" href="/onboarding/account-type">Continue<IconArrowRight size={19}/></Link>:null}
    {(state==="waiting"||state==="error"&&(errorKind==="invalid"||errorKind==="send"||errorKind==="missing"))&&email?<button className="access-secondary-button" type="button" onClick={resend} disabled={busy||cooldown>0} aria-describedby="verification-resend-help">{busy?<><IconLoader2 className="access-spinner" size={19}/>Sending…</>:cooldown>0?<><IconRefresh size={19}/>Resend code <span aria-hidden="true">in {cooldown}s</span></>:<><IconRefresh size={19}/>Send new code</>}</button>:null}
    {(state==="waiting"||state==="error")?<p className="access-verification-help" id="verification-resend-help">Expires in 10 minutes. Only the newest code works. {cooldown>0?`You can request another in ${cooldown} seconds.`:"You can request another code now."}</p>:null}
    <p className="access-secondary-action"><Link href="/login">Back to sign in</Link></p>
  </div>;
}
