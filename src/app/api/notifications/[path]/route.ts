import {NextRequest,NextResponse} from "next/server";
import {backend,responseBody} from "@/lib/backend";
import {hasValidRequestOrigin} from "@/lib/request-origin";
import {moneyAuthHeaders} from "@/app/api/money/scope";
import {readSupportBody} from "@/lib/support-body";

async function forward(request:NextRequest,context:{params:Promise<{path:string}>}){
  const {path}=await context.params;
  if(!["preferences","categories","rate-alerts"].includes(path))return NextResponse.json({title:"Unknown notification setting"},{status:404});
  if(request.method!=="GET"&&(!request.headers.get("origin")||!hasValidRequestOrigin(request.headers.get("origin"),request.headers,request.nextUrl.origin)))return NextResponse.json({title:"Invalid request origin"},{status:403});
  const headers=await moneyAuthHeaders(request);
  if(!headers)return NextResponse.json({title:"Your session has expired"},{status:401});
  try{
    let body:string|undefined;
    if(request.method==="PUT"){
      try{body=new TextDecoder().decode(await readSupportBody(request,16384));JSON.parse(body);}catch{return NextResponse.json({title:"Invalid preferences"},{status:400});}
      headers["Content-Type"]="application/json";
    }
    const response=await backend(`/v1/notifications/${path}`,{method:request.method,headers,body,signal:AbortSignal.timeout(15000)});
    return NextResponse.json(await responseBody(response)??{},{status:response.status,headers:{"Cache-Control":"no-store"}});
  }catch{return NextResponse.json({title:"Notification settings are unavailable. Try again."},{status:503});}
}
export const GET=forward;
export const PUT=forward;
