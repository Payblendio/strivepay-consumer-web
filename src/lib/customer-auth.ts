import {customerFetch} from "@/lib/customer-session";
import {apiErrorMessage} from "@/lib/api-error";

export class AuthApiError extends Error{
  status:number;
  constructor(message:string,status:number){
    super(message);
    this.status=status;
  }
}

export async function authApi<T>(path:string,init:RequestInit={}):Promise<T>{
  const response=await customerFetch(`/api/auth${path}`,{...init,headers:{Accept:"application/json",...init.headers}});
  const value=response.status===204?null:await response.json().catch(()=>null);
  if(!response.ok)throw new AuthApiError(apiErrorMessage(value,"That request could not be completed"),response.status);
  return value as T;
}

export async function signOut(navigate?:()=>void){
  try{
    await fetch("/api/auth/logout",{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json"},body:"{}",credentials:"same-origin"});
  }catch{
    // Clear local access even when the server session is already gone.
  }
  if(navigate)navigate();
  else if(typeof window!=="undefined")window.location.replace("/login");
}

export type {AuthSession,SessionFilter,SessionStatus} from "./customer-auth-format";
export {
  activeSessions,
  filterSessions,
  formatSessionStatus,
  formatSessionTime,
  sessionLabel,
  sessionStatus,
  sessionStatusClass,
} from "./customer-auth-format";
