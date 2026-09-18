import {NextRequest,NextResponse} from "next/server";
import {backend,responseBody} from "@/lib/backend";
import {moneyAuthHeaders,moneyUnauthorized} from "../scope";

export async function GET(request:NextRequest){
  const headers=await moneyAuthHeaders(request);
  if(!headers)return moneyUnauthorized();
  const params=new URLSearchParams();
  for(const key of ["page","size","direction","status","from","to"] as const){
    const value=request.nextUrl.searchParams.get(key);
    if(value)params.set(key,value);
  }
  if(!params.has("page"))params.set("page","0");
  if(!params.has("size"))params.set("size","100");
  const upstream=await backend(`/v1/activity?${params.toString()}`,{headers});
  const data=await responseBody(upstream);
  return NextResponse.json(data??{page:0,size:0,total:0,items:[]},{status:upstream.status});
}
