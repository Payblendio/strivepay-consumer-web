import {cookies,headers} from "next/headers";
import {redirect} from "next/navigation";
import {accountSetupState,type AccountSetupState,type OnboardingSnapshot} from "@/components/dashboard-route-copy";
import {loginHref} from "@/lib/auth-access";
import {backend} from "@/lib/backend";
import {secureCookies} from "@/lib/cookie-secure";
import {DASHBOARD_RETURN_TO_HEADER,dashboardReturnTo} from "@/lib/dashboard-return-to";
import {ACCOUNT_SCOPE_COOKIE,ACCOUNT_SCOPE_HEADER,defaultAccountScope,hasBusinessMembershipHint,parseAccountScope,type AccountScope} from "@/lib/account-scope";

export type DashboardCustomer={
  givenName:string;
  familyName:string;
  email:string;
  country:string;
  phoneE164?:string|null;
  emailVerified:boolean;
  accountType?:string;
  organizationLegalName?:string|null;
  membershipRole?:string|null;
  hasBusinessMembership?:boolean;
  availableContexts?:string[]|null;
};

async function refreshAccessToken(){
  const jar=await cookies();
  const refresh=jar.get("sp_refresh")?.value;
  if(!refresh)return null;
  let upstream:Response;
  try{
    upstream=await backend("/v1/auth/refresh",{
      method:"POST",
      headers:{"Content-Type":"application/json",Accept:"application/json"},
      body:JSON.stringify({refreshToken:refresh}),
      signal:AbortSignal.timeout(12000),
    });
  }catch{return null;}
  if(!upstream.ok)return null;
  const data=await upstream.json().catch(()=>null) as {tokens?:{accessToken?:string;refreshToken?:string;accessExpiresAt?:string;refreshExpiresAt?:string};accessToken?:string;refreshToken?:string;accessExpiresAt?:string;refreshExpiresAt?:string}|null;
  const tokens=(data?.tokens??data) as {accessToken?:string;refreshToken?:string;accessExpiresAt?:string;refreshExpiresAt?:string}|null;
  if(!tokens?.accessToken||!tokens.refreshToken)return null;
  try{
    jar.set("sp_access",tokens.accessToken,{httpOnly:true,secure:secureCookies(),sameSite:"lax",path:"/",expires:tokens.accessExpiresAt?new Date(tokens.accessExpiresAt):undefined});
    jar.set("sp_refresh",tokens.refreshToken,{httpOnly:true,secure:secureCookies(),sameSite:"lax",path:"/api/auth",expires:tokens.refreshExpiresAt?new Date(tokens.refreshExpiresAt):undefined});
  }catch{
    // Cookie mutation can be blocked in some RSC contexts; still use the new access token for this request.
  }
  return tokens.accessToken;
}

export async function requireDashboardCustomer(returnTo="/dashboard"){
  return requireCustomer(returnTo,false);
}
export async function requireSetupSupportCustomer(){
  return requireCustomer("/support",true);
}
async function requireCustomer(returnTo:string,allowUnselectedAccount:boolean){
  returnTo=dashboardReturnTo((await headers()).get(DASHBOARD_RETURN_TO_HEADER),returnTo);
  const jar=await cookies();
  let token=jar.get("sp_access")?.value??null;
  const hadAccessToken=Boolean(token);
  let response=token?await backendJson<DashboardCustomer>(token,"/v1/auth/me"):{ok:false as const,status:401,value:null,error:"http" as const};
  if((!token||(!response.ok&&(response.status===401||response.status===403)))){
    const refreshed=await refreshAccessToken();
    if(refreshed){token=refreshed;response=await backendJson<DashboardCustomer>(token,"/v1/auth/me");}
  }
  if(!token)redirect(loginHref(returnTo));
  if(!response.ok&&(response.status===401||response.status===403))redirect(loginHref(returnTo,response.status===401&&hadAccessToken?"session-expired":undefined));
  if(!response.ok||!validCustomer(response.value))throw new Error("Your account could not be loaded. Try again.");
  const customer=response.value;
  if(!customer.emailVerified)redirect(`/verify-email?email=${encodeURIComponent(customer.email)}`);
  if(!customer.accountType&&!allowUnselectedAccount)redirect("/onboarding/account-type");
  return {token,customer};
}

