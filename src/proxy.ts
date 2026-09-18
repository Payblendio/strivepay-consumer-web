import {NextResponse,type NextRequest} from "next/server";
import {DASHBOARD_RETURN_TO_HEADER,dashboardReturnTo} from "./lib/dashboard-return-to";

/** Carries location only. Authentication and authorization stay in the server helpers. */
export function proxy(request:NextRequest){
  const requestHeaders=new Headers(request.headers);
  const search=new URLSearchParams(request.nextUrl.search);
  search.delete("_rsc");
  const query=search.toString();
  // Always overwrite incoming values; clients cannot choose the forwarded destination.
  requestHeaders.set(DASHBOARD_RETURN_TO_HEADER,dashboardReturnTo(`${request.nextUrl.pathname}${query?`?${query}`:""}`));
  return NextResponse.next({request:{headers:requestHeaders}});
}

export const config={matcher:"/dashboard/:path*"};
