// @vitest-environment jsdom
import type {AnchorHTMLAttributes} from "react";
import {act,cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {AccountsPage} from "./accounts-page";
import {HowItWorksPage} from "./how-it-works-page";

const mocks=vi.hoisted(()=>({money:vi.fn(),show:vi.fn(),copy:vi.fn()}));
vi.mock("@/lib/money-route-api",async importOriginal=>({
  ...await importOriginal<typeof import("@/lib/money-route-api")>(),
  moneyRouteApi:mocks.money,
}));
vi.mock("@/components/ui/toast",()=>({useToast:()=>({show:mocks.show})}));
vi.mock("next/link",()=>({default:({children,...props}:AnchorHTMLAttributes<HTMLAnchorElement>)=><a {...props}>{children}</a>}));
vi.mock("./compliance-required-gate",()=>({useComplianceApproved:()=>true,ComplianceRequiredGate:()=>null}));
vi.mock("./dashboard-customer",()=>({
  useDashboardFinance:()=>({accountScope:"PERSONAL",canMutateFinances:true}),
  useDashboardCustomer:()=>({country:"GB",email:"ada@example.com",givenName:"Ada",familyName:"Test"}),
}));
vi.mock("./currency-pair-clip",()=>({CurrencyPairClip:()=>null}));
vi.mock("./money-route-controls",()=>({fiatLogo:()=>null,networkRailLabel:(value:string)=>value}));

function mockAccounts(details:Record<string,string>){
  mocks.money.mockImplementation((path:string)=>{
    if(path==="/preferences"||path.startsWith("/bank-accounts")||path==="/native-destinations")return Promise.resolve([]);
    if(path==="/native-funding-account")return Promise.resolve(null);
    if(path.startsWith("/funding-accounts"))return Promise.resolve([{id:"funding-1",currency:"GBP",status:"ACTIVE",...details}]);
    return Promise.reject(new Error(`Unexpected mocked route: ${path}`));
  });
}

beforeEach(()=>{mocks.money.mockReset();mocks.show.mockReset();mocks.copy.mockReset().mockResolvedValue(undefined);Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:mocks.copy}});});
afterEach(()=>{cleanup();vi.useRealTimers();});

