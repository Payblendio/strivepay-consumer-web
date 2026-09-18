import {cookies} from "next/headers";
import {NextRequest,NextResponse} from "next/server";
import {ACCOUNT_SCOPE_COOKIE,ACCOUNT_SCOPE_HEADER,parseAccountScope} from "@/lib/account-scope";

export async function moneyAuthHeaders(request?:NextRequest){
  const jar=await cookies();
  const token=jar.get("sp_access")?.value;
  if(!token)return null;
  const scope=parseAccountScope(request?.headers.get(ACCOUNT_SCOPE_HEADER)??null)
    ??parseAccountScope(jar.get(ACCOUNT_SCOPE_COOKIE)?.value)
    ??null;
  const headers:Record<string,string>={
    Authorization:`Bearer ${token}`,
    Accept:"application/json",
  };
  if(scope)headers[ACCOUNT_SCOPE_HEADER]=scope;
  return headers;
}

export function moneyUnauthorized(){
  return NextResponse.json({type:"customer_session_expired",title:"Your session has expired",status:401},{status:401});
}
