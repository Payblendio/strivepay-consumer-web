import {NextResponse} from "next/server";
import {backend,responseBody} from "@/lib/backend";

export async function GET(){
  const upstream=await backend("/v1/assets").catch(()=>null);
  if(!upstream)return NextResponse.json([],{status:503});
  const data=await responseBody(upstream);
  return NextResponse.json(Array.isArray(data)?data:[],{status:upstream.ok?200:upstream.status,headers:upstream.ok?{"Cache-Control":"public, max-age=300"}:{}});
}
