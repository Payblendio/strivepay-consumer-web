"use client";
import Image from "next/image";
import Link from "next/link";
import {useState} from "react";
import {IconArrowDown, IconArrowRight, IconArrowsExchange, IconBuildingBank, IconCheck, IconCircleCheck, IconWallet} from "@tabler/icons-react";

export function RoutePreview(){
  const [direction,setDirection]=useState<"buy"|"sell">("buy");
  const buying=direction==="buy";
  return <div className="landing-product-layout">
    <div className="landing-product-story">
      <div className="landing-direction-switch" role="group" aria-label="Explore a transfer direction"><button type="button" aria-pressed={buying} onClick={()=>setDirection("buy")}>Buy crypto <IconArrowRight size={16}/></button><button type="button" aria-pressed={!buying} onClick={()=>setDirection("sell")}>Sell crypto <IconArrowRight size={16}/></button></div>
      <div className="landing-direction-copy" aria-live="polite"><h3>{buying?"Your bank transfer.\nYour choice of crypto.":"Your crypto.\nBack in your bank."}</h3><p>{buying?"Start with a bank transfer. Your chosen crypto arrives in the wallet you’ve connected.":"Choose a payout account, send crypto using its deposit instructions, and follow the proceeds into your bank."}</p><ul><li><IconCheck size={16}/>{buying?"Reusable pay-in account details":"Saved payout destinations"}</li><li><IconCheck size={16}/>{buying?"Your preferred asset and network":"Clear address and network instructions"}</li><li><IconCheck size={16}/>Updates at every step</li></ul></div>
      <Link href="/register" className="landing-text-link">Find your route <IconArrowRight size={18}/></Link>
    </div>
    <div className={`landing-product-stage ${direction}`}>
      <div className="landing-preview" aria-label={`${buying?"Buy":"Sell"} route illustration`}>
        <header><Image src="/branding/strivepay-mark.svg" width={25} height={30} alt=""/><span>YOUR MONEY ROUTE</span><IconArrowsExchange size={18}/></header>
        <div className="landing-preview-title"><span>{buying?"Bank → crypto":"Crypto → bank"}</span><h4>{buying?"A familiar way in.":"A simple way back."}</h4></div>
        <div className="landing-preview-endpoint"><span className={`landing-preview-icon ${buying?"fiat":"token"}`}><Image src={buying?"/branding/fiat/eu.svg":"/branding/crypto/usdc.svg"} alt="" width={34} height={34}/></span><div><small>{buying?"PAY FROM":"SEND"}</small><strong>{buying?"Your EUR bank account":"USDC"}</strong></div>{buying?<IconBuildingBank size={19}/>:<span className="landing-network-label">Ethereum</span>}</div>
        <div className="landing-preview-connector"><span/><IconArrowDown size={17}/><span/><small>StrivePay connects the route</small></div>
        <div className="landing-preview-endpoint"><span className={`landing-preview-icon ${buying?"token":"fiat"}`}><Image src={buying?"/branding/crypto/usdc.svg":"/branding/fiat/eu.svg"} alt="" width={34} height={34}/></span><div><small>{buying?"RECEIVE IN YOUR WALLET":"RECEIVE IN YOUR BANK"}</small><strong>{buying?"USDC on Ethereum":"Your EUR payout account"}</strong></div>{buying?<IconWallet size={19}/>:<IconBuildingBank size={19}/>}</div>
        <div className="landing-preview-progress"><IconCircleCheck size={19}/><span>Every step, in view.</span><span className="landing-progress-dots"><i/><i/><i/></span></div>
        <footer>Illustrative route · availability varies</footer>
      </div>
      <div className="landing-stage-caption"><span>{buying?"01 / BANK TO CRYPTO":"02 / CRYPTO TO BANK"}</span><span>Made to move <IconArrowRight size={14}/></span></div>
    </div>
  </div>;
}
