import {NextRequest,NextResponse} from "next/server";
import {backend,responseBody} from "@/lib/backend";
import {moneyAuthHeaders,moneyUnauthorized} from "../scope";

export async function GET(request:NextRequest){
  const headers=await moneyAuthHeaders(request);
  if(!headers)return moneyUnauthorized();
  const page=request.nextUrl.searchParams.get("page")??"0";
  const size=request.nextUrl.searchParams.get("size")??"20";
  const upstream=await backend(`/v1/transactions?page=${encodeURIComponent(page)}&size=${encodeURIComponent(size)}`,{headers});
  const data=await responseBody(upstream);
  return NextResponse.json(data??[],{status:upstream.status});
}
