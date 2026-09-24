import {NextResponse} from "next/server";
import {backend,responseBody} from "@/lib/backend";

export async function GET(){
  const upstream=await backend("/v1/jurisdictions").catch(()=>null);
  if(!upstream)return NextResponse.json({title:"Supported countries are temporarily unavailable"},{status:503});
  const data=await responseBody(upstream);
  return NextResponse.json(data??[],{status:upstream.status,headers:upstream.ok?{"Cache-Control":"public, max-age=300"}:{}});
}
