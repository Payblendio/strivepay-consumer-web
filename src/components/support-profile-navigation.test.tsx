// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
import type {DashboardCustomer} from "@/lib/dashboard-access";
const mocks=vi.hoisted(()=>({replace:vi.fn(),refresh:vi.fn(),signOut:vi.fn(),writeScope:vi.fn(),fetchScope:vi.fn()}));
vi.mock("next/navigation",()=>({useRouter:()=>({replace:mocks.replace,refresh:mocks.refresh})}));
vi.mock("@/lib/customer-auth",()=>({signOut:mocks.signOut}));
vi.mock("@/lib/account-scope",()=>({hasBusinessMembershipHint:()=>true,writeBrowserAccountScope:mocks.writeScope}));
vi.mock("@/lib/customer-session",()=>({setCustomerFetchAccountScope:mocks.fetchScope}));
vi.mock("@/lib/swal",()=>({confirmAction:vi.fn()}));
import {confirmAction} from "@/lib/swal";
import {DashboardProfileMenu} from "./dashboard-profile-menu";
import {useSupportUnloadWarning} from "@/lib/use-support-unload-warning";
const customer={givenName:"QA",familyName:"User",email:"qa@test.invalid"} as DashboardCustomer;
function View(){useSupportUnloadWarning(true);return <DashboardProfileMenu customer={customer}/>;}
beforeEach(()=>{vi.resetAllMocks();vi.stubGlobal("fetch",vi.fn());});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
function open(){render(<View/>);fireEvent.click(screen.getByRole("button",{name:"Account menu for qa@test.invalid"}));}
it("cancelling sign-out and account switching sends no mutation",async()=>{
 vi.mocked(confirmAction).mockResolvedValue(false);open();
 fireEvent.click(screen.getByRole("menuitem",{name:"Sign out"}));
 fireEvent.click(screen.getByRole("menuitem",{name:"Switch to company"}));
 await waitFor(()=>expect(confirmAction).toHaveBeenCalled());
 expect(mocks.signOut).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();expect(mocks.writeScope).not.toHaveBeenCalled();
});
it("confirmed sign-out uses client navigation to avoid a second unload prompt",async()=>{
 vi.mocked(confirmAction).mockResolvedValue(true);mocks.signOut.mockImplementation(async(navigate:()=>void)=>navigate());open();
 fireEvent.click(screen.getByRole("menuitem",{name:"Sign out"}));
 await waitFor(()=>expect(mocks.replace).toHaveBeenCalledWith("/login"));expect(confirmAction).toHaveBeenCalledOnce();
});
it("failed switching retains protection and the previous scope",async()=>{
 vi.mocked(confirmAction).mockResolvedValue(true);vi.mocked(fetch).mockResolvedValue(new Response(null,{status:503}));open();
 fireEvent.click(screen.getByRole("menuitem",{name:"Switch to company"}));
 await waitFor(()=>expect(fetch).toHaveBeenCalled());
 await waitFor(()=>expect(screen.getByRole("menuitem",{name:"Switch to company"})).toBeEnabled());
 expect(mocks.writeScope).not.toHaveBeenCalled();expect(mocks.refresh).not.toHaveBeenCalled();
 const event=new Event("beforeunload",{cancelable:true});window.dispatchEvent(event);expect(event.defaultPrevented).toBe(true);
});
