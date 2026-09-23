import {NextRequest,NextResponse} from "next/server";
import {backend,responseBody} from "@/lib/backend";
import {hasValidRequestOrigin} from "@/lib/request-origin";

/** Public: resolve work email → IdP redirect URL. */
export async function POST(request:NextRequest){
  const origin=request.headers.get("origin");
  if(!hasValidRequestOrigin(origin,request.headers,request.nextUrl.origin)){
    return NextResponse.json({title:"Invalid request origin"},{status:403});
  }
  const payload=await request.json().catch(()=>({})) as {email?:string};
  const headers:Record<string,string>={Accept:"application/json","Content-Type":"application/json"};
  const agent=request.headers.get("user-agent");
  if(agent)headers["User-Agent"]=agent;
  const forwarded=request.headers.get("x-forwarded-for")||request.headers.get("x-real-ip");
  if(forwarded)headers["X-Forwarded-For"]=forwarded;
  const upstream=await backend("/v1/corporate/sso/discover",{
    method:"POST",
    headers,
    body:JSON.stringify({email:payload.email??""}),
  });
  const data=await responseBody(upstream);
  return NextResponse.json(data??{},{status:upstream.status});
}
