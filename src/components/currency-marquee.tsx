"use client";

import {AssetLogo} from "./ui/crypto-logo";
import {useAssetCatalog} from "@/lib/use-asset-catalog";

export function CurrencyMarquee(){
  const assets=useAssetCatalog();
  if(!assets.length)return null;
  return <div className="currency-rail" aria-label="Supported crypto assets"><div className="currency-track">{[...assets,...assets].map((asset,index)=><span className="currency-token" key={`${asset.code}-${index}`} aria-hidden={index>=assets.length}><AssetLogo code={asset.code} url={asset.logoUrl} size={25}/><b>{asset.code.replace("_",".")}</b></span>)}</div></div>;
}
