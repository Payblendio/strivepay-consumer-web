"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {IconArrowRight,IconShieldLock} from "@tabler/icons-react";
import {authApi} from "@/lib/customer-auth";
import {Modal} from "./ui/modal";
import "./two-factor-reminder.css";

export function TwoFactorReminder(){
  const pathname=usePathname();
  const [open,setOpen]=useState(false);
  const securityPage=pathname.startsWith("/dashboard/settings/security");
  useEffect(()=>{
    if(securityPage){setOpen(false);return;}
    let active=true;
    let pending=false;
    const check=async()=>{
      if(document.visibilityState!=="visible"||pending)return;
      pending=true;
      try{
        const result=await authApi<{show:boolean}>("/2fa/reminder",{method:"POST"});
        if(active&&result.show===true)setOpen(true);
      }catch{
        // A reminder must never interrupt dashboard access when the API is unavailable.
      }finally{pending=false;}
    };
    const timer=window.setTimeout(check,1200);
    const interval=window.setInterval(check,60*60*1000);
    document.addEventListener("visibilitychange",check);
    return ()=>{active=false;window.clearTimeout(timer);window.clearInterval(interval);document.removeEventListener("visibilitychange",check);};
  },[securityPage]);
  return <Modal open={open&&!securityPage} onClose={()=>setOpen(false)} title="Protect your account" size="small" className="two-factor-reminder">
    <div className="two-factor-reminder-icon" aria-hidden="true"><IconShieldLock size={38} stroke={1.5}/></div>
    <p>Add two-factor authentication for an extra layer of security when you sign in.</p>
    <div className="two-factor-reminder-detail"><strong>Your password + a security code</strong><span>Use an authenticator app on your phone to generate your code.</span></div>
    <Link className="two-factor-reminder-primary" href="/dashboard/settings/security/authenticator" onClick={()=>setOpen(false)}>Set up 2FA <IconArrowRight size={19} aria-hidden="true"/></Link>
    <button className="two-factor-reminder-later" type="button" onClick={()=>setOpen(false)}>Remind me next week</button>
  </Modal>;
}
