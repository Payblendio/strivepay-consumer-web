"use client";

import {useCallback,useEffect,useState} from "react";
import {IconAlertTriangle,IconBuildingBank,IconLoader2,IconPlus,IconRefresh,IconLinkOff} from "@tabler/icons-react";
import {useToast} from "@/components/ui/toast";
import {customerFetch} from "@/lib/customer-session";
import {loadErrorMessage,withDeadline} from "./account-readiness";

export type LinkedBankAccount={
  id:string;
  accountName?:string|null;
  bankName?:string|null;
  currency?:string|null;
  accountType?:string|null;
  accountMask?:string|null;
  status:string;
  updatedAt?:string|null;
};

type BankLink={
  status:string;
  linkSessionId:string;
  continueUrl:string;
  hostedLinkUrl?:string|null;
  expiresAt?:string|null;
};

type AchPullResult={
  id:string;
  providerProcessId:string;
  status:string;
  amount:number|string;
  currency:string;
};

async function linkedBankApi<T>(path="",init:RequestInit={}){
  const response=await customerFetch(`/api/linked-bank-accounts${path}`,{
    ...init,
    headers:{Accept:"application/json","Content-Type":"application/json",...(init.headers||{})},
  });
  if(response.status===204)return undefined as T;
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    const title=typeof data?.title==="string"?data.title:loadErrorMessage(data,"Linked bank request failed");
    throw new Error(title);
  }
  return data as T;
}

