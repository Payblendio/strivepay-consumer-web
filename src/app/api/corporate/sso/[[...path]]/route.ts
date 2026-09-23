import {cookies} from "next/headers";
import {NextRequest,NextResponse} from "next/server";
import {backend,responseBody} from "@/lib/backend";
import {secureCookies} from "@/lib/cookie-secure";
import {hasValidRequestOrigin} from "@/lib/request-origin";

const ACCESS="sp_access";

function clientHeaders(request:NextRequest,extra:Record<string,string>={}){
  const headers:Record<string,string>={Accept:"application/json",...extra};
  const agent=request.headers.get("user-agent");
  if(agent)headers["User-Agent"]=agent;
  const forwarded=request.headers.get("x-forwarded-for")||request.headers.get("x-real-ip");
  if(forwarded)headers["X-Forwarded-For"]=forwarded;
  return headers;
}

function allowed(route:string,method:string){
  if(route===""&&(method==="GET"||method==="PUT"||method==="DELETE"))return true;
  if(route==="presets"&&method==="GET")return true;
  if(route==="service-provider"&&method==="GET")return true;
  if(route==="metadata/import"&&method==="POST")return true;
  if(route==="test"&&method==="POST")return true;
  if(route==="test/start"&&method==="POST")return true;
  if(route==="activate"&&method==="POST")return true;
  return false;
}

async function handle(request:NextRequest,path:string[]){
  const route=path.join("/");
  if(!allowed(route,request.method))return NextResponse.json({title:"Unsupported SSO operation"},{status:404});
  if(request.method!=="GET"){
    const origin=request.headers.get("origin");
    if(!hasValidRequestOrigin(origin,request.headers,request.nextUrl.origin)){
      return NextResponse.json({title:"Invalid request origin"},{status:403});
    }
  }

  const jar=await cookies();
  const token=jar.get(ACCESS)?.value;
  if(!token)return NextResponse.json({type:"customer_session_expired",title:"Your session has expired",status:401},{status:401});

  const headers=clientHeaders(request,{Authorization:`Bearer ${token}`});
  let body:string|undefined;
  if(request.method!=="GET"&&request.method!=="DELETE"){
    const payload=await request.json().catch(()=>null);
    if(payload!==null){headers["Content-Type"]="application/json";body=JSON.stringify(payload);}
  }

  const upstream=await backend(`/v1/corporate/sso${route?`/${route}`:""}`,{method:request.method,headers,body});
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
