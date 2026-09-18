import {cookies} from "next/headers";
import {NextRequest,NextResponse} from "next/server";
import {backend,responseBody} from "@/lib/backend";
import {hasValidRequestOrigin} from "@/lib/request-origin";

async function postQuote(request:NextRequest,path:string){
  const origin=request.headers.get("origin");
  if(!hasValidRequestOrigin(origin,request.headers,request.nextUrl.origin))return NextResponse.json({title:"Invalid request origin"},{status:403});
  const token=(await cookies()).get("sp_access")?.value;
  if(!token)return NextResponse.json({type:"customer_session_expired",title:"Your session has expired",status:401},{status:401});
  const payload=await request.json().catch(()=>null);
  const headers:Record<string,string>={Authorization:`Bearer ${token}`,Accept:"application/json","Content-Type":"application/json"};
  const upstream=await backend(path,{method:"POST",headers,body:JSON.stringify(payload??{})});
  const data=await responseBody(upstream);
  return NextResponse.json(data??{},{status:upstream.status});
}

export async function POST(request:NextRequest){
  return postQuote(request,"/v1/quotes");
}
