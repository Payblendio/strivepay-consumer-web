"use client";
import {useState} from "react";
import Image from "next/image";
import "./partner-marquee.css";
const partners=[["bakkt","Bakkt"],["quidax","Quidax"],["stripe","Stripe"],["tatum","Tatum"],["dot-mfb","Dot MFB"]];
export function PartnerMarquee(){
 const [paused,setPaused]=useState(false);
 return <section className="partner-marquee" aria-label="Infrastructure partners">
   <header><p>Connected through our infrastructure partners</p><button type="button" aria-pressed={paused} onClick={()=>setPaused(!paused)}>{paused?"Resume motion":"Pause motion"}</button></header>
   <div className="partner-marquee-window"><div className="partner-marquee-track" data-paused={paused}>
     {[0,1].map(copy=><div className="partner-marquee-group" key={copy} aria-hidden={copy===1?true:undefined}>{partners.map(([id,name])=><div className="partner-marquee-logo" key={id}><Image src={`/branding/partners/${id}.svg`} alt={copy===0?name:""} width={170} height={48} unoptimized/></div>)}</div>)}
   </div></div>
   <p className="partner-marquee-note">Services and availability vary by route and region.</p>
 </section>;
}
