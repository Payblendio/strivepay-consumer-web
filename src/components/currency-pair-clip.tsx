"use client";

import {assetLogo,FIAT_FLAG,fiatLogo} from "./money-route-controls";

const PIXELS={sm:24,md:30,lg:36} as const;

function isFiat(code:string){
  return Boolean(FIAT_FLAG[code]);
}

function Disc({code,pixels}:{code:string;pixels:number}){
  const value=(code||"").trim().toUpperCase()||"—";
  return <span className="activity-clip-disc" data-kind={isFiat(value)?"fiat":"crypto"}>
    {isFiat(value)?fiatLogo(value,pixels):<span className="route-option-logo">{assetLogo(value,pixels)}</span>}
  </span>;
}

/** Overlapping sent→received currency marks (EasyRamp-style pair clip). */
export function CurrencyPairClip({
  from,
  to,
  size="sm",
}:{
  from:string|null|undefined;
  to:string|null|undefined;
  size?:keyof typeof PIXELS;
}){
  const pixels=PIXELS[size];
  return <span className="activity-clip" data-size={size} aria-hidden="true">
    <Disc code={from||""} pixels={pixels}/>
    <Disc code={to||""} pixels={pixels}/>
  </span>;
}

export function tradePairAssets(buy:boolean,sourceAsset?:string|null,destinationAsset?:string|null){
  if(buy)return{from:sourceAsset||"EUR",to:destinationAsset||"USDC"};
  return{from:sourceAsset||"USDC",to:destinationAsset||"EUR"};
}
