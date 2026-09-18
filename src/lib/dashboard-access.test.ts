import {beforeEach,describe,expect,it,vi} from "vitest";
import {backendJson,loadAccountSetup,requireDashboardCustomer,requireSetupSupportCustomer} from "./dashboard-access";
import {DASHBOARD_RETURN_TO_HEADER} from "./dashboard-return-to";

const mocks=vi.hoisted(()=>({backend:vi.fn(),token:"fixture-token" as string|undefined,requestHeaders:new Headers(),redirect:vi.fn()}));
vi.mock("./backend",()=>({backend:mocks.backend}));
vi.mock("next/headers",()=>({headers:async()=>mocks.requestHeaders,cookies:async()=>({get:()=>mocks.token?{value:mocks.token}:undefined})}));
vi.mock("next/navigation",()=>({redirect:(url:string)=>{mocks.redirect(url);throw new Error(`REDIRECT ${url}`);}}));

const customer={givenName:"Test",familyName:"Person",email:"test@example.com",country:"IT",emailVerified:true,accountType:"PERSONAL"};
const fixtures:Record<string,unknown>={
  "/v1/auth/me":customer,
  "/v1/onboarding":{complianceStatus:"FULL_USER"},
  "/v1/onboarding/money-routes/crypto":[{routeType:"DIRECT"}],
  "/v1/bank-accounts":[{id:"payout-one"}],
  "/v1/bank-accounts?size=100":[{id:"payout-one"}],
  "/v1/onboarding/money-routes/native-destinations":[],
};
function json(value:unknown,status=200){return new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json"}});}
beforeEach(()=>{
  mocks.token="fixture-token";mocks.requestHeaders=new Headers();mocks.redirect.mockReset();mocks.backend.mockReset();
  mocks.backend.mockImplementation(async(path:string)=>json(fixtures[path]??[]));
});

describe("backend JSON reads",()=>{
  it("reports malformed JSON as an unsuccessful read",async()=>{
    mocks.backend.mockResolvedValue(new Response("<html>gateway error</html>",{status:200}));
    expect(await backendJson("fixture","/data")).toEqual({ok:false,status:200,value:null,error:"invalid-response"});
  });
  it("returns a typed unavailable result on a network failure",async()=>{
    mocks.backend.mockRejectedValue(new Error("internal host unavailable"));
    expect(await backendJson("fixture","/data")).toEqual({ok:false,status:0,value:null,error:"network"});
  });
  it("preserves unsuccessful HTTP status and supports deliberate empty responses",async()=>{
    mocks.backend.mockResolvedValueOnce(json({message:"no access"},401));
    expect(await backendJson("fixture","/data")).toEqual({ok:false,status:401,value:null,error:"http"});
    mocks.backend.mockResolvedValueOnce(new Response(null,{status:204}));
    expect(await backendJson("fixture","/data")).toEqual({ok:true,status:204,value:null});
  });
});

describe("dashboard authentication destinations",()=>{
  it("allows setup support before account selection without relaxing dashboard gates",async()=>{
    mocks.backend.mockImplementation(async()=>json({...customer,accountType:null}));
    expect((await requireSetupSupportCustomer()).customer.accountType).toBeNull();
    await expect(requireDashboardCustomer()).rejects.toThrow("REDIRECT /onboarding/account-type");
  });
  it("still requires a verified email for setup support",async()=>{
    mocks.backend.mockImplementation(async()=>json({...customer,emailVerified:false,accountType:null}));
    await expect(requireSetupSupportCustomer()).rejects.toThrow("REDIRECT /verify-email");
  });
  it("requires login and retains the setup support destination",async()=>{
    mocks.token=undefined;
    await expect(requireSetupSupportCustomer()).rejects.toThrow("REDIRECT /login?returnTo=%2Fsupport");
  });
  it("preserves the proxy-supplied deep link on initial sign-in",async()=>{
    mocks.token=undefined;mocks.requestHeaders.set(DASHBOARD_RETURN_TO_HEADER,"/dashboard/activity/order-id?tab=timeline");
    await expect(requireDashboardCustomer()).rejects.toThrow("REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/login?returnTo=%2Fdashboard%2Factivity%2Forder-id%3Ftab%3Dtimeline");
    expect(mocks.backend).not.toHaveBeenCalled();
  });
  it("preserves the deep link and reason when authentication has expired",async()=>{
    mocks.requestHeaders.set(DASHBOARD_RETURN_TO_HEADER,"/dashboard/sell/account-id?asset=BTC");
    mocks.backend.mockResolvedValue(json({},401));
    await expect(requireDashboardCustomer("/dashboard")).rejects.toThrow("REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/login?returnTo=%2Fdashboard%2Fsell%2Faccount-id%3Fasset%3DBTC&reason=session-expired");
  });
  it("rejects a malformed forwarding header even when the helper is invoked directly",async()=>{
    mocks.token=undefined;mocks.requestHeaders.set(DASHBOARD_RETURN_TO_HEADER,"/\\example.com");
    await expect(requireDashboardCustomer("/dashboard/activity")).rejects.toThrow("REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/login?returnTo=%2Fdashboard%2Factivity");
  });
  it("does not disguise an account service outage as a login failure",async()=>{
    mocks.backend.mockResolvedValue(json({},503));
    await expect(requireDashboardCustomer()).rejects.toThrow("Your account could not be loaded");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it("does not treat malformed account JSON as an unverified email",async()=>{
    mocks.backend.mockResolvedValue(json({message:"wrong response"}));
    await expect(requireDashboardCustomer()).rejects.toThrow("Your account could not be loaded");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it("preserves the existing email and account-type gates",async()=>{
    mocks.backend.mockResolvedValueOnce(json({...customer,emailVerified:false}));
    await expect(requireDashboardCustomer()).rejects.toThrow("REDIRECT /verify-email?email=test%40example.com");
    mocks.backend.mockResolvedValueOnce(json({...customer,accountType:null}));
    await expect(requireDashboardCustomer()).rejects.toThrow("REDIRECT /onboarding/account-type");
  });
});

describe("setup availability",()=>{
  it("reports approved completed setup when all required evidence was loaded",async()=>{
    expect(await loadAccountSetup("fixture")).toEqual({status:"ready",setup:{approved:true,pending:false,failed:false,routesReady:true,complianceStatus:"FULL_USER"}});
  });
  it.each(["/v1/onboarding","/v1/onboarding/money-routes/crypto","/v1/bank-accounts?size=100"])("does not fabricate incomplete setup when %s fails",async failedPath=>{
    mocks.backend.mockImplementation(async(path:string)=>path===failedPath?json({},503):json(fixtures[path]));
    expect(await loadAccountSetup("fixture")).toEqual({status:"unavailable",reason:"http",httpStatus:503});
  });
  it.each([
    ["/v1/onboarding",{}],["/v1/onboarding",null],["/v1/onboarding",{complianceStatus:42}],
    ["/v1/onboarding/money-routes/crypto",{}],["/v1/onboarding/money-routes/crypto",[null]],["/v1/bank-accounts?size=100",{}],
  ])("rejects an invalid setup response for %s",async(pathToChange,value)=>{
    mocks.backend.mockImplementation(async(path:string)=>json(path===pathToChange?value:fixtures[path]));
    expect(await loadAccountSetup("fixture")).toEqual({status:"unavailable",reason:"invalid-response",httpStatus:200});
  });
  it("checks native payouts for a native route without depending on unrelated bank accounts",async()=>{
    mocks.backend.mockImplementation(async(path:string)=>path==="/v1/bank-accounts?size=100"?json({},503):json(path.endsWith("/crypto")?[{routeType:"NATIVE"}]:path.endsWith("/native-destinations")?[{id:"native-payout"}]:fixtures[path]));
    const result=await loadAccountSetup("fixture");
    expect(result.status).toBe("ready");
    if(result.status==="ready")expect(result.setup.routesReady).toBe(true);
  });
  it("ignores unavailable native payout data for a direct route",async()=>{
    mocks.backend.mockImplementation(async(path:string)=>path.endsWith("/native-destinations")?json({},503):json(fixtures[path]));
    const result=await loadAccountSetup("fixture");
    expect(result.status).toBe("ready");
    if(result.status==="ready")expect(result.setup.routesReady).toBe(true);
  });
  it("distinguishes a valid incomplete setup from a failed read",async()=>{
    mocks.backend.mockImplementation(async(path:string)=>json(path==="/v1/onboarding"?{complianceStatus:"NOT_STARTED"}:[]));
    expect(await loadAccountSetup("fixture")).toEqual({status:"ready",setup:{approved:false,pending:false,failed:false,routesReady:false,complianceStatus:"NOT_STARTED"}});
  });
  it("treats Bakkt not-started onboarding as incomplete setup",async()=>{
    mocks.backend.mockImplementation(async(path:string)=>path==="/v1/onboarding"?json({title:"upstream service onboarding has not started"},400):json(fixtures[path]??[]));
    expect(await loadAccountSetup("fixture")).toEqual({status:"ready",setup:{approved:false,pending:false,failed:false,routesReady:false,complianceStatus:"NOT_STARTED"}});
  });
  it("treats identity-gated money routes as incomplete setup, not an outage",async()=>{
    mocks.backend.mockImplementation(async(path:string)=>{
      if(path==="/v1/onboarding")return json({complianceStatus:"NOT_STARTED"});
      if(path==="/v1/onboarding/money-routes/crypto"||path.startsWith("/v1/bank-accounts"))return json({type:"identity_verification_required",title:"Complete individual identity verification"},403);
      return json(fixtures[path]??[]);
    });
    expect(await loadAccountSetup("fixture")).toEqual({status:"ready",setup:{approved:false,pending:false,failed:false,routesReady:false,complianceStatus:"NOT_STARTED"}});
  });
});