export function LinkedBankAchSection({enabled,canMutate}:{enabled:boolean;canMutate:boolean}){
  const {show}=useToast();
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState("");
  const [accounts,setAccounts]=useState<LinkedBankAccount[]>([]);
  const [error,setError]=useState("");
  const [pullAccountId,setPullAccountId]=useState("");
  const [amount,setAmount]=useState("");

  const load=useCallback(async(refresh=false)=>{
    if(!enabled){setAccounts([]);return;}
    setLoading(true);
    setError("");
    try{
      const rows=await withDeadline(linkedBankApi<LinkedBankAccount[]>(refresh?"?refresh=true":""),15000,"Linked banks timed out");
      setAccounts(Array.isArray(rows)?rows:[]);
    }catch(problem){
      setError(loadErrorMessage(problem,"US linked banks could not be loaded."));
      setAccounts([]);
    }finally{
      setLoading(false);
    }
  },[enabled]);

  useEffect(()=>{void load(false);},[load]);

  if(!enabled)return null;

  async function ensureProfileAndLink(){
    if(!canMutate||busy)return;
    setBusy("link");
    try{
      await linkedBankApi("/profile",{method:"POST",body:JSON.stringify({country:"US"})});
      const link=await linkedBankApi<BankLink>("/link",{method:"PUT"});
      const url=link.hostedLinkUrl?.trim()||(link.continueUrl?`/api/linked-bank-accounts/link/${link.linkSessionId}`:"");
      if(!url)throw new Error("Bank link URL was not returned");
      window.open(url.startsWith("http")?url:link.hostedLinkUrl||url,"_blank","noopener,noreferrer");
      show({tone:"success",title:"Continue in Plaid",message:"Finish linking in the secure Bakkt window, then refresh."});
      await load(true);
    }catch(problem){
      show({tone:"danger",title:"Could not start bank link",message:loadErrorMessage(problem,"Send a new email code, then try again.")});
    }finally{
      setBusy("");
    }
  }

  async function unlink(id:string){
    if(!canMutate||busy)return;
    setBusy(`unlink-${id}`);
    try{
      await linkedBankApi(`/${id}`,{method:"DELETE"});
      show({tone:"success",title:"Bank unlinked",message:"That US bank account is no longer linked."});
      await load(true);
    }catch(problem){
      show({tone:"danger",title:"Could not unlink",message:loadErrorMessage(problem,"Try again after verifying your session.")});
    }finally{
      setBusy("");
    }
  }

  async function pull(){
    if(!canMutate||busy||!pullAccountId)return;
    const value=Number(amount);
    if(!Number.isFinite(value)||value<=0){
      show({tone:"danger",title:"Enter an amount",message:"ACH pull needs a positive USD amount."});
      return;
    }
    setBusy("pull");
    try{
      const result=await linkedBankApi<AchPullResult>("/pull",{method:"POST",body:JSON.stringify({linkedBankAccountId:pullAccountId,amount:value})});
      show({tone:"success",title:"ACH pull submitted",message:`Status ${result.status}. Up to 3 pulls every 24 hours.`});
      setAmount("");
      await load(true);
    }catch(problem){
      show({tone:"danger",title:"ACH pull failed",message:loadErrorMessage(problem,"Check the linked account is ACTIVE and limits allow another pull.")});
    }finally{
      setBusy("");
    }
  }

  const active=accounts.filter(a=>a.status==="ACTIVE");
  const canLinkMore=accounts.filter(a=>a.status!=="UNLINKED").length<2;

  return <section className="buy-soft-section" aria-labelledby="accounts-ach-title">
    <header className="buy-soft-head">
      <div>
        <span className="overview-kicker">US ACH pull</span>
        <h2 id="accounts-ach-title">Linked bank (Plaid)</h2>
        <p>Optional shortcut: link your US bank once, then pull USD into StrivePay. For first-time funding, request a USD pay-in account on Buy, copy the deposit details, and transfer from your bank.</p>
      </div>
      <div className="accounts-ach-actions">
        <button type="button" className="compliance-secondary" disabled={loading||Boolean(busy)} onClick={()=>void load(true)}>
          {loading?<IconLoader2 className="spin" size={16}/>:<IconRefresh size={16}/>} Refresh
        </button>
        {canMutate&&canLinkMore?<button type="button" className="compliance-secondary" disabled={Boolean(busy)} onClick={()=>void ensureProfileAndLink()}>
          {busy==="link"?<IconLoader2 className="spin" size={16}/>:<IconPlus size={16}/>} Link with Plaid
        </button>:null}
      </div>
    </header>

    {error?<div className="accounts-status-banner warning" role="alert">
      <IconAlertTriangle size={18}/>
      <div><strong>Linked banks unavailable</strong><p>{error}</p></div>
    </div>:null}

    {loading&&accounts.length===0?<div className="compliance-loading"><IconLoader2 className="spin"/>Loading linked banks…</div>
    :accounts.length===0?<div className="accounts-status-banner" role="status">
      <IconBuildingBank size={18}/>
      <div><strong>No US bank linked</strong><p>{canMutate?"Create a linked-bank profile and open Plaid to connect an account.":"No linked US bank is available to view."}</p></div>
    </div>:<div className="buy-deposit-list" role="list">
      {accounts.map(account=>{
        const ready=account.status==="ACTIVE";
        return <article className={`activity-soft buy-deposit-card${!ready?" not-ready":""}`} key={account.id} role="listitem">
          <header className="buy-deposit-card-head">
            <span className="buy-settlement-title">
              <strong>{account.bankName||account.accountName||"US bank"}</strong>
              <small>{[account.accountType,account.accountMask,account.currency||"USD"].filter(Boolean).join(" · ")}</small>
            </span>
            <span className={`sell-destination-status${ready?" ready":""}`}>{account.status}</span>
          </header>
          {canMutate?<div className="accounts-ach-row-actions">
            <button type="button" className="compliance-secondary" disabled={Boolean(busy)} onClick={()=>void unlink(account.id)}>
              {busy===`unlink-${account.id}`?<IconLoader2 className="spin" size={16}/>:<IconLinkOff size={16}/>} Unlink
            </button>
          </div>:null}
        </article>;
      })}
    </div>}

    {canMutate&&active.length>0?<div className="accounts-ach-pull">
      <label>
        <span>Pull from</span>
        <select value={pullAccountId} onChange={e=>setPullAccountId(e.target.value)}>
          <option value="">Select ACTIVE account</option>
          {active.map(a=><option key={a.id} value={a.id}>{a.bankName||a.accountName||a.accountMask||a.id}</option>)}
        </select>
      </label>
      <label>
        <span>Amount (USD)</span>
        <input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="100.00"/>
      </label>
      <button type="button" className="compliance-primary" disabled={Boolean(busy)||!pullAccountId} onClick={()=>void pull()}>
        {busy==="pull"?<IconLoader2 className="spin" size={16}/>:null} Pull ACH
      </button>
    </div>:null}
  </section>;
}
