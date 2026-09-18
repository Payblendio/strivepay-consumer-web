import {cookies} from "next/headers";
import {NextRequest,NextResponse} from "next/server";
import {backend,responseBody} from "@/lib/backend";
import {secureCookies} from "@/lib/cookie-secure";
import {hasValidRequestOrigin} from "@/lib/request-origin";
import {ACCOUNT_SCOPE_COOKIE,ACCOUNT_SCOPE_HEADER,parseAccountScope} from "@/lib/account-scope";

function verificationCookie(response:NextResponse,sessionId:string,expiresAt?:string|null){
  const seconds=expiresAt?Math.max(1,Math.floor((new Date(expiresAt).getTime()-Date.now())/1000)):14400;
  response.cookies.set("sp_verification_session",sessionId,{httpOnly:true,secure:secureCookies(),sameSite:"strict",path:"/api",maxAge:seconds});
}

function accountScopeHeader(request:NextRequest,jar:Awaited<ReturnType<typeof cookies>>){
  return parseAccountScope(request.headers.get(ACCOUNT_SCOPE_HEADER))
    ??parseAccountScope(jar.get(ACCOUNT_SCOPE_COOKIE)?.value)
    ??null;
}

const ROUTES=new Map<string,Set<string>>([
  ["",new Set(["GET"])],
  ["coverage",new Set(["GET"])],
  ["local-profile",new Set(["GET","PATCH"])],
  ["profile",new Set(["POST","PATCH"])],
  ["legal-documents",new Set(["GET"])],
  ["legal-acceptances",new Set(["GET","POST"])],
  ["session",new Set(["GET"])],
  ["session/start",new Set(["POST"])],
  ["session/otp",new Set(["POST"])],
  ["identity-verification/session",new Set(["POST"])],
  ["identity-verification/import",new Set(["POST"])],
  ["business/profile",new Set(["GET","POST"])],
  ["business/status",new Set(["GET"])],
  ["business/legal-acceptances",new Set(["GET","POST"])],
  ["business",new Set(["POST"])],
  ["business/verification-session",new Set(["POST"])],
  ["money-routes/crypto",new Set(["GET","PUT"])],
  ["money-routes/coverage",new Set(["GET"])],
  ["money-routes/quidax-sync",new Set(["POST"])],
  ["money-routes/crypto-profile",new Set(["POST"])],
  ["money-routes/preferences",new Set(["GET"])],
  ["money-routes/funding-accounts",new Set(["GET","POST"])],
  ["money-routes/native-funding-account",new Set(["GET","POST"])],
  ["money-routes/native-funding-account/identity",new Set(["GET","POST"])],
  ["money-routes/native-destinations",new Set(["GET","POST"])],
  ["money-routes/deposit-addresses",new Set(["POST"])],
  ["money-routes/bank-requirements",new Set(["GET"])],
  ["money-routes/destination-currencies",new Set(["GET"])],
  ["money-routes/supported-banks",new Set(["GET"])],
  ["money-routes/bank-accounts",new Set(["GET","POST"])],
  ["simulator/compliance",new Set(["POST"])],
]);

export async function forwardOnboarding(request:NextRequest,path:string[]=[]){
  const route=path.join("/");
  const postcode=route.match(/^postcode\/([A-Z]{2})$/);
  const bankAccountMain=route.match(/^money-routes\/bank-accounts\/([0-9a-fA-F-]{36})\/main$/);
  if(!ROUTES.get(route)?.has(request.method)&&!(postcode&&request.method==="GET")&&!(bankAccountMain&&request.method==="PUT"))return NextResponse.json({title:"Unsupported onboarding operation"},{status:404});
  if(request.method!=="GET"){
    const origin=request.headers.get("origin");
    if(!hasValidRequestOrigin(origin,request.headers,request.nextUrl.origin))return NextResponse.json({title:"Invalid request origin"},{status:403});
  }
  const jar=await cookies();
  const token=jar.get("sp_access")?.value;
  if(!token)return NextResponse.json({type:"customer_session_expired",title:"Your session has expired",status:401},{status:401});
  const headers:Record<string,string>={Authorization:`Bearer ${token}`};
  const verification=jar.get("sp_verification_session")?.value;
  if(verification)headers["X-StrivePay-Verification-Session"]=verification;
  const scope=accountScopeHeader(request,jar);
  if(scope)headers[ACCOUNT_SCOPE_HEADER]=scope;
  const idempotency=request.headers.get("idempotency-key");
  if(idempotency)headers["Idempotency-Key"]=idempotency;
  let body:string|undefined;
  if(request.method!=="GET"){
    const payload=await request.json().catch(()=>null);
    if(payload!==null){headers["Content-Type"]="application/json";body=JSON.stringify(payload);}
  }
  const moneyRouteTargets:Record<string,string>={
    "money-routes/crypto":"/v1/onboarding/money-routes/crypto",
    "money-routes/coverage":"/v1/coverage",
    "money-routes/quidax-sync":"/v1/coverage/quidax/sync",
    "money-routes/crypto-profile":"/v1/onboarding/money-routes/crypto-profile",
    "money-routes/preferences":"/v1/onboarding/money-routes/crypto",
    "money-routes/funding-accounts":"/v1/funding-accounts",
    "money-routes/native-funding-account":"/v1/onboarding/money-routes/native-funding-account",
    "money-routes/native-funding-account/identity":"/v1/onboarding/money-routes/native-funding-account/identity",
    "money-routes/native-destinations":"/v1/onboarding/money-routes/native-destinations",
    "money-routes/deposit-addresses":"/v1/onboarding/money-routes/deposit-addresses",
    "money-routes/bank-requirements":"/v1/bank-accounts/requirements",
    "money-routes/destination-currencies":"/v1/bank-accounts/currencies",
    "money-routes/supported-banks":"/v1/bank-accounts/supported-banks",
    "money-routes/bank-accounts":"/v1/bank-accounts",
  };
  const query=request.nextUrl.search;
  const target=route==="simulator/compliance"?"/v1/simulator/compliance":route==="coverage"?`/v1/coverage${query}`:postcode?`/v1/reference/postcodes/${postcode[1]}`:bankAccountMain?`/v1/bank-accounts/${bankAccountMain[1]}/main`:moneyRouteTargets[route]?`${moneyRouteTargets[route]}${query}`:`/v1/onboarding${route?`/${route}`:""}`;
  const upstream=await backend(target,{method:request.method,headers,body});
  const data=await responseBody(upstream);
  if(upstream.status===204){
    const response=new NextResponse(null,{status:204});
    if(route==="session")response.cookies.set("sp_verification_session","",{expires:new Date(0),path:"/api"});
    return response;
  }
  if(route==="session"&&request.method==="GET"&&upstream.ok&&data&&typeof data==="object"&&"sessionId" in data){
    const value=data as {sessionId:string;expiresAt?:string};
    const response=NextResponse.json({active:true,expiresAt:value.expiresAt??null},{status:upstream.status});
    verificationCookie(response,value.sessionId,value.expiresAt);
    return response;
  }
  if(route==="session/otp"&&upstream.ok&&data&&typeof data==="object"&&"sessionId" in data){
    const value=data as {sessionId:string;expiresAt?:string};
    const response=NextResponse.json({verified:true,expiresAt:value.expiresAt??null},{status:upstream.status});
    verificationCookie(response,value.sessionId,value.expiresAt);
    return response;
  }
  if(route==="business/profile"&&request.method==="GET"&&data===null)return NextResponse.json(null,{status:upstream.status});
  return NextResponse.json(data??{},{status:upstream.status});
}
