"use client";

import {useEffect,useState,type ReactNode} from "react";
import {IconArrowDownLeft,IconArrowUpRight} from "@tabler/icons-react";
import {CurrencyPairClip,tradePairAssets} from "./currency-pair-clip";
import {
  formatTradeAmount,
  isBuyDirection,
  orderStatusClass,
  formatOrderStatus,
  tradeDirectionLabel,
} from "./dashboard-route-copy";
import type {SupportActivity} from "@/lib/support-activity";

type Activity=SupportActivity;
type Facts={
  direction:string;
  status:string;
  sourceAsset:string|null;
  sourceAmount:string|null;
  destinationAsset:string|null;
  destinationAmount:string|null;
  createdAt:string;
};

function asIsoTime(value:unknown){
  if(typeof value==="string"&&Number.isFinite(Date.parse(value)))return value;
  if(typeof value==="number"&&Number.isFinite(value))return new Date(value).toISOString();
  return null;
}

function asAmount(value:unknown){
  if(value===null||value===undefined)return null;
  if(typeof value==="number"&&Number.isFinite(value))return String(value);
  if(typeof value==="string"&&/^-?\d{1,38}(?:\.\d{1,18})?$/.test(value))return value;
  return undefined;
}

function parseFacts(value:unknown):Facts|null{
  if(!value||typeof value!=="object")return null;
  const raw=value as Record<string,unknown>;
  const createdAt=asIsoTime(raw.createdAt);
  const sourceAmount=asAmount(raw.sourceAmount);
  const destinationAmount=asAmount(raw.destinationAmount);
  if(typeof raw.direction!=="string"||typeof raw.status!=="string"||!createdAt)return null;
  if(sourceAmount===undefined||destinationAmount===undefined)return null;
  if(![raw.sourceAsset,raw.destinationAsset].every(item=>item===null||typeof item==="string"))return null;
  return {
    direction:raw.direction,
    status:raw.status,
    sourceAsset:raw.sourceAsset as string|null,
    sourceAmount,
    destinationAsset:raw.destinationAsset as string|null,
    destinationAmount,
    createdAt,
  };
}

function LinkedActivityCard({activity,facts,actions}:{activity:Activity;facts:Facts;actions?:ReactNode}){
  const href=`/dashboard/activity/${activity.id}`;
  const buy=isBuyDirection(facts.direction);
  const pair=tradePairAssets(buy,facts.sourceAsset,facts.destinationAsset);
  return <aside className="support-linked-activity" aria-label="Linked transaction">
    <div className="support-linked-activity-lead">
      <span className="activity-direction support-linked-direction">
        <CurrencyPairClip from={pair.from} to={pair.to} size="sm"/>
        {buy?<IconArrowUpRight size={14}/>:<IconArrowDownLeft size={14}/>}
        {tradeDirectionLabel(facts.direction,facts.status)}
      </span>
      <span className={`activity-status ${orderStatusClass(facts.status)}`}>{formatOrderStatus(facts.status)}</span>
    </div>
    <div className="support-linked-amounts">
      <span><small>Sent</small>{formatTradeAmount(facts.sourceAmount,facts.sourceAsset)}</span>
      <span><small>{facts.destinationAmount!=null?"Received":"Destination"}</small>{formatTradeAmount(facts.destinationAmount,facts.destinationAsset)}</span>
    </div>
    <a href={href} target="_blank" rel="noopener noreferrer">Open transaction ↗</a>
    {actions}
  </aside>;
}

type TicketProps={ticketId:string;revision:number;request:(path:string,init?:RequestInit)=>Promise<unknown>};

export function SupportLinkedActivity({ticketId,revision,request}:TicketProps){
  const [activity,setActivity]=useState<Activity|null>(null);
  const [facts,setFacts]=useState<Facts|null>(null);
  const [ready,setReady]=useState(false);

  useEffect(()=>{
    const controller=new AbortController();
    setReady(false);
    void request(`tickets/${ticketId}/activity`,{signal:controller.signal}).then(value=>{
      const data=value as {activity?:Activity|null;facts?:unknown};
      if(!data||!("activity" in data))throw new Error("Invalid activity response");
      const item=data.activity;
      if(item!==null&&(!item||!["RAMP","CONVERSION","ORDER"].includes(item.kind)||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id))){
        throw new Error("Invalid activity");
      }
      const nextFacts=data.facts==null?null:parseFacts(data.facts);
      if(data.facts!=null&&!nextFacts)throw new Error("Invalid transaction facts");
      if(!controller.signal.aborted){
        setActivity(item??null);
        setFacts(nextFacts);
        setReady(true);
      }
    }).catch(()=>{
      if(!controller.signal.aborted){setActivity(null);setFacts(null);setReady(true);}
    });
    return()=>controller.abort();
  },[ticketId,revision,request]);

  if(!ready||!activity||!facts)return null;
  return <LinkedActivityCard activity={activity} facts={facts}/>;
}

type PreviewProps={
  activity:SupportActivity;
  request:(path:string,init?:RequestInit)=>Promise<unknown>;
  onRemove:()=>void;
  busy?:boolean;
};

/** Rich linked-transaction card while composing a new support request. */
export function SupportLinkedActivityPreview({activity,request,onRemove,busy=false}:PreviewProps){
  const [facts,setFacts]=useState<Facts|null>(null);
  const [ready,setReady]=useState(false);

  useEffect(()=>{
    const controller=new AbortController();
    setReady(false);
    void request(`activity-preview?kind=${encodeURIComponent(activity.kind)}&id=${encodeURIComponent(activity.id)}`,{signal:controller.signal}).then(value=>{
      const data=value as {activity?:Activity|null;facts?:unknown};
      if(!data||!("activity" in data))throw new Error("Invalid activity response");
      const nextFacts=data.facts==null?null:parseFacts(data.facts);
      if(!nextFacts)throw new Error("Invalid transaction facts");
      if(!controller.signal.aborted){setFacts(nextFacts);setReady(true);}
    }).catch(()=>{
      if(!controller.signal.aborted){setFacts(null);setReady(true);}
    });
    return()=>controller.abort();
  },[activity.kind,activity.id,request]);

  const remove=<button type="button" disabled={busy} onClick={onRemove}>Remove transaction link</button>;

  if(!ready){
    return <aside className="support-linked-activity support-linked-preview" aria-busy="true">
      <p className="support-linked-loading" role="status">Loading linked transaction…</p>
      {remove}
    </aside>;
  }

  if(!facts){
    return <aside className="support-linked-activity support-linked-preview" aria-label="Linked transaction">
      {remove}
    </aside>;
  }

  return <div className="support-linked-preview">
    <LinkedActivityCard activity={activity} facts={facts} actions={remove}/>
  </div>;
}
