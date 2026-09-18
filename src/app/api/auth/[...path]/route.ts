import {cookies} from "next/headers";
import {NextRequest,NextResponse} from "next/server";
import {backend,responseBody} from "@/lib/backend";
import {secureCookies} from "@/lib/cookie-secure";

const PUBLIC=new Set(["register","login","login/2fa","refresh","logout","email/verify","email/resend","password/forgot","password/reset"]);
const PROTECTED_POST=new Set(["logout-all","account-type","password/change","2fa/setup","2fa/enable","2fa/disable","2fa/reminder"]);
const ACCESS="sp_access",REFRESH="sp_refresh";

function sessionRoute(route:string){
  if(route==="sessions")return true;
  return /^sessions\/[0-9a-fA-F-]{36}$/.test(route);
}

function clientHeaders(request:NextRequest,extra:Record<string,string>={}){
  const headers:Record<string,string>={Accept:"application/json",...extra};
  const agent=request.headers.get("user-agent");
  if(agent)headers["User-Agent"]=agent;
  const forwarded=request.headers.get("x-forwarded-for")||request.headers.get("x-real-ip");
  if(forwarded)headers["X-Forwarded-For"]=forwarded;
  return headers;
}

async function authorized(request:NextRequest,route:string,method:string,body?:string){
  const jar=await cookies();
  const token=jar.get(ACCESS)?.value;
  if(!token)return NextResponse.json({title:"A valid bearer token is required",type:"authentication_required"},{status:401});
  const headers=clientHeaders(request,{Authorization:`Bearer ${token}`});
  if(body!==undefined)headers["Content-Type"]="application/json";
  const upstream=await backend(`/v1/auth/${route}`,{method,headers,body});
  const data=await responseBody(upstream);
  const response=NextResponse.json(upstream.ok?(data??{}):data??{},{status:upstream.status===204?200:upstream.status});
  if((route==="logout"||route==="logout-all")&&upstream.ok)clearTokens(response);
  return response;
}

export async function POST(request:NextRequest,context:{params:Promise<{path:string[]}>}){
  const route=(await context.params).path.join("/");
  if(route==="logout"){
    const jar=await cookies();
    const headers=clientHeaders(request,{"Content-Type":"application/json"});
    const upstream=await backend("/v1/auth/logout",{method:"POST",headers,body:JSON.stringify({refreshToken:jar.get(REFRESH)?.value??null})});
    const data=await responseBody(upstream);
    const response=NextResponse.json(upstream.ok?(data??{}):data??{},{status:upstream.status===204?200:upstream.status});
    clearTokens(response);
    return response;
  }
  if(PUBLIC.has(route)){
    const jar=await cookies();
    let payload=await request.json().catch(()=>({}));
    if(route==="refresh")payload={refreshToken:jar.get(REFRESH)?.value};
    const headers=clientHeaders(request,{"Content-Type":"application/json"});
    const upstream=await backend(`/v1/auth/${route}`,{method:"POST",headers,body:JSON.stringify(payload)});
    const data=await responseBody(upstream);
    const response=NextResponse.json(upstream.ok?safe(data):data??{},{status:upstream.status===204?200:upstream.status});
    if(upstream.ok&&(route==="login"||route==="login/2fa"||route==="register"||route==="refresh"||route==="email/verify"))setTokens(response,data);
    // Do not clear cookies on failed refresh: a concurrent login can set fresh
    // cookies, and wiping them here immediately signs the user back out.
    return response;
  }
  if(!PROTECTED_POST.has(route))return NextResponse.json({title:"Unsupported authentication operation"},{status:404});
  const payload=await request.text().catch(()=>"");
  return authorized(request,route,"POST",payload||"{}");
}

export async function GET(request:NextRequest,context:{params:Promise<{path:string[]}>}){
  const route=(await context.params).path.join("/");
  if(route==="sessions"||route==="2fa")return authorized(request,route,"GET");
  return NextResponse.json({title:"Unsupported authentication operation"},{status:404});
}

export async function DELETE(request:NextRequest,context:{params:Promise<{path:string[]}>}){
  const route=(await context.params).path.join("/");
  if(!sessionRoute(route)||route==="sessions")return NextResponse.json({title:"Unsupported authentication operation"},{status:404});
  return authorized(request,route,"DELETE");
}

function safe(data:Record<string,unknown>|null){
  if(!data)return{};
  const tokens=(data.tokens??data) as Record<string,unknown>;
  return {
    authenticated:Boolean(tokens?.accessToken),
    accessExpiresAt:tokens?.accessExpiresAt,
    refreshExpiresAt:tokens?.refreshExpiresAt,
    customerId:data.customerId,
    email:data.email,
    emailVerified:data.emailVerified,
    verificationRequired:data.verificationRequired,
    verificationChallengeId:data.verificationChallengeId??null,
    verificationExpiresInSeconds:data.verificationExpiresInSeconds??null,
    accountType:data.accountType,
    otpRequired:Boolean(data.otpRequired),
    challengeId:data.challengeId??null,
  };
}
function setTokens(response:NextResponse,data:Record<string,unknown>|null){if(!data)return;const tokens=(data.tokens??data) as Record<string,string>|null;if(!tokens?.accessToken||!tokens.refreshToken)return;const secure=secureCookies();response.cookies.set(ACCESS,tokens.accessToken,{httpOnly:true,secure,sameSite:"lax",path:"/",expires:new Date(tokens.accessExpiresAt)});response.cookies.set(REFRESH,tokens.refreshToken,{httpOnly:true,secure,sameSite:"lax",path:"/api/auth",expires:new Date(tokens.refreshExpiresAt)});}
function clearTokens(response:NextResponse){response.cookies.set(ACCESS,"",{expires:new Date(0),path:"/"});response.cookies.set(REFRESH,"",{expires:new Date(0),path:"/api/auth"});response.cookies.set("sp_verification_session","",{expires:new Date(0),path:"/api"});}
