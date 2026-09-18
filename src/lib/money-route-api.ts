import {customerFetch} from "@/lib/customer-session";
import {apiErrorMessage} from "@/lib/api-error";

export class RouteError extends Error{
  status:number;
  type?:string;
  constructor(message:string,status:number,type?:string){
    super(message);
    this.status=status;
    this.type=type;
  }
}

export async function moneyRouteApi<T>(path:string,init:RequestInit={}):Promise<T>{
  const response=await customerFetch(`/api/onboarding/money-routes${path}`,{...init,headers:{Accept:"application/json",...init.headers}});
  const value=response.status===204?null:await response.json().catch(()=>null);
  if(!response.ok)throw new RouteError(apiErrorMessage(value,"That setup step could not be completed"),response.status,typeof value==="object"&&value&&"type" in value?String((value as {type?:string}).type):undefined);
  return value as T;
}

export async function sessionApi<T>(path:string,init:RequestInit={}):Promise<T>{
  const response=await customerFetch(`/api/onboarding${path}`,{...init,headers:{Accept:"application/json",...init.headers}});
  const value=response.status===204?null:await response.json().catch(()=>null);
  if(!response.ok)throw new RouteError(apiErrorMessage(value,"The secure session could not continue"),response.status,typeof value==="object"&&value&&"type" in value?String((value as {type?:string}).type):undefined);
  return value as T;
}

export function sessionRequired(problem:unknown){
  return problem instanceof RouteError&&["verification_session_expired","verification_session_required","provider_session_required"].includes(problem.type??"");
}

export type BankAccountPage<T>={page:number;size:number;total:number;items:T[]};

/** Accepts either a legacy array response or the paginated bank-accounts page. */
export function bankAccountItems<T>(value:unknown):T[]{
  if(Array.isArray(value))return value as T[];
  if(value&&typeof value==="object"&&Array.isArray((value as BankAccountPage<T>).items))return (value as BankAccountPage<T>).items;
  return [];
}

export function titleCase(value:string){
  return value.replace(/([a-z0-9])([A-Z])/g,"$1 $2").replaceAll("_"," ").replace(/\b\w/g,letter=>letter.toUpperCase());
}

const EVM_NETWORKS=new Set(["ETHEREUM","BSC","BNB_SMART_CHAIN","POLYGON","OPTIMISM","OP_MAINNET","ARBITRUM","CELO","BASE","AVALANCHE","BNB","ETH"]);
const BASE58="1-9A-HJ-NP-Za-km-z";

/** Network-specific receiving-address pattern checks (format only, not on-chain). */
export function walletAddressValid(network:string,wallet:string){
  const address=wallet.trim();
  if(!address||/\s/.test(address))return false;
  const net=network.trim().toUpperCase().replace(/[\s-]+/g,"_");
  if(EVM_NETWORKS.has(net))return /^0x[0-9a-fA-F]{40}$/.test(address);
  if(net==="BITCOIN"||net==="BTC")return /^(bc1[ac-hj-np-z02-9]{11,71}|[13][1-9A-HJ-NP-Za-km-z]{25,34})$/i.test(address);
  if(net==="BITCOIN_CASH"||net==="BCH")return /^(bitcoincash:)?(q|p)[a-z0-9]{41}$/i.test(address)||/^[13][1-9A-HJ-NP-Za-km-z]{25,34}$/.test(address);
  if(net==="LITECOIN"||net==="LTC")return /^(ltc1[ac-hj-np-z02-9]{11,71}|[LM][1-9A-HJ-NP-Za-km-z]{25,34})$/i.test(address);
  if(net==="DOGE"||net==="DOGECOIN")return new RegExp(`^D[${BASE58}]{33}$`).test(address);
  if(net==="DASH")return new RegExp(`^X[${BASE58}]{33}$`).test(address);
  if(net==="SOLANA"||net==="SOL"||net==="SPL")return new RegExp(`^[${BASE58}]{32,44}$`).test(address);
  if(net==="TRON"||net==="TRX"||net==="TRC20")return new RegExp(`^T[${BASE58}]{33}$`).test(address);
  if(net==="RIPPLE"||net==="XRP")return new RegExp(`^r[${BASE58}]{24,34}$`).test(address);
  if(net==="CARDANO"||net==="ADA")return /^addr1[a-z0-9]{20,200}$/i.test(address);
  if(net==="STELLAR"||net==="XLM")return /^G[A-Z2-7]{55}$/.test(address);
  return address.length>=20&&!/\s/.test(address);
}
