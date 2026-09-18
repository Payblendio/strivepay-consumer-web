"use client";

import {useEffect,useState} from "react";
import QRCode from "qrcode";

export function DepositQr({value,label}:{value:string;label:string}){
  const [src,setSrc]=useState("");
  useEffect(()=>{
    let cancelled=false;
    if(!value){setSrc("");return;}
    void QRCode.toDataURL(value,{errorCorrectionLevel:"M",margin:1,width:220,color:{dark:"#0a1a35",light:"#ffffff"}})
      .then(url=>{if(!cancelled)setSrc(url);})
      .catch(()=>{if(!cancelled)setSrc("");});
    return()=>{cancelled=true;};
  },[value]);
  if(!src)return <div className="sell-qr-fallback" aria-hidden="true"/>;
  return <img className="sell-qr-image" src={src} alt={label} width={220} height={220}/>;
}
