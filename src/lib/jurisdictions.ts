"use client";
import {useCallback,useEffect,useState} from "react";

export type Jurisdiction={code:string;name:string;individualSupported:boolean;corporateSupported:boolean};
export type JurisdictionUse="individual"|"corporate";

export function supportedCodes(jurisdictions:Jurisdiction[],use:JurisdictionUse){
  return jurisdictions.filter(item=>use==="corporate"?item.corporateSupported:item.individualSupported).map(item=>item.code.toUpperCase());
}

/** Countries StrivePay may onboard, sourced from Bakkt via the API. The server enforces the same list. */
export function useJurisdictions(){
  const[jurisdictions,setJurisdictions]=useState<Jurisdiction[]|null>(null);
  const[error,setError]=useState("");
  const load=useCallback(async()=>{
    setError("");
    try{
      const response=await fetch("/api/jurisdictions",{headers:{Accept:"application/json"}});
      const data=await response.json().catch(()=>null);
      if(!response.ok||!Array.isArray(data)||data.length===0)throw new Error();
      setJurisdictions(data as Jurisdiction[]);
    }catch{
      setError("We couldn’t load the countries we support. Check your connection and try again.");
    }
  },[]);
  useEffect(()=>{void load();},[load]);
  return{jurisdictions,error,reload:load};
}
