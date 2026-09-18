import {describe,expect,it} from "vitest";
import {NextRequest} from "next/server";
// This installed Next build still exports the testing helper under its previous name.
import {unstable_doesMiddlewareMatch as doesProxyMatch} from "next/experimental/testing/server";
import {config,proxy} from "./proxy";
import {DASHBOARD_RETURN_TO_HEADER,dashboardReturnTo} from "./lib/dashboard-return-to";

describe("dashboard location proxy",()=>{
  it("overwrites spoofed location headers with the actual dashboard path and query",()=>{
    const request=new NextRequest("https://strivepay.test/dashboard/activity/abc?tab=timeline&page=2&_rsc=internal",{headers:{[DASHBOARD_RETURN_TO_HEADER]:"//evil.example",authorization:"Bearer fixture"}});
    const response=proxy(request);
    expect(response.headers.get(`x-middleware-request-${DASHBOARD_RETURN_TO_HEADER}`)).toBe("/dashboard/activity/abc?tab=timeline&page=2");
    expect(response.headers.get(DASHBOARD_RETURN_TO_HEADER)).toBeNull();
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-request-authorization")).toBe("Bearer fixture");
  });
  it.each(["/dashboard","/dashboard/activity/abc?status=pending","/dashboard/buy/add","/dashboard/sell/123"])("runs for dashboard route %s",url=>{
    expect(doesProxyMatch({config,nextConfig:{},url})).toBe(true);
  });
  it.each(["/","/login","/api/onboarding","/_next/static/app.js","/dashboard-spoof"])("does not affect unrelated route %s",url=>{
    expect(doesProxyMatch({config,nextConfig:{},url})).toBe(false);
  });
  it.each(["//evil.example","/\\evil.example","/login","/dashboardevil","/dashboard/../login","/dashboard/%2e%2e/login",null])("uses the safe fallback for invalid header %s",path=>{
    expect(dashboardReturnTo(path,"/dashboard/activity")).toBe("/dashboard/activity");
  });
});
