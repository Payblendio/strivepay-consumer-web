export type AccountScope="PERSONAL"|"BUSINESS";

export const ACCOUNT_SCOPE_COOKIE="sp_account_scope";
export const ACCOUNT_SCOPE_HEADER="X-StrivePay-Account-Scope";

export function parseAccountScope(value:string|null|undefined):AccountScope|null{
  if(!value)return null;
  const normalized=value.trim().toUpperCase();
  return normalized==="PERSONAL"||normalized==="BUSINESS"?normalized:null;
}

export function defaultAccountScope(hasBusinessMembership:boolean):AccountScope{
  return hasBusinessMembership?"BUSINESS":"PERSONAL";
}

export function hasBusinessMembershipHint(customer:{
  hasBusinessMembership?:boolean;
  membershipRole?:string|null;
  organizationLegalName?:string|null;
  availableContexts?:string[]|null;
}){
  return Boolean(
    customer.hasBusinessMembership
    ||customer.membershipRole
    ||customer.organizationLegalName
    ||customer.availableContexts?.includes("BUSINESS"),
  );
}

export function readBrowserAccountScope(hasBusinessMembership:boolean):AccountScope{
  if(typeof document==="undefined")return defaultAccountScope(hasBusinessMembership);
  const match=document.cookie.match(/(?:^|; )sp_account_scope=([^;]*)/);
  const fromCookie=parseAccountScope(match?decodeURIComponent(match[1]):null);
  if(fromCookie==="BUSINESS"&&!hasBusinessMembership)return "PERSONAL";
  return fromCookie??defaultAccountScope(hasBusinessMembership);
}

export function writeBrowserAccountScope(scope:AccountScope){
  if(typeof document==="undefined")return;
  document.cookie=`${ACCOUNT_SCOPE_COOKIE}=${scope}; Path=/; SameSite=Lax; Max-Age=2592000`;
}

export function scopeHeaders(scope:AccountScope,extra:HeadersInit={}):HeadersInit{
  return {...(extra as Record<string,string>),[ACCOUNT_SCOPE_HEADER]:scope,Accept:"application/json"};
}
