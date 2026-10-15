// @vitest-environment jsdom
import React from "react";
import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {NotificationSettings} from "./notification-settings";

const fetcher=vi.hoisted(()=>vi.fn());
vi.mock("@/lib/customer-session",()=>({customerFetch:fetcher}));
vi.mock("@/components/account-page",()=>({AccountPage:({children}:{children:React.ReactNode})=><main>{children}</main>}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
describe("notification settings",()=>{
  it("saves only the changed category and retains asset choices with push disabled",async()=>{
    let enabled=true;
    fetcher.mockImplementation(async(path:string,init?:RequestInit)=>{
      if(init?.method==="PUT"){enabled=false;return {ok:true,json:async()=>({})};}
      return {ok:true,json:async()=>path.endsWith("categories")?{push:false,categories:[{code:"TRANSACTIONS",enabled,effective:false}]}:{enabled:true,effective:false,localCurrency:"NGN",timeZone:"Africa/Lagos",assets:[{code:"BTC",enabled:true}]}};
    });
    render(<NotificationSettings/>);
    const toggle=await screen.findByRole("switch",{name:"Transactions"});fireEvent.click(toggle);
    await screen.findByText("Preferences saved");
    expect(fetcher).toHaveBeenCalledWith("/api/notifications/categories",expect.objectContaining({method:"PUT",body:JSON.stringify({categories:{TRANSACTIONS:false}})}));
    expect((screen.getByRole("switch",{name:"BTC / NGN"}) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("switch",{name:"Allow mobile push notifications"}) as HTMLInputElement).checked).toBe(false);
  });
  it("shows save errors without falsely changing the saved setting",async()=>{
    fetcher.mockImplementation(async(path:string,init?:RequestInit)=>({ok:init?.method!=="PUT",json:async()=>init?.method==="PUT"?{title:"Please retry"}:path.endsWith("categories")?{push:true,categories:[]}:{enabled:true,effective:true,localCurrency:"NGN",timeZone:"Africa/Lagos",assets:[]}}));
    render(<NotificationSettings/>);fireEvent.click(await screen.findByRole("switch",{name:"Allow mobile push notifications"}));
    await waitFor(()=>expect(screen.getByRole("alert").textContent).toContain("Please retry"));
    expect((screen.getByRole("switch",{name:"Allow mobile push notifications"}) as HTMLInputElement).checked).toBe(true);
  });
});
