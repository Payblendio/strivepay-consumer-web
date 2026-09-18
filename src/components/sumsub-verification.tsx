"use client";

import {useEffect,useRef,useState} from "react";

type SumsubSdk={launch:(container:string|HTMLElement)=>void;destroy:()=>void};

export function SumsubVerification({token,onSubmitted,onError}:{token:string;onSubmitted:()=>void;onError:(message:string)=>void}){
  const host=useRef<HTMLDivElement>(null);
  const submitted=useRef(false);
  const [ready,setReady]=useState(false);

  useEffect(()=>{
    if(!host.current)return;
    let sdk:SumsubSdk|undefined,cancelled=false;
    const finish=()=>{if(cancelled||submitted.current)return;submitted.current=true;onSubmitted();};
    void (async()=>{
      try{
        const snsWebSdk=(await import("@sumsub/websdk")).default;
        if(cancelled||!host.current)return;
        sdk=snsWebSdk.init(token,async()=>{
          const response=await fetch("/api/onboarding/identity-verification/session",{method:"POST"});
          const value=await response.json() as {verificationToken?:string;title?:string};
          if(!response.ok||!value.verificationToken)throw new Error(value.title??"The identity session expired");
          return value.verificationToken;
        }).withConf({lang:"en",theme:"light"})
          .withOptions({addViewportTag:false,adaptIframeHeight:true})
          .on("idCheck.onReady",()=>setReady(true))
          .on("idCheck.onApplicantSubmitted",finish)
          .on("idCheck.onApplicantVerificationCompleted",finish)
          .on("idCheck.onApplicantStatusChanged",payload=>{
            const status=String(payload.reviewStatus??"").toLowerCase();
            if(status==="pending"||status==="completed")finish();
          })
          .on("idCheck.onError",error=>{if(!cancelled&&!submitted.current)onError(error.error||error.reason||"Identity check could not continue")})
          .build();
        sdk.launch(host.current);
      }catch(error){if(!cancelled)onError(error instanceof Error?error.message:"Identity check could not start");}
    })();
    return()=>{cancelled=true;sdk?.destroy();};
  },[token,onSubmitted,onError]);

  return <div className="compliance-idv-shell" aria-busy={!ready}>
    {!ready?<div className="compliance-idv-loading"><span/>Opening the secure check…</div>:null}
    <div ref={host}/>
  </div>;
}
