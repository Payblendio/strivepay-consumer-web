// @vitest-environment jsdom
import {createElement} from "react";
import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {DashboardFrame} from "./dashboard-frame";
vi.mock("next/navigation",()=>({usePathname:()=>"/dashboard",useRouter:()=>({refresh:vi.fn()})}));
vi.mock("next/image",()=>({default:({src,alt}:{src:string;alt:string})=>createElement("img",{src,alt})}));
vi.mock("./dashboard-profile-menu",()=>({DashboardProfileMenu:()=>null}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const customer={givenName:"Test",familyName:"User",email:"test@example.test",country:"IT",emailVerified:true,accountType:"PERSONAL"};
const setup={approved:true,pending:false,failed:false,routesReady:true,complianceStatus:"FULL_USER"};
describe("dashboard navigation",()=>{
  it("keeps the closed mobile navigation inert, traps focus while open, and restores the opener",()=>{
    vi.stubGlobal("matchMedia",()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
    const {container}=render(<DashboardFrame customer={customer} setup={setup}><button>Workspace action</button></DashboardFrame>);
    const sidebar=screen.getByRole("complementary",{name:"Dashboard navigation"});
    expect(sidebar).toHaveAttribute("inert");
    const opener=screen.getByRole("button",{name:"Open navigation"});
    fireEvent.click(opener);
    expect(screen.getByRole("dialog",{name:"Dashboard navigation"})).toHaveAttribute("aria-modal","true");
    expect(screen.getByRole("button",{name:"Close navigation"})).toHaveFocus();
    expect(container.querySelector(".dashboard-workspace")).toHaveAttribute("inert");
    expect(document.body.style.overflow).toBe("hidden");
    screen.getByRole("button",{name:"Pause adverts"}).focus();
    fireEvent.keyDown(document,{key:"Tab"});
    expect(screen.getByRole("link",{name:"StrivePay dashboard"})).toHaveFocus();
    fireEvent.keyDown(document,{key:"Escape"});
    expect(opener).toHaveFocus();
    expect(opener).toHaveAttribute("aria-expanded","false");
    expect(sidebar).toHaveAttribute("inert");
    expect(document.body.style.overflow).toBe("");
  });
  it("keeps desktop navigation available and exposes notifications",()=>{
    vi.stubGlobal("matchMedia",()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
    render(<DashboardFrame customer={customer} setup={setup}><p>Workspace</p></DashboardFrame>);
    expect(screen.getByRole("complementary")).not.toHaveAttribute("inert");
    expect(screen.getByRole("button",{name:"Notifications"})).toBeInTheDocument();
  });
  it("keeps history accessible without claiming setup is incomplete when its service is unavailable",()=>{
    vi.stubGlobal("matchMedia",()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
    render(<DashboardFrame customer={customer} setup={null}><p>Existing activity</p></DashboardFrame>);
    expect(screen.getByRole("status")).toHaveTextContent("Setup status unavailable");
    expect(screen.getByText("Existing activity")).toBeInTheDocument();
    expect(screen.queryByText("Continue compliance")).toBeNull();
  });
});
