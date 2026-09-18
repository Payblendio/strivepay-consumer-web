import {cookies} from "next/headers";
import {NextResponse} from "next/server";
import {backend,responseBody} from "@/lib/backend";

type Params={params:Promise<{id:string}>};

export async function GET(_request:Request,{params}:Params){
  const token=(await cookies()).get("sp_access")?.value;
  if(!token)return NextResponse.json({type:"customer_session_expired",title:"Your session has expired",status:401},{status:401});
  const {id}=await params;
  const upstream=await backend(`/v1/transactions/${encodeURIComponent(id)}/timeline`,{
    headers:{Authorization:`Bearer ${token}`,Accept:"application/json"},
  });
  const data=await responseBody(upstream);
  return NextResponse.json(data??[],{status:upstream.status});
}
