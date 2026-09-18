import {NextRequest,NextResponse} from "next/server";
import {ACCOUNT_SCOPE_COOKIE,parseAccountScope} from "@/lib/account-scope";
import {secureCookies} from "@/lib/cookie-secure";
import {hasValidRequestOrigin} from "@/lib/request-origin";

export async function POST(request:NextRequest){
  const origin=request.headers.get("origin");
  if(!hasValidRequestOrigin(origin,request.headers,request.nextUrl.origin)){
    return NextResponse.json({title:"Invalid request origin"},{status:403});
  }
  const body=await request.json().catch(()=>null) as {scope?:string}|null;
  const scope=parseAccountScope(body?.scope);
  if(!scope)return NextResponse.json({title:"scope must be PERSONAL or BUSINESS"},{status:400});
  const response=NextResponse.json({scope});
  response.cookies.set(ACCOUNT_SCOPE_COOKIE,scope,{httpOnly:false,secure:secureCookies(),sameSite:"lax",path:"/",maxAge:2592000});
  return response;
}