export type BackendReadFailure="network"|"http"|"invalid-response";
export type BackendJsonResult<T>=
  |{ok:true;status:number;value:T|null}
  |{ok:false;status:number;value:null;error:BackendReadFailure};

export async function backendJson<T>(token:string,path:string,extraHeaders:Record<string,string>={}):Promise<BackendJsonResult<T>>{
  let response:Response;
  try{response=await backend(path,{headers:{Authorization:`Bearer ${token}`,...extraHeaders},signal:AbortSignal.timeout(12000)});}
  catch{return {ok:false,status:0,value:null,error:"network"};}
  if(!response.ok)return {ok:false,status:response.status,value:null,error:"http"};
  if(response.status===204)return {ok:true,status:response.status,value:null};
  try{return {ok:true,status:response.status,value:await response.json() as T};}
  catch{return {ok:false,status:response.status,value:null,error:"invalid-response"};}
}

type PreferenceRow={routeType?:string};
export type AccountSetupLoad=
  |{status:"ready";setup:AccountSetupState}
  |{status:"unavailable";reason:BackendReadFailure;httpStatus?:number};

function record(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==="object"&&!Array.isArray(value);}
function validCustomer(value:unknown):value is DashboardCustomer{
  return record(value)&&["givenName","familyName","email","country"].every(key=>typeof value[key]==="string")
    &&typeof value.emailVerified==="boolean"&&(value.accountType==null||typeof value.accountType==="string");
}
function validSnapshot(value:unknown):value is OnboardingSnapshot{
  return record(value)&&("complianceStatus" in value||"onboardingStatus" in value)
    &&["complianceStatus","onboardingStatus","actionRequired"].every(key=>value[key]==null||typeof value[key]==="string");
}
function rows(value:unknown):value is Record<string,unknown>[] {return Array.isArray(value)&&value.every(record);}
function bankAccountRows(value:unknown):value is Record<string,unknown>[]{
  if(rows(value))return true;
  return record(value)&&rows(value.items);
}
function bankAccountCount(value:unknown){
  if(Array.isArray(value))return value.length;
  if(record(value)&&Array.isArray(value.items))return value.items.length;
  return 0;
}
function unavailable(response:BackendJsonResult<unknown>):AccountSetupLoad{
  return {status:"unavailable",reason:response.ok?"invalid-response":response.error,...(response.status?{httpStatus:response.status}:{})};
}

/** Onboarding or money routes not started yet — incomplete setup, not a dashboard outage. */
function incompleteSetup(response:BackendJsonResult<unknown>){
  return !response.ok&&response.error==="http"&&(response.status===400||response.status===404||response.status===409);
}

/** Compliance gate blocking financial reads until KYC/KYB finishes. */
function accessBlocked(response:BackendJsonResult<unknown>){
  return !response.ok&&response.error==="http"&&response.status===403;
}

function notStartedSnapshot():OnboardingSnapshot{
  return {complianceStatus:"NOT_STARTED",onboardingStatus:"NOT_STARTED"};
}

export async function resolveDashboardAccountScope(customer:DashboardCustomer):Promise<AccountScope>{
  const jar=await cookies();
  const fromCookie=parseAccountScope(jar.get(ACCOUNT_SCOPE_COOKIE)?.value);
  const hasMembership=hasBusinessMembershipHint(customer);
  const dualContext=Boolean(
    customer.availableContexts?.includes("PERSONAL")
    &&customer.availableContexts?.includes("BUSINESS"),
  );
  // Pure business accounts stay in company context through company KYB — don't honor a stale PERSONAL cookie.
  if(customer.accountType==="BUSINESS"&&!dualContext)return "BUSINESS";
  if(fromCookie==="BUSINESS"&&!hasMembership)return "PERSONAL";
  return fromCookie??defaultAccountScope(hasMembership);
}

