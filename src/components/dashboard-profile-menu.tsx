"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useEffect,useId,useRef,useState} from "react";
import {IconBuilding,IconChevronDown,IconLogout,IconSettings,IconUser} from "@tabler/icons-react";
import {hasBusinessMembershipHint,writeBrowserAccountScope,type AccountScope} from "@/lib/account-scope";
import {signOut} from "@/lib/customer-auth";
import {confirmSupportLeave} from "@/lib/use-support-unload-warning";
import {setCustomerFetchAccountScope} from "@/lib/customer-session";
import type {DashboardCustomer} from "@/lib/dashboard-access";

type ProfileMenuProps={
  customer:DashboardCustomer;
  accountScope?:AccountScope;
  variant?:"compact"|"identity";
  primary?:string;
  secondary?:string;
};

export function DashboardProfileMenu({
  customer,
  accountScope="PERSONAL",
  variant="compact",
  primary,
  secondary,
}:ProfileMenuProps){
  const router=useRouter();
  const id=useId();
  const [open,setOpen]=useState(false);
  const [signingOut,setSigningOut]=useState(false);
  const [switching,setSwitching]=useState(false);
  const rootRef=useRef<HTMLDivElement>(null);
  const buttonRef=useRef<HTMLButtonElement>(null);
  const initials=`${customer.givenName?.[0]??"S"}${customer.familyName?.[0]??""}`.toUpperCase();
  const canSwitch=hasBusinessMembershipHint(customer);
  const nextScope:AccountScope=accountScope==="BUSINESS"?"PERSONAL":"BUSINESS";
  const businessActive=accountScope==="BUSINESS"&&canSwitch;
  const identityPrimary=primary?.trim()||(businessActive?(customer.organizationLegalName?.trim()||"Company"):`${customer.givenName} ${customer.familyName}`.trim());
  const identitySecondary=secondary?.trim()||(businessActive?`${customer.givenName} ${customer.familyName}`.trim()+" · Company":"Personal account");

  useEffect(()=>{
    function onPointer(event:MouseEvent){
      if(!rootRef.current?.contains(event.target as Node))setOpen(false);
    }
    function onKey(event:KeyboardEvent){
      if(event.key==="Escape"&&rootRef.current?.contains(document.activeElement)){setOpen(false);buttonRef.current?.focus();}
    }
    document.addEventListener("mousedown",onPointer);
    document.addEventListener("keydown",onKey);
    return()=>{
      document.removeEventListener("mousedown",onPointer);
      document.removeEventListener("keydown",onKey);
    };
  },[]);

  async function handleSignOut(){
    if(signingOut||!(await confirmSupportLeave()))return;
    setOpen(false);
    setSigningOut(true);
    await signOut(()=>{router.replace("/login");router.refresh();});
  }

  async function switchScope(){
    if(switching||!(await confirmSupportLeave()))return;
    setSwitching(true);
    try{
      const response=await fetch("/api/account-scope",{
        method:"POST",
        headers:{"Content-Type":"application/json",Accept:"application/json"},
        credentials:"same-origin",
        body:JSON.stringify({scope:nextScope}),
      });
      if(!response.ok)throw new Error("Could not switch account context");
      writeBrowserAccountScope(nextScope);
      setCustomerFetchAccountScope(nextScope);
      setOpen(false);
      setSwitching(false);
      router.refresh();
    }catch{
      setSwitching(false);
    }
  }

  return <div className={`dashboard-profile-menu${variant==="identity"?" identity":""}${open?" open":""}`} ref={rootRef} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false);}}>
    <button
      type="button"
      className={variant==="identity"?"dashboard-account-switcher":"dashboard-profile"}
      ref={buttonRef}
      aria-controls={id}
      aria-expanded={open}
      aria-haspopup="menu"
      aria-label={variant==="identity"?`Account menu for ${identityPrimary}`:`Account menu for ${customer.email}`}
      onClick={()=>setOpen(value=>!value)}
    >
      {variant==="identity"?(
        <>
          <span className="dashboard-account-switcher-icon" aria-hidden="true">
            {businessActive?<IconBuilding size={18} stroke={1.75}/>:<IconUser size={18} stroke={1.75}/>}
          </span>
          <span className="dashboard-account-switcher-copy">
            <strong>{identityPrimary}</strong>
            <span>{identitySecondary}</span>
          </span>
          <IconChevronDown size={18} className="dashboard-profile-caret" aria-hidden="true"/>
        </>
      ):(
        <>
          <span className="dashboard-profile-avatar">{initials}</span>
          <IconChevronDown size={16} className="dashboard-profile-caret" aria-hidden="true"/>
        </>
      )}
    </button>
    {open?<nav className="dashboard-profile-panel" id={id} role="menu" aria-label="Account actions">
      {canSwitch?<button type="button" role="menuitem" disabled={switching} onClick={()=>void switchScope()}>
        {accountScope==="BUSINESS"?<IconUser size={16}/>:<IconBuilding size={16}/>}
        {switching?"Switching…":accountScope==="BUSINESS"?"Switch to personal":"Switch to company"}
      </button>:null}
      <Link href="/dashboard/profile" role="menuitem" onClick={()=>setOpen(false)}>
        <IconUser size={16}/> Profile
      </Link>
      <Link href="/dashboard/settings" role="menuitem" onClick={()=>setOpen(false)}>
        <IconSettings size={16}/> Settings
      </Link>
      <button type="button" role="menuitem" disabled={signingOut} onClick={()=>void handleSignOut()}>
        <IconLogout size={16}/> {signingOut?"Signing out…":"Sign out"}
      </button>
    </nav>:null}
  </div>;
}
