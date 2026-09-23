"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {IconAlertCircle,IconArrowRight,IconLoader2} from "@tabler/icons-react";
import {writeBrowserAccountScope} from "@/lib/account-scope";

type AccountType="PERSONAL"|"BUSINESS";

export function AccountTypeChoice(){
  const router=useRouter();
  const[busy,setBusy]=useState<AccountType>();
  const[error,setError]=useState("");

  async function choose(accountType:AccountType){
    setBusy(accountType);setError("");
    try{
      const response=await fetch("/api/auth/account-type",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({accountType})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok){setError(data.title??"We couldn’t save your choice. Try again.");setBusy(undefined);return}
      writeBrowserAccountScope(accountType);
      await fetch("/api/account-scope",{
        method:"POST",
        headers:{"Content-Type":"application/json",Accept:"application/json"},
        credentials:"same-origin",
        body:JSON.stringify({scope:accountType}),
      }).catch(()=>null);
      router.replace(accountType==="BUSINESS"?"/onboarding/business":"/onboarding/personal");
      router.refresh();
    }catch{
      setError("We couldn’t reach StrivePay. Check your connection and try again.");
      setBusy(undefined);
    }
  }

  return <section className="access-card account-type-card" aria-labelledby="account-type-title">
    <div className="access-card-heading">
      <span>One choice to start</span>
      <h2 id="account-type-title">Choose your account</h2>
      <p>Select how you’ll use StrivePay today.</p>
    </div>

    {error?<div className="access-alert" role="alert"><IconAlertCircle size={19}/><p>{error}</p></div>:null}

    <div className="account-type-options" role="group" aria-label="Account type">
      <AccountOption
        title="Personal account"
        description="Buy, sell and move money for yourself."
        imageSrc="/illustrations/account-personal-3d.png"
        busy={busy==="PERSONAL"} disabled={Boolean(busy)}
        onClick={()=>void choose("PERSONAL")}
      />
      <AccountOption
        title="Business account"
        description="Manage company money, teammates and transactions."
        imageSrc="/illustrations/account-business-3d.png"
        busy={busy==="BUSINESS"} disabled={Boolean(busy)}
        onClick={()=>void choose("BUSINESS")}
      />
    </div>

    <p className="account-type-note">You can join a business workspace later.</p>
    <p className="account-type-note"><Link href="/support">Need help getting started?</Link></p>
  </section>;
}

function AccountOption({title,description,imageSrc,busy,disabled,onClick}:{title:string;description:string;imageSrc:string;busy:boolean;disabled:boolean;onClick:()=>void}){
  return <button className="account-type-option" type="button" disabled={disabled} aria-busy={busy} onClick={onClick}>
    <span className="account-type-option-icon" aria-hidden="true"><Image src={imageSrc} alt="" width={128} height={128} sizes="(max-width: 430px) 62px, 78px" /></span>
    <span className="account-type-option-copy"><strong>{title}</strong><small>{description}</small></span>
    <span className="account-type-option-arrow" aria-hidden="true">{busy?<IconLoader2 className="access-spinner" size={19}/>:<IconArrowRight size={19}/>}</span>
  </button>;
}
