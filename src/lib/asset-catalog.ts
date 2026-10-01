import {useEffect,useState} from "react";

export type CatalogNetwork={code:string;name:string;railLabel?:string|null;logoUrl?:string|null;addressFamily?:string|null;addressPlaceholder?:string|null;addressHint?:string|null;explorerTxUrl?:string|null};
export type CatalogAsset={code:string;name:string;type:"CRYPTO"|"STABLECOIN"|string;decimalPlaces:number;coingeckoId?:string|null;logoUrl?:string|null;description?:string|null;websiteUrl?:string|null;whitepaperUrl?:string|null;explorerUrl?:string|null;sortOrder:number;featured:boolean;routeToken:boolean;networks:CatalogNetwork[]};

let snapshot:CatalogAsset[]=[];
let pending:Promise<CatalogAsset[]>|null=null;
const listeners=new Set<(assets:CatalogAsset[])=>void>();

/** Active crypto catalog from the database; admins switch assets and networks on/off from the admin Assets page. */
export function loadAssetCatalog():Promise<CatalogAsset[]>{
  if(!pending){
    pending=fetch("/api/catalog")
      .then(response=>response.ok?response.json():[])
      .then((value:unknown)=>{snapshot=Array.isArray(value)?value as CatalogAsset[]:[];listeners.forEach(listener=>listener(snapshot));return snapshot;})
      .catch(()=>{pending=null;return snapshot;});
  }
  return pending;
}

export function catalogAsset(code:string|null|undefined){
  const key=(code??"").toUpperCase();
  return snapshot.find(item=>item.code===key)??null;
}

export function catalogNetwork(code:string|null|undefined){
  const key=(code??"").toUpperCase();
  for(const asset of snapshot){const network=asset.networks.find(item=>item.code===key);if(network)return network;}
  return null;
}

export function useAssetCatalog():CatalogAsset[]{
  const [assets,setAssets]=useState<CatalogAsset[]>(snapshot);
  useEffect(()=>{
    listeners.add(setAssets);
    void loadAssetCatalog();
    return ()=>{listeners.delete(setAssets);};
  },[]);
  return assets;
}

type RoutableAsset={code:string;name:string;type:string;sortOrder?:number|null;routeToken?:boolean|null;networks:Array<{code:string}>};

/** Crypto routes use every deliverable network; stablecoins only when the catalog marks them as route tokens. */
export function routableAssets<T extends RoutableAsset>(assets:T[]|null|undefined):T[]{
  return (assets??[])
    .filter(item=>item.networks.length>0&&(item.type==="CRYPTO"||item.type==="STABLECOIN"&&item.routeToken===true))
    .sort((a,b)=>(a.sortOrder??Number.MAX_SAFE_INTEGER)-(b.sortOrder??Number.MAX_SAFE_INTEGER)||a.name.localeCompare(b.name));
}

/** First catalog stablecoin route token, used where a screen needs an illustrative default asset. */
export function defaultRouteToken(){
  return snapshot.find(item=>item.routeToken)?.code??"";
}

export function assetDecimals(code:string,fallback=6){
  const places=catalogAsset(code)?.decimalPlaces;
  return typeof places==="number"?Math.min(places,8):fallback;
}