describe("account refresh recovery",()=>{
  it("keeps loaded accounts on refresh failure and replaces them only after a successful retry",async()=>{
    let attempts=0;
    let finishRetry:(value:unknown)=>void=()=>{};
    const retry=new Promise(resolve=>{finishRetry=resolve;});
    mocks.money.mockImplementation((path:string)=>{
      if(path==="/preferences"||path.startsWith("/bank-accounts")||path==="/native-destinations")return Promise.resolve([]);
      if(path==="/native-funding-account")return Promise.resolve(null);
      if(path==="/funding-accounts")return Promise.resolve([{id:"funding-1",currency:"GBP",status:"PENDING",accountNumber:"12345678"}]);
      if(path==="/funding-accounts?refresh=true")return attempts++===0?Promise.reject(new Error("Refresh temporarily unavailable")):retry;
      return Promise.reject(new Error(`Unexpected mocked route: ${path}`));
    });
    render(<AccountsPage/>);
    expect(await screen.findByText("12345678")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Refresh accounts"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("Showing last loaded details");
    expect(screen.getByText("12345678")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Try again"}));
    expect(screen.getByRole("button",{name:"Refreshing…"})).toBeDisabled();
    expect(screen.getByText("12345678")).toBeInTheDocument();
    await act(async()=>{finishRetry([{id:"funding-1",currency:"GBP",status:"ACTIVE",accountNumber:"87654321"}]);});
    expect(await screen.findByText("87654321")).toBeInTheDocument();
    expect(screen.queryByText("12345678")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button",{name:"Refresh accounts"})).toBeEnabled();
  });

  it("bounds a stalled background refresh while retaining loaded details",async()=>{
    mocks.money.mockImplementation((path:string)=>{
      if(path==="/preferences"||path.startsWith("/bank-accounts")||path==="/native-destinations")return Promise.resolve([]);
      if(path==="/native-funding-account")return Promise.resolve(null);
      if(path==="/funding-accounts")return Promise.resolve([{id:"funding-1",currency:"GBP",status:"PENDING",accountNumber:"12345678"}]);
      if(path==="/funding-accounts?refresh=true")return new Promise(()=>{});
      return Promise.reject(new Error(`Unexpected mocked route: ${path}`));
    });
    render(<AccountsPage/>);
    expect(await screen.findByText("12345678")).toBeInTheDocument();
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button",{name:"Refresh accounts"}));
    expect(screen.getByRole("button",{name:"Refreshing…"})).toBeDisabled();
    await act(async()=>{await vi.advanceTimersByTimeAsync(12001);});
    expect(screen.getByRole("alert")).toHaveTextContent("Loading took too long");
    expect(screen.getByText("12345678")).toBeInTheDocument();
    expect(screen.getByRole("button",{name:"Refresh accounts"})).toBeEnabled();
  });
});

describe("bank identifier copy safety",()=>{
  it("displays masked account and routing values without offering copy",async()=>{
    mockAccounts({accountMask:"•••• 1234",routingMask:"**-**-56"});
    render(<AccountsPage/>);
    expect(await screen.findByText("•••• 1234")).toBeInTheDocument();
    expect(screen.getByText("**-**-56")).toBeInTheDocument();
    expect(screen.getByText(/Full bank details are unavailable/)).toBeInTheDocument();
    expect(screen.queryByRole("button",{name:/^Copy/})).not.toBeInTheDocument();
    expect(mocks.copy).not.toHaveBeenCalled();
    expect(mocks.show).not.toHaveBeenCalled();
  });

  it("also blocks masked content arriving in full-number fields",async()=>{
    mockAccounts({accountNumber:"XXXX1234",routingNumber:"••••56"});
    render(<AccountsPage/>);
    expect(await screen.findByText("XXXX1234")).toBeInTheDocument();
    expect(screen.queryByRole("button",{name:/^Copy/})).not.toBeInTheDocument();
    expect(mocks.copy).not.toHaveBeenCalled();
  });

  it("copies complete identifiers and confirms only after clipboard success",async()=>{
    mockAccounts({accountNumber:"12345678",accountMask:"•••• 5678",routingNumber:"102030",routingMask:"**-**-30"});
    render(<AccountsPage/>);
    fireEvent.click(await screen.findByRole("button",{name:"Copy Account / IBAN"}));
    await waitFor(()=>expect(mocks.show).toHaveBeenCalledWith(expect.objectContaining({tone:"success",message:"Account / IBAN copied."})));
    expect(mocks.copy).toHaveBeenCalledWith("12345678");
    expect(screen.getByRole("button",{name:"Copy Sort code"})).toBeInTheDocument();
    expect(screen.queryByText(/Full bank details are unavailable/)).not.toBeInTheDocument();
  });

  it("does not report Copied when clipboard permission fails",async()=>{
    mockAccounts({accountNumber:"12345678"});
    mocks.copy.mockRejectedValue(new Error("Permission denied"));
    render(<AccountsPage/>);
    fireEvent.click(await screen.findByRole("button",{name:"Copy Account / IBAN"}));
    await waitFor(()=>expect(mocks.show).toHaveBeenCalledWith(expect.objectContaining({tone:"danger",title:"Copy failed"})));
    expect(mocks.show).not.toHaveBeenCalledWith(expect.objectContaining({tone:"success"}));
  });
});

it("describes user-chosen receiving wallets without claiming StrivePay custody",()=>{
  render(<HowItWorksPage/>);
  expect(screen.getByText(/This can be a wallet you control or an exchange or custodian account/)).toBeInTheDocument();
  expect(screen.queryByText(/StrivePay settlement wallet|You can then hold it/i)).not.toBeInTheDocument();
});