export function accountScopeHeaders(scope:AccountScope):Record<string,string>{
  return {[ACCOUNT_SCOPE_HEADER]:scope};
}

export async function loadFinancialMutationAccess(token:string,scope:AccountScope):Promise<boolean>{
  if(scope==="PERSONAL")return true;
  const access=await backendJson<{eligible?:boolean}>(token,"/v1/corporate/members/me/financial-access");
  return Boolean(access.ok&&access.value?.eligible);
}

export function hasBusinessContext(customer:DashboardCustomer){
  return hasBusinessMembershipHint(customer);
}

export async function loadAccountSetup(token:string,scope:AccountScope="PERSONAL"):Promise<AccountSetupLoad>{
  const scopeHeaders={[ACCOUNT_SCOPE_HEADER]:scope};
  const onboardingPath=scope==="BUSINESS"?"/v1/onboarding/business/status":"/v1/onboarding";
  const [onboarding,preferences,bankAccounts,nativeDestinations,financialAccess]=await Promise.all([
    backendJson<OnboardingSnapshot>(token,onboardingPath,scopeHeaders),
    backendJson<PreferenceRow[]>(token,"/v1/onboarding/money-routes/crypto",scopeHeaders),
    backendJson<unknown>(token,"/v1/bank-accounts?size=100",scopeHeaders),
    backendJson<unknown[]>(token,"/v1/onboarding/money-routes/native-destinations",scopeHeaders),
    scope==="BUSINESS"?backendJson<{eligible?:boolean;code?:string}>(token,"/v1/corporate/members/me/financial-access"):Promise.resolve({ok:true as const,status:200,value:null}),
  ]);

  let snapshot:OnboardingSnapshot;
  if(onboarding.ok&&validSnapshot(onboarding.value))snapshot=onboarding.value;
  else if(incompleteSetup(onboarding)||accessBlocked(onboarding)){
    // Business company record may not exist yet (400/404) — keep compliance incomplete.
    // Never treat owner FULL_USER / financial-access eligible as company approval.
    if(scope==="BUSINESS"&&financialAccess.ok&&financialAccess.value?.code==="IDENTITY_VERIFICATION_REQUIRED"){
      snapshot={complianceStatus:"NOT_STARTED",onboardingStatus:"NOT_STARTED"};
    }else snapshot=notStartedSnapshot();
  }
  else return unavailable(onboarding);

  let prefs:PreferenceRow[];
  if(preferences.ok&&rows(preferences.value)&&!preferences.value.some(row=>row.routeType!=null&&typeof row.routeType!=="string"))prefs=preferences.value;
  else if(accessBlocked(preferences)||incompleteSetup(preferences))prefs=[];
  else return unavailable(preferences);

  const native=prefs[0]?.routeType==="NATIVE";
  if(native){
    if(nativeDestinations.ok&&rows(nativeDestinations.value)){
      return {status:"ready",setup:accountSetupState(snapshot,prefs.length>0,nativeDestinations.value.length>0,scope)};
    }
    if(accessBlocked(nativeDestinations)||incompleteSetup(nativeDestinations)){
      return {status:"ready",setup:accountSetupState(snapshot,prefs.length>0,false,scope)};
    }
    return unavailable(nativeDestinations);
  }

  let hasPayout=false;
  if(bankAccounts.ok&&bankAccountRows(bankAccounts.value))hasPayout=bankAccountCount(bankAccounts.value)>0;
  else if(!(accessBlocked(bankAccounts)||incompleteSetup(bankAccounts)))return unavailable(bankAccounts);

  return {status:"ready",setup:accountSetupState(snapshot,prefs.length>0,hasPayout,scope)};
}
