// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {afterEach,describe,expect,it,vi} from "vitest";
import {ComplianceRequiredGate,useComplianceApproved} from "./compliance-required-gate";
import {DashboardCustomerProvider,useDashboardSetup} from "./dashboard-customer";
const mocks=vi.hoisted(()=>({refresh:vi.fn()}));
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:mocks.refresh})}));
const customer={givenName:"Test",familyName:"Person",country:"IT",email:"test@example.com",emailVerified:true,accountType:"PERSONAL"};
afterEach(()=>{cleanup();mocks.refresh.mockReset();});
function State(){const setup=useDashboardSetup();return <p>{setup===null?"unknown":"known"}:{String(useComplianceApproved())}</p>;}
describe("unknown setup status",()=>{
  it("keeps missing setup evidence null in context, without authorizing actions",()=>{
    render(<DashboardCustomerProvider customer={customer}><State/></DashboardCustomerProvider>);
    expect(screen.getByText("unknown:false")).toBeInTheDocument();
  });
  it("renders a retry instead of claiming compliance is required during an outage",()=>{
    render(<DashboardCustomerProvider customer={customer} setup={null}><ComplianceRequiredGate titleId="gate" title="Verification required" detail="Complete verification first."/></DashboardCustomerProvider>);
    expect(screen.getByText("Setup status unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Verification required")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Retry setup status"}));
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });
});
