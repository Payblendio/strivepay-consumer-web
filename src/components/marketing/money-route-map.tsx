"use client";

import {useEffect,useRef,useState} from "react";
import {IconArrowRight,IconBuildingBank,IconWallet,IconArrowsExchange} from "@tabler/icons-react";
import "./money-route-map.css";

const routes={
  buy:{label:"Buy crypto",from:"Bank transfer",fromNote:"Fund your available pay-in account",to:"Your receiving wallet",toNote:"Use the exact asset and network shown",steps:["Choose your funding route","Follow the deposit instructions","Track delivery to your wallet"]},
  sell:{label:"Sell crypto",from:"Crypto deposit",fromNote:"Send the exact asset on its matching network",to:"Your payout account",toNote:"Receive funds in your chosen bank account",steps:["Choose your payout destination","Get your crypto deposit instructions","Track conversion and bank settlement"]},
};

export function MoneyRouteMap(){
  const [mode,setMode]=useState<"buy"|"sell">("buy");
  const section=useRef<HTMLElement>(null);
  useEffect(()=>{
    const target=section.current;
    if(!target||!window.IntersectionObserver)return;
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){target.classList.add("route-map-entered");observer.disconnect();}
    },{threshold:.2});
    observer.observe(target);return()=>observer.disconnect();
  },[]);
  const route=routes[mode];
  return <section ref={section} className="money-route-map" aria-labelledby="route-map-title">
    <header><div><p className="landing-eyebrow">FOLLOW THE FLOW</p><h2 id="route-map-title">Two directions.<br/><span>One clear route.</span></h2></div><p>From the account you fund to the destination you choose. See how each step connects.</p></header>
    <div className="route-map-controls" role="group" aria-label="Explore a money route">{Object.entries(routes).map(([key,value])=><button key={key} type="button" aria-pressed={mode===key} onClick={()=>setMode(key as "buy"|"sell")}>{value.label}<IconArrowRight size={17}/></button>)}</div>
    <div className="route-map-panel" aria-live="polite" aria-atomic="true">
      <div className="route-map-diagram" key={mode}>
        <div className="route-map-endpoint"><span className="route-map-symbol">{mode==="buy"?<IconBuildingBank/>:<IconWallet/>}</span><small>YOU SEND</small><h3>{route.from}</h3><p>{route.fromNote}</p></div>
        <span className="route-map-line" aria-hidden="true"/>
        <div className="route-map-center"><IconArrowsExchange size={32}/><strong>StrivePay</strong><span>Conversion & tracking</span></div>
        <span className="route-map-line" aria-hidden="true"/>
        <div className="route-map-endpoint"><span className="route-map-symbol">{mode==="buy"?<IconWallet/>:<IconBuildingBank/>}</span><small>YOU RECEIVE</small><h3>{route.to}</h3><p>{route.toNote}</p></div>
      </div>
      <ol className="route-map-steps">{route.steps.map((step,index)=><li key={step}><span>0{index+1}</span>{step}</li>)}</ol>
    </div>
    <p className="route-map-disclaimer">A guide to the flow, not a live transfer. Available routes, fees and timing depend on your account, currency and network.</p>
  </section>;
}
