"use client";

import {useCallback,useEffect,useState} from "react";
import {AccountPage} from "@/components/account-page";
import {customerFetch} from "@/lib/customer-session";

type Categories={push:boolean;categories:{code:string;enabled:boolean;effective:boolean}[]};
type Rates={enabled:boolean;effective:boolean;localCurrency:string|null;timeZone:string|null;assets:{code:string;enabled:boolean}[]};
const labels:Record<string,string>={TRANSACTIONS:"Transactions",SUPPORT:"Support replies",VERIFICATION:"Verification & compliance",BANKING:"Banking",ACCOUNT:"Account updates",SECURITY:"Security",OTHER:"Other updates",RATE_UPDATES:"Rate updates"};
async function request<T>(path:string,body?:unknown):Promise<T>{
  const r=await customerFetch(`/api/notifications/${path}`,body===undefined?{}:{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const data=await r.json();if(!r.ok)throw new Error(data.title??"Unable to save settings");return data as T;
}
export function NotificationSettings(){
  const [categories,setCategories]=useState<Categories|null>(null),[rates,setRates]=useState<Rates|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const load=useCallback(async()=>{setError("");try{const [c,r]=await Promise.all([request<Categories>("categories"),request<Rates>("rate-alerts")]);setCategories(c);setRates(r);}catch(e){setError(e instanceof Error?e.message:"Unable to load settings");}},[]);
  useEffect(()=>{void load();const refresh=()=>{void load();};window.addEventListener("focus",refresh);return()=>window.removeEventListener("focus",refresh);},[load]);
  async function save(path:string,body:unknown){setBusy(true);setError("");setNotice("");try{await request(path,body);await load();setNotice("Preferences saved");}catch(e){setError(e instanceof Error?e.message:"Unable to save preferences");}finally{setBusy(false);}}
  const toggle=(label:string,value:boolean,onChange:(enabled:boolean)=>void,disabled=false)=><label className="account-settings-row" style={{cursor:disabled?"default":"pointer",gap:20,gridTemplateColumns:"minmax(0,1fr) auto"}}><span className="account-settings-copy"><strong>{label}</strong></span><input type="checkbox" role="switch" aria-label={label} checked={value} disabled={busy||disabled} onChange={e=>onChange(e.target.checked)} style={{width:22,height:22,accentColor:"var(--cyan, #08afc1)",flexShrink:0}}/></label>;
  return <AccountPage title="Notifications" copy="Choose which mobile push notifications you receive.">
    <section className="buy-soft-section"><header className="buy-soft-head"><div><span className="overview-kicker">Your preferences</span><h1>Notifications</h1><p>Email messages and your in-app activity remain available.</p></div></header>
      {error?<div role="alert"><p>{error}</p><button type="button" onClick={()=>void load()}>Try again</button></div>:null}
      <p role="status" aria-live="polite">{busy?"Saving…":notice||(!categories?"Loading preferences…":"Changes are saved automatically.")}</p>
      {categories?<div className="account-settings-list">
        {toggle("Allow mobile push notifications",categories.push,push=>void save("categories",{push}))}
        {!categories.push?<p>Push is off. Your category choices are saved for when you turn it back on.</p>:null}
        {categories.categories.map(c=><div key={c.code}>{toggle(labels[c.code]??c.code,c.enabled,enabled=>void save("categories",{categories:{[c.code]:enabled}}))}</div>)}
      </div>:null}
    </section>
    {rates?<section className="buy-soft-section"><header className="buy-soft-head"><div><h2>Currencies in your rate digest</h2><p>{rates.localCurrency?`Indicative prices in ${rates.localCurrency}. Schedule follows ${rates.timeZone}.`:"Rate digests are not available for your account's local currency yet."}</p><p>One combined update, containing the currencies you choose. Actual conversion quotes may differ.</p></div></header><div className="account-settings-list">
      {rates.assets.map(a=><div key={a.code}>{toggle(`${a.code}${rates.localCurrency?` / ${rates.localCurrency}`:""}`,a.enabled,enabled=>void save("rate-alerts",{assets:{[a.code]:enabled}}),a.code===rates.localCurrency)}</div>)}
      {!rates.assets.some(a=>a.enabled&&a.code!==rates.localCurrency)?<p>No currencies selected. You will not receive a rate digest.</p>:null}
    </div></section>:null}
  </AccountPage>;
}
