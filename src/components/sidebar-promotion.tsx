"use client";

import Image from "next/image";
import Link from "next/link";
import {useEffect,useState} from "react";
import {IconArrowRight,IconPlayerPause,IconPlayerPlay} from "@tabler/icons-react";
import type {AccountSetupState} from "./dashboard-route-copy";

export function SidebarPromotion({setup,setupHref,onNavigate}:{setup:AccountSetupState|null;setupHref:string;onNavigate:()=>void}){
  const [slide,setSlide]=useState(0);
  const [paused,setPaused]=useState(false);
  const [interacting,setInteracting]=useState(false);
  const ready=Boolean(setup?.approved&&setup.routesReady);
  useEffect(()=>{
    if(!ready||paused||interacting)return;
    const preference=window.matchMedia("(prefers-reduced-motion: reduce)");
    if(preference.matches)return;
    const timer=window.setInterval(()=>setSlide(value=>(value+1)%2),7000);
    return()=>window.clearInterval(timer);
  },[ready,paused,interacting]);
  if(!setup)return null;
  const sell=ready&&slide===1;
  const title=ready?sell?"Crypto to bank.":"Your next crypto move.":setup.approved?"Open your money routes.":setup.pending?"We’re checking your details.":setup.failed?"A quick check needed.":"Make it yours.";
  const copy=ready?sell?"Choose where your converted funds arrive.":"Buy crypto using a bank transfer.":setup.approved?"Set up your pay-in and payout accounts.":setup.pending?"Follow your verification progress here.":setup.failed?"Review your details to continue setup.":"Complete verification to set up your accounts.";
  const action=ready?sell?"Sell crypto":"Buy crypto":setup.approved?"Request setup":setup.pending?"Check progress":"Continue setup";
  const art=ready?sell?"destination-account":"buy-wallet":"setup-journey";
  return <section className={`sidebar-promotion${sell?" is-sell":""}`} aria-label={ready?"Ways to move money":"Your next setup step"} onMouseEnter={()=>setInteracting(true)} onMouseLeave={()=>setInteracting(false)} onFocus={()=>setInteracting(true)} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setInteracting(false);}}>
    <div className="sidebar-promotion-carving" aria-hidden="true"/>
    <Image className="sidebar-promotion-art" src={`/illustrations/account-${art}-3d.png`} width={112} height={100} alt=""/>
    <div className="sidebar-promotion-copy"><span>{ready?sell?"SELL CRYPTO":"BUY CRYPTO":"YOUR NEXT STEP"}</span><h2>{title}</h2><p>{copy}</p>
    <Link href={ready?sell?"/dashboard/sell":"/dashboard/buy":setupHref} onClick={onNavigate}>{action}<IconArrowRight size={15}/></Link></div>
    {ready?<div className="sidebar-promotion-controls"><div>{["Buy","Sell"].map((label,index)=><button key={label} type="button" aria-label={`Show ${label.toLowerCase()} advert`} aria-pressed={slide===index} onClick={()=>setSlide(index)}/>)}</div><button type="button" aria-label={paused?"Play adverts":"Pause adverts"} onClick={()=>setPaused(value=>!value)}>{paused?<IconPlayerPlay size={13}/>:<IconPlayerPause size={13}/>}</button></div>:null}
  </section>;
}
