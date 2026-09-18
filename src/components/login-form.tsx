"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {
  IconAlertCircle,
  IconArrowRight,
  IconEye,
  IconEyeOff,
  IconLoader2,
} from "@tabler/icons-react";
import {z} from "zod";
import {destinationAfterLogin,loginSchema} from "@/lib/auth-access";
import {storeVerificationChallenge} from "@/lib/verification-challenge";
import {AccessField} from "./access-field";
import {useToast} from "@/components/ui/toast";

type LoginValues=z.infer<typeof loginSchema>;

function continueAfterAuth(returnTo:string,accountType?:string|null){
  window.location.assign(destinationAfterLogin(returnTo,accountType));
}

export function LoginForm({returnTo,sessionExpired=false}:{returnTo:string;sessionExpired?:boolean}){
  const {show}=useToast();
  const [error,setError]=useState("");
  const [showPassword,setShowPassword]=useState(false);
  const [challengeId,setChallengeId]=useState("");
  const [otpCode,setOtpCode]=useState("");
  const [otpBusy,setOtpBusy]=useState(false);
  const{
    register,
    handleSubmit,
    formState:{errors,isSubmitting},
  }=useForm<LoginValues>({
    resolver:zodResolver(loginSchema),
    defaultValues:{email:"",password:""},
  });

  useEffect(()=>{
    if(sessionExpired)show({tone:"warning",title:"Session expired",message:"Sign in to continue."});
  },[sessionExpired,show]);

  const forgotHref=returnTo==="/dashboard"
    ?"/forgot-password"
    :`/forgot-password?returnTo=${encodeURIComponent(returnTo)}`;

  async function submit(values:LoginValues){
    setError("");
    const email=values.email.trim().toLowerCase();

    try{
      const response=await fetch("/api/auth/login",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({email,password:values.password}),
      });
      const data=await response.json().catch(()=>({}));

      if(!response.ok){
        if(data.type==="email_verification_required"){
          storeVerificationChallenge(data.email??email,data.verificationChallengeId);
          window.location.assign(`/verify-email?email=${encodeURIComponent(data.email??email)}`);
          return;
        }
        setError(response.status===429
          ?"Too many sign-in attempts. Wait a few minutes or reset your password."
          :"We couldn’t sign you in with those details. Check them or reset your password.");
        return;
      }
      if(data.verificationRequired&&!data.emailVerified){
        storeVerificationChallenge(email,data.verificationChallengeId);
        window.location.assign(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
      if(data.otpRequired&&data.challengeId){
        setChallengeId(String(data.challengeId));
        setOtpCode("");
        return;
      }
      if(!data.authenticated){
        setError("We couldn’t complete sign-in. Try again.");
        return;
      }
      continueAfterAuth(returnTo,data.accountType);
    }catch{
      setError("We couldn’t reach StrivePay. Check your connection and try again.");
    }
  }

  async function submitOtp(event:React.FormEvent){
    event.preventDefault();
    if(otpCode.length!==6){setError("Enter the 6-digit authenticator code");return;}
    setError("");
    setOtpBusy(true);
    try{
      const response=await fetch("/api/auth/login/2fa",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({challengeId,code:otpCode}),
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok){
        setError(data.title??data.message??"That authenticator code was not accepted.");
        return;
      }
      if(!data.authenticated){
        setError("We couldn’t complete sign-in. Try again.");
        return;
      }
      continueAfterAuth(returnTo,data.accountType);
    }catch{
      setError("We couldn’t reach StrivePay. Check your connection and try again.");
    }finally{
      setOtpBusy(false);
    }
  }

  if(challengeId){
    return (
      <section className="access-card" aria-labelledby="login-otp-title">
        <header className="access-card-heading">
          <span>Step 2 of 2</span>
          <h2 id="login-otp-title">Authenticator code</h2>
          <p>Enter the 6-digit code from your authenticator app to finish signing in.</p>
        </header>

        {error?(
          <div className="access-alert access-alert-error" role="alert">
            <IconAlertCircle size={20} aria-hidden="true"/>
            <p>{error}</p>
          </div>
        ):null}

        <form className="access-form" onSubmit={event=>void submitOtp(event)} noValidate>
          <AccessField id="login-otp" label="Authenticator code">
            <input
              id="login-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otpCode}
              onChange={event=>setOtpCode(event.target.value.replace(/\D/g,"").slice(0,6))}
              placeholder="123456"
              required
            />
          </AccessField>
          <button className="access-primary-button" type="submit" disabled={otpBusy}>
            {otpBusy?(
              <><IconLoader2 className="access-spinner" size={20}/> Verifying…</>
            ):(
              <>Continue <IconArrowRight size={20}/></>
            )}
          </button>
        </form>

        <p className="access-card-footer">
          <button
            type="button"
            className="access-text-button"
            onClick={()=>{setChallengeId("");setOtpCode("");setError("");}}
          >
            Back to password
          </button>
        </p>
      </section>
    );
  }

  return (
    <section className="access-card" aria-labelledby="login-title">
      <header className="access-card-heading">
        <span>Customer account</span>
        <h2 id="login-title">Welcome back</h2>
        <p>Sign in to continue to your StrivePay account.</p>
      </header>

      {error?(
        <div className="access-alert access-alert-error" role="alert">
          <IconAlertCircle size={20} aria-hidden="true"/>
          <p>{error}</p>
        </div>
      ):null}

      <form className="access-form" method="post" onSubmit={handleSubmit(submit)} noValidate>
        <AccessField id="login-email" label="Email address" error={errors.email?.message}>
          <input
            id="login-email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoComplete="username"
            spellCheck={false}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email?"login-email-error":undefined}
            placeholder="you@example.com"
            {...register("email")}
          />
        </AccessField>

        <AccessField
          id="login-password"
          label="Password"
          error={errors.password?.message}
          action={<Link href={forgotHref}>Forgot password?</Link>}
        >
          <div className="access-password-input">
            <input
              id="login-password"
              type={showPassword?"text":"password"}
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password?"login-password-error":undefined}
              placeholder="Enter your password"
              {...register("password")}
            />
            <button
              type="button"
              onClick={()=>setShowPassword(value=>!value)}
              aria-label={showPassword?"Hide password":"Show password"}
              aria-pressed={showPassword}
            >
              {showPassword?<IconEyeOff size={20}/>:<IconEye size={20}/>}
            </button>
          </div>
        </AccessField>

        <button className="access-primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting?(
            <><IconLoader2 className="access-spinner" size={20}/> Signing in…</>
          ):(
            <>Sign in <IconArrowRight size={20}/></>
          )}
        </button>
      </form>

      <p className="access-card-footer">
        New to StrivePay? <Link href="/register">Create an account</Link>
      </p>
    </section>
  );
}
