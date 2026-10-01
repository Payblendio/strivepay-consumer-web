"use client";

import {useState} from "react";
import {catalogAsset,catalogNetwork} from "@/lib/asset-catalog";
import {useAssetCatalog} from "@/lib/use-asset-catalog";

/** Remote logos come in square and round artwork; the frame crops every one to a circle. */
function RoundLogo({src,label,size}:{src?:string|null;label:string;size:number}){
  const [failed,setFailed]=useState<string|null>(null);
  const initials=label.replace(/[^A-Za-z0-9]/g,"").slice(0,3).toUpperCase();
  return <span className="crypto-logo" style={{width:size,height:size}}>
    {src&&failed!==src
      ?<img src={src} alt={`${label} logo`} width={size} height={size} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(src)}/>
      :<b style={{fontSize:Math.max(8,Math.round(size*.32))}}>{initials}</b>}
  </span>;
}

export function AssetLogo({code,size=38,url}:{code:string;size?:number;url?:string|null}){
  useAssetCatalog();
  return <RoundLogo src={url??catalogAsset(code)?.logoUrl} label={code.replace("_",".")} size={size}/>;
}

export function NetworkLogo({code,size=38,url}:{code:string;size?:number;url?:string|null}){
  useAssetCatalog();
  const network=catalogNetwork(code);
  return <RoundLogo src={url??network?.logoUrl} label={network?.name??code} size={size}/>;
}
