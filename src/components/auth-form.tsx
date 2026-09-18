"use client";
import Link from "next/link";
import {useState} from "react";
import {useForm,useWatch} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {IconAlertCircle,IconArrowRight,IconEye,IconEyeOff,IconLock,IconMail,IconShieldCheck} from "@tabler/icons-react";
import {isValidPhoneNumber,type Country,type Value} from "react-phone-number-input";
import {z} from "zod";
import {storeVerificationChallenge} from "@/lib/verification-challenge";
import {InternationalPhoneField} from "./ui/international-phone-field";

const schema=z.object({email:z.email("Enter a valid email address"),password:z.string().min(12,"Password must contain at least 12 characters"),givenName:z.string().optional(),familyName:z.string().optional(),country:z.string().optional(),phoneE164:z.string().optional()});
type Values=z.infer<typeof schema>;

function continueAfterAuth(data:{accountType?:string|null}){
  if(!data.accountType){window.location.assign("/onboarding/account-type");return;}
  const requested=new URLSearchParams(window.location.search).get("returnTo");
  const destination=requested?.startsWith("/")&&!requested.startsWith("//")?requested:"/dashboard";
  window.location.assign(destination);
}

export function AuthForm({mode}:{mode:"login"|"register"}){
  const [error,setError]=useState("");
  const [phoneError,setPhoneError]=useState("");
  const [showPassword,setShowPassword]=useState(false);
  const [challengeId,setChallengeId]=useState("");
  const [otpCode,setOtpCode]=useState("");
  const [otpBusy,setOtpBusy]=useState(false);
  const{register,handleSubmit,setValue,control,formState:{errors,isSubmitting}}=useForm<Values>({resolver:zodResolver(schema)});
  const selectedCountry=useWatch({control,name:"country"}) as Country|undefined;
  const phoneValue=useWatch({control,name:"phoneE164"}) as Value|undefined;

  async function submit(values:Values){
    setError("");setPhoneError("");
    if(mode==="register"&&(!values.givenName||!values.familyName)){setError("Enter your first and last name to continue.");return;}
    if(mode==="register"&&(!values.country||!values.phoneE164)){setPhoneError("Select your country and enter your phone number.");return;}
    if(mode==="register"&&!isValidPhoneNumber(values.phoneE164!)){setPhoneError("Enter a valid phone number for the selected country.");return;}
    try{
      const normalizedEmail=values.email.trim().toLowerCase();
      const response=await fetch(`/api/auth/${mode}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...values,email:normalizedEmail})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok){
        if(data.type==="email_verification_required"){
          storeVerificationChallenge(data.email??normalizedEmail,data.verificationChallengeId);
          window.location.assign(`/verify-email?email=${encodeURIComponent(data.email??normalizedEmail)}`);
          return;
        }
        setError(data.title??data.message??"We could not complete that request. Please try again.");
        return;
      }
      if(data.verificationRequired&&!data.emailVerified){
        storeVerificationChallenge(normalizedEmail,data.verificationChallengeId);
        window.location.assign(`/verify-email?email=${encodeURIComponent(normalizedEmail)}`);
        return;
      }
      if(mode==="login"&&data.otpRequired&&data.challengeId){
        setChallengeId(String(data.challengeId));
        setOtpCode("");
        return;
      }
      continueAfterAuth(data);
    }catch{
      setError("We could not reach StrivePay. Check your connection and try again.");
    }
  }

  async function submitOtp(event:React.FormEvent){
    event.preventDefault();
    if(otpCode.length!==6){setError("Enter the 6-digit authenticator code");return;}
    setError("");
    setOtpBusy(true);
    try{
      const response=await fetch("/api/auth/login/2fa",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({challengeId,code:otpCode})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok){setError(data.title??data.message??"That authenticator code was not accepted.");return;}
      continueAfterAuth(data);
    }catch{
      setError("We could not reach StrivePay. Check your connection and try again.");
    }finally{
      setOtpBusy(false);
    }
  }

  if(mode==="login"&&challengeId){
    return <div className="form-wrap auth-form-v2">
      <div className="auth-form-heading">
        <span className="micro-label">STEP 2 OF 2</span>
        <h2>Authenticator code</h2>
        <p>Enter the 6-digit code from your authenticator app to finish signing in.</p>
      </div>
      {error?<div className="auth-error" role="alert"><IconAlertCircle size={19}/><span>{error}</span></div>:null}
      <form onSubmit={event=>void submitOtp(event)} noValidate>
        <AuthField label="Authenticator code" icon={<IconShieldCheck size={19}/>}>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otpCode}
            onChange={event=>setOtpCode(event.target.value.replace(/\D/g,"").slice(0,6))}
            placeholder="123456"
            required
          />
        </AuthField>
        <button className="auth-submit" disabled={otpBusy}>
          {otpBusy?<><span className="button-spinner"/>Verifying</>:<>Continue securely<IconArrowRight size={19}/></>}
        </button>
      </form>
      <button className="auth-link-button" type="button" onClick={()=>{setChallengeId("");setOtpCode("");setError("");}}>
        Back to password
      </button>
      <p className="auth-security-note"><IconLock size={14}/> Session tokens are issued only after this code is verified.</p>
    </div>;
  }

  return <div className="form-wrap auth-form-v2">
    <div className="auth-form-heading">
      <span className="micro-label">CUSTOMER ACCOUNT</span>
      <h2>{mode==="login"?"Welcome back":"Create your account"}</h2>
      <p>{mode==="login"?"Enter your details to continue securely.":"Start moving money between bank and crypto."}</p>
    </div>
    {error?<div className="auth-error" role="alert"><IconAlertCircle size={19}/><span>{error}</span></div>:null}
    <form onSubmit={handleSubmit(submit)} noValidate>
      {mode==="register"?<div className="auth-name-grid">
        <AuthField label="First name"><input required autoComplete="given-name" {...register("givenName")}/></AuthField>
        <AuthField label="Last name"><input required autoComplete="family-name" {...register("familyName")}/></AuthField>
      </div>:null}
      <AuthField label="Email address" error={errors.email?.message} icon={<IconMail size={19}/>}>
        <input type="email" autoComplete="email" placeholder="you@company.com" {...register("email")}/>
      </AuthField>
      {mode==="register"?<>
        <input type="hidden" {...register("country")}/>
        <input type="hidden" {...register("phoneE164")}/>
        <InternationalPhoneField
          country={selectedCountry}
          value={phoneValue}
          error={phoneError}
          onCountryChange={country=>{setValue("country",country,{shouldDirty:true});setValue("phoneE164",undefined,{shouldDirty:true});setPhoneError("");}}
          onChange={value=>{setValue("phoneE164",value,{shouldDirty:true});setPhoneError("");}}
        />
      </>:null}
      <AuthField label="Password" error={errors.password?.message} icon={<IconLock size={19}/>} action={mode==="login"?<Link href="/forgot-password">Forgot password?</Link>:undefined}>
        <input type={showPassword?"text":"password"} autoComplete={mode==="login"?"current-password":"new-password"} placeholder="Enter your password" {...register("password")}/>
        <button className="password-toggle" type="button" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword?"Hide password":"Show password"}>
          {showPassword?<IconEyeOff size={19}/>:<IconEye size={19}/>}
        </button>
      </AuthField>
      <button className="auth-submit" disabled={isSubmitting}>
        {isSubmitting?<><span className="button-spinner"/>{mode==="login"?"Signing you in":"Creating account"}</>:<>{mode==="login"?"Continue securely":"Create account"}<IconArrowRight size={19}/></>}
      </button>
    </form>
    <div className="auth-divider"><span>{mode==="login"?"New here?":"Already registered?"}</span></div>
    <p className="form-note">{mode==="login"?<>Create your StrivePay profile and complete verification when you are ready. <Link href="/register">Open an account</Link></>:<>Already registered? <Link href="/login">Sign in</Link></>}</p>
    <p className="auth-security-note"><IconLock size={14}/> Your session and credentials are encrypted.</p>
  </div>;
}

function AuthField({label,error,icon,action,children}:{label:string;error?:string;icon?:React.ReactNode;action?:React.ReactNode;children:React.ReactNode}){
  return <div className={`auth-field${error?" invalid":""}`}>
    <div className="auth-label-row"><label>{label}</label>{action}</div>
    <div className="auth-input">{icon?<span>{icon}</span>:null}{children}</div>
    {error?<small>{error}</small>:null}
  </div>;
}
