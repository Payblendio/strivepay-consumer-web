import {formatOrderStatus} from "./dashboard-route-copy";

const READY_STATUSES=new Set(["ACTIVE","READY","VERIFIED"]);

/** Account is safe to fund against or sell into. COMPLETE alone is not enough. */
export function isAccountReady(status:string){
  return READY_STATUSES.has(status.toUpperCase());
}

export function accountReadinessLabel(status:string){
  if(isAccountReady(status))return "Ready";
  const normalized=status.toUpperCase();
  if(["PENDING","PROCESSING","CREATED","WAITING_CREATION","IN_REVIEW"].includes(normalized))return "Pending";
  if(["FAILED","REJECTED","DISABLED","CLOSED"].includes(normalized))return "Unavailable";
  const formatted=formatOrderStatus(status);
  return formatted==="—"?"Pending":formatted;
}

export function accountReadinessHint(status:string){
  if(isAccountReady(status))return null;
  const label=accountReadinessLabel(status);
  if(label==="Pending")return "Details are still being prepared. Do not send money until this shows Ready.";
  if(label==="Unavailable")return "This account cannot be used right now.";
  return "Wait until this account is Ready before sending funds.";
}

export class LoadTimeoutError extends Error{
  constructor(message="Request timed out"){
    super(message);
    this.name="LoadTimeoutError";
  }
}

/** Rejects on timeout instead of resolving a fake empty value. */
export function withDeadline<T>(promise:Promise<T>,ms=12000,message="Request timed out"):Promise<T>{
  return new Promise<T>((resolve,reject)=>{
    const timer=window.setTimeout(()=>reject(new LoadTimeoutError(message)),ms);
    promise.then(
      value=>{window.clearTimeout(timer);resolve(value);},
      error=>{window.clearTimeout(timer);reject(error);},
    );
  });
}

export function loadErrorMessage(error:unknown,fallback="Your accounts could not be loaded"){
  if(error instanceof LoadTimeoutError)return "Loading took too long. Check your connection and try again.";
  if(error instanceof Error&&error.message.trim())return error.message;
  return fallback;
}
