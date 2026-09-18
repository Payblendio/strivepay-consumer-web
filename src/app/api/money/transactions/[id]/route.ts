import {NextRequest,NextResponse} from "next/server";
import {backend,responseBody} from "@/lib/backend";
import {moneyAuthHeaders,moneyUnauthorized} from "../../scope";

type Params={params:Promise<{id:string}>};

export async function GET(request:NextRequest,{params}:Params){
  const headers=await moneyAuthHeaders(request);
  if(!headers)return moneyUnauthorized();
  const {id}=await params;
  const upstream=await backend(`/v1/transactions/${encodeURIComponent(id)}`,{headers});
  const data=await responseBody(upstream);
  return NextResponse.json(data??{},{status:upstream.status});
}
