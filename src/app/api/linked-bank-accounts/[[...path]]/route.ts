import {cookies} from "next/headers";
import {NextRequest,NextResponse} from "next/server";
import {backend,responseBody} from "@/lib/backend";
import {hasValidRequestOrigin} from "@/lib/request-origin";
import {moneyAuthHeaders,moneyUnauthorized} from "@/app/api/money/scope";

function verificationHeaders(base:Record<string,string>,jar:Awaited<ReturnType<typeof cookies>>){
  const verification=jar.get("sp_verification_session")?.value;
  if(verification)base["X-StrivePay-Verification-Session"]=verification;
  return base;
}

export async function GET(request:NextRequest,{params}:{params:Promise<{path?:string[]}>}){
  return forward(request,await params);
}

export async function POST(request:NextRequest,{params}:{params:Promise<{path?:string[]}>}){
  return forward(request,await params);
}

export async function PUT(request:NextRequest,{params}:{params:Promise<{path?:string[]}>}){
  return forward(request,await params);
}

export async function DELETE(request:NextRequest,{params}:{params:Promise<{path?:string[]}>}){
  return forward(request,await params);
}

async function forward(request:NextRequest,{path=[]}:{path?:string[]}){
  const route=path.join("/");
  const allowed=
    (route===""&&(request.method==="GET"))||
    (route==="profile"&&request.method==="POST")||
    (route==="link"&&request.method==="PUT")||
    (route==="pull"&&request.method==="POST")||
    (/^[0-9a-fA-F-]{36}$/.test(route)&&request.method==="DELETE");
  if(!allowed)return NextResponse.json({title:"Unsupported linked-bank operation"},{status:404});
  if(request.method!=="GET"){
    const origin=request.headers.get("origin");
    if(!hasValidRequestOrigin(origin,request.headers,request.nextUrl.origin))return NextResponse.json({title:"Invalid request origin"},{status:403});
  }
  const headers=await moneyAuthHeaders(request);
  if(!headers)return moneyUnauthorized();
  const jar=await cookies();
  verificationHeaders(headers,jar);
  const idempotency=request.headers.get("idempotency-key");
  if(idempotency)headers["Idempotency-Key"]=idempotency;
  let body:string|undefined;
  if(request.method!=="GET"&&request.method!=="DELETE"){
    const payload=await request.json().catch(()=>null);
    if(payload!==null){headers["Content-Type"]="application/json";body=JSON.stringify(payload);}
  }
  const query=request.nextUrl.search;
  const target=route===""?`/v1/linked-bank-accounts${query}`:`/v1/linked-bank-accounts/${route}${query}`;
  const upstream=await backend(target,{method:request.method,headers,body});
  if(upstream.status===204)return new NextResponse(null,{status:204});
  const data=await responseBody(upstream);
  return NextResponse.json(data??{},{status:upstream.status});
}
