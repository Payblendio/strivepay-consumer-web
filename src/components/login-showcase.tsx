"use client";
import Image from "next/image";
import Link from "next/link";
import {useEffect,useState,type ReactNode} from "react";
import {IconArrowLeft,IconArrowRight,IconPlayerPause,IconPlayerPlay} from "@tabler/icons-react";
import "./login-showcase.css";

export function LoginShowcase({children}:{children:ReactNode}){
  const [sell,setSell]=useState(false);
  const [paused,setPaused]=useState(false);
  useEffect(()=>{
    if(paused||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const timer=window.setInterval(()=>setSell(v=>!v),7000);
    return()=>window.clearInterval(timer);
  },[paused]);
  return <div className={`login-scene ${sell?'selling':'buying'}`}>
    <div className="login-outside" aria-hidden="true"><Image src="/illustrations/login-trading.png" alt="" fill sizes="70vw"/></div>
    <div className="login-inset access-shell">
      <aside className="login-ad" aria-label="Buy and sell with StrivePay">
        <header><span>MORE WAYS TO MOVE</span><Link href="/register">Get started ↗</Link></header>
        <div className="login-ad-copy"><span>{sell?'CRYPTO TO BANK':'BANK TO CRYPTO'}</span><h1>{sell?<>Your crypto.<br/>Your next move.</>:<>From your bank.<br/>Into possibility.</>}</h1><p>{sell?'Sell crypto into your chosen bank account. Follow every step in one place.':'Buy crypto with a bank transfer. Choose your asset and your receiving wallet.'}</p></div>
        <div className="login-inside" aria-hidden="true"><Image src="/illustrations/login-trading.png" alt="" fill sizes="(max-width:760px) 0px, 45vw" priority/></div>
        <footer><div className="login-route-signature"><div className="login-currency-clip">{(sell?['btc','eth','usdc']:['eu','us','gb']).map(code=><Image key={code} src={`/branding/${sell?'crypto':'fiat'}/${code}.svg`} width={34} height={34} alt={code.toUpperCase()}/>)}</div><div><strong>{sell?'Sell crypto':'Buy crypto'}</strong><small>{sell?'Crypto → bank money':'Bank money → crypto'}</small></div></div><div className="login-ad-controls"><button aria-label="Previous advert" onClick={()=>setSell(v=>!v)}><IconArrowLeft size={16}/></button><button aria-label={paused?'Play adverts':'Pause adverts'} onClick={()=>setPaused(v=>!v)}>{paused?<IconPlayerPlay size={15}/>:<IconPlayerPause size={15}/>}</button><button aria-label="Next advert" onClick={()=>setSell(v=>!v)}><IconArrowRight size={16}/></button></div></footer>
      </aside>
      <main className="login-form-panel"><Link href="/" aria-label="StrivePay home"><Image src="/branding/strivepay-logo-dark.svg" width={155} height={50} alt="StrivePay"/></Link><div className="login-form-content">{children}</div><p className="login-private">Never share your password or security code.</p></main>
    </div>
  </div>;
}
