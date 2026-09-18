import {cookies} from "next/headers";
import {NextRequest,NextResponse} from "next/server";
import {backend,responseBody} from "@/lib/backend";
import {secureCookies} from "@/lib/cookie-secure";
import {hasValidRequestOrigin} from "@/lib/request-origin";

const ACCESS="sp_access";
const REFRESH="sp_refresh";

function clientHeaders(request:NextRequest,extra:Record<string,string>={}){
  const headers:Record<string,string>={Accept:"application/json",...extra};
  const agent=request.headers.get("user-agent");
  if(agent)headers["User-Agent"]=agent;
  const forwarded=request.headers.get("x-forwarded-for")||request.headers.get("x-real-ip");
  if(forwarded)headers["X-Forwarded-For"]=forwarded;
  return headers;
}

function allowed(route:string,method:string){
  if(route==="accept"&&method==="POST")return true;
  if(route==="invitations/preview"&&method==="GET")return true;
  if(route===""&&method==="GET")return true;
  if(route==="invitations"&&(method==="GET"||method==="POST"))return true;
  if(/^invitations\/[0-9a-fA-F-]{36}\/revoke$/.test(route)&&method==="POST")return true;
  if(/^[0-9a-fA-F-]{36}\/role$/.test(route)&&method==="PUT")return true;
  if(/^[0-9a-fA-F-]{36}\/sync$/.test(route)&&method==="POST")return true;
  if(/^[0-9a-fA-F-]{36}$/.test(route)&&method==="DELETE")return true;
  if(route==="me/onboarding/status"&&method==="GET")return true;
  if(route==="me/financial-access"&&method==="GET")return true;
  if(route==="me/onboarding"&&method==="POST")return true;
  if(route==="me/legal-acceptances"&&method==="POST")return true;
  if(route==="me/identity-verification/session"&&method==="POST")return true;
  if(route==="me/identity-verification/import"&&method==="POST")return true;
  if(route==="me/administrator-verification/login"&&method==="POST")return true;
  if(route==="me/administrator-verification/otp"&&method==="POST")return true;
  return false;
}

async function handle(request:NextRequest,path:string[]){
  const route=path.join("/");
  if(!allowed(route,request.method))return NextResponse.json({title:"Unsupported team operation"},{status:404});
  if(request.method!=="GET"){
    const origin=request.headers.get("origin");
    if(!hasValidRequestOrigin(origin,request.headers,request.nextUrl.origin))return NextResponse.json({title:"Invalid request origin"},{status:403});
  }

  const jar=await cookies();
  const headers=clientHeaders(request);
  let body:string|undefined;
  if(request.method!=="GET"&&request.method!=="DELETE"){
    const payload=await request.json().catch(()=>null);
    if(payload!==null){headers["Content-Type"]="application/json";body=JSON.stringify(payload);}
  }

  if(route==="accept"){
    const upstream=await backend("/v1/corporate/members/accept",{method:"POST",headers,body});
    const data=await responseBody(upstream);
    const response=NextResponse.json(upstream.ok?(data??{}):data??{},{status:upstream.status===204?200:upstream.status});
    if(upstream.ok&&data&&typeof data==="object"){
      const tokens=data as {accessToken?:string;refreshToken?:string;accessExpiresAt?:string;refreshExpiresAt?:string};
      if(tokens.accessToken&&tokens.refreshToken){
        response.cookies.set(ACCESS,tokens.accessToken,{httpOnly:true,secure:secureCookies(),sameSite:"lax",path:"/",expires:tokens.accessExpiresAt?new Date(tokens.accessExpiresAt):undefined});
        response.cookies.set(REFRESH,tokens.refreshToken,{httpOnly:true,secure:secureCookies(),sameSite:"lax",path:"/api/auth",expires:tokens.refreshExpiresAt?new Date(tokens.refreshExpiresAt):undefined});
      }
    }
    return response;
  }

  if(route==="invitations/preview"){
    const token=request.nextUrl.searchParams.get("token")??"";
    const upstream=await backend(`/v1/corporate/members/invitations/preview?token=${encodeURIComponent(token)}`,{method:"GET",headers});
    const data=await responseBody(upstream);
    return NextResponse.json(data??{},{status:upstream.status});
  }

  const token=jar.get(ACCESS)?.value;
  if(!token)return NextResponse.json({type:"customer_session_expired",title:"Your session has expired",status:401},{status:401});
  headers.Authorization=`Bearer ${token}`;
  const verification=jar.get("sp_verification_session")?.value;
  if(verification)headers["X-StrivePay-Verification-Session"]=verification;
  const upstream=await backend(`/v1/corporate/members${route?`/${route}`:""}`,{method:request.method,headers,body});
  if(upstream.status===204)return new NextResponse(null,{status:204});
  const data=await responseBody(upstream);
  return NextResponse.json(data??{},{status:upstream.status});
}

export async function GET(request:NextRequest,context:{params:Promise<{path?:string[]}>}){
  return handle(request,(await context.params).path??[]);
}
export async function POST(request:NextRequest,context:{params:Promise<{path?:string[]}>}){
  return handle(request,(await context.params).path??[]);
}
export async function PUT(request:NextRequest,context:{params:Promise<{path?:string[]}>}){
  return handle(request,(await context.params).path??[]);
}
export async function DELETE(request:NextRequest,context:{params:Promise<{path?:string[]}>}){
  return handle(request,(await context.params).path??[]);
}
