import {describe,expect,it} from "vitest";
import {RouteError,sessionRequired} from "./money-route-api";

describe("route session error classification",()=>{
  it.each(["verification_session_expired","verification_session_required","provider_session_required"])("recognizes %s as a secure-session condition",type=>{
    expect(sessionRequired(new RouteError("Confirm session",409,type))).toBe(true);
  });
  it.each([
    [409,"payout_account_exists"],
    [409,"identity_already_complete"],
    [409,"upstream_resource_conflict"],
    [401,"customer_session_expired"],
    [401,undefined],
  ] as const)("does not turn %s / %s into an OTP request",(status,type)=>{
    expect(sessionRequired(new RouteError("A different problem",status,type))).toBe(false);
  });
});
