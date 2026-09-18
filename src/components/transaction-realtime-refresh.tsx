"use client";
import {useEffect} from "react";
import {useRouter} from "next/navigation";
import {connectSharedSupport} from "@/lib/support-shared-connection";
import {customerFetch} from "@/lib/customer-session";
import type {SupportConnectionTicket} from "@/lib/support-connection";
export function TransactionRealtimeRefresh({scope}:{scope:string}){
  const router=useRouter();
  useEffect(()=>connectSharedSupport({scope,requestTicket:async signal=>{const response=await customerFetch("/api/support/socket-ticket",{method:"POST",signal,headers:{"X-StrivePay-Account-Scope":scope}});if(response.status===401||response.status===403)return null;if(!response.ok)throw new Error("Realtime connection unavailable");return await response.json() as SupportConnectionTicket;},onChange:()=>{},onTransactionChange:()=>router.refresh(),onState:()=>{}}),[router,scope]);
  return null;
}
