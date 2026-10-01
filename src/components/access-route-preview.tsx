"use client";

import {useAssetCatalog} from "@/lib/use-asset-catalog";

const FIAT=[{code:"EUR",href:"/branding/fiat/eu.svg"},{code:"USD",href:"/branding/fiat/us.svg"},{code:"GBP",href:"/branding/fiat/gb.svg"}];

export function AccessRoutePreview(){
  const crypto=useAssetCatalog().filter(item=>item.featured).slice(0,3).map(item=>({code:item.code.replace("_","."),href:item.logoUrl??""}));
  const rows=[...FIAT.map((item,index)=>({...item,x:25,y:50+index*100})),...crypto.map((item,index)=>({...item,x:410,y:50+index*100}))];
  return <div className="access-product-preview" aria-hidden="true">
    <svg viewBox="0 0 600 350" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false">
      <defs><clipPath id="access-preview-round"><circle cx="28" cy="25" r="16"/></clipPath></defs>
      <rect width="600" height="350" fill="#1A1C24"/>
      {[75,175,275].map(y=><g key={y} stroke="#3A6B72" strokeWidth="2"><path d={`M190 ${y} C240 ${y} 250 175 280 175`}/>{crypto.length?<path d={`M320 175 C350 175 360 ${y} 410 ${y}`}/>:null}</g>)}
      {rows.map(item=><g key={item.code} transform={`translate(${item.x} ${item.y})`}><rect width="165" height="50" fill="#12141A"/>{item.href?<image href={item.href} x="12" y="9" width="32" height="32" clipPath="url(#access-preview-round)" preserveAspectRatio="xMidYMid slice"/>:null}<text x="56" y="31" fill="#F2F3F5" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="17">{item.code}</text></g>)}
      <circle cx="300" cy="175" r="42" fill="#162830" stroke="#2A5A62"/>
      <image href="/branding/strivepay-mark.svg" x="284" y="153" width="32" height="44"/>
    </svg>
  </div>;
}
