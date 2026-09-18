// @vitest-environment jsdom
import type {AnchorHTMLAttributes} from "react";
import {act,cleanup,fireEvent,render,screen} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {RouteError} from "@/lib/money-route-api";
import {BuyRoutePage} from "./buy-route-page";
import {CryptoRouteEditor} from "./crypto-route-editor";
import {PayInAccountEditor} from "./payin-account-editor";
import {PayoutAccountEditor} from "./payout-account-editor";
import {RouteOtpGate} from "./route-otp-gate";
import {SellAccountPage} from "./sell-route-page";

const mocks=vi.hoisted(()=>({money:vi.fn(),session:vi.fn(),show:vi.fn(),push:vi.fn(),refresh:vi.fn()}));
vi.mock("@/lib/money-route-api",async importOriginal=>({
  ...await importOriginal<typeof import("@/lib/money-route-api")>(),
  moneyRouteApi:mocks.money,
  sessionApi:mocks.session,
}));
vi.mock("next/navigation",()=>({useRouter:()=>({push:mocks.push,refresh:mocks.refresh})}));
vi.mock("next/link",()=>({default:({children,...props}:AnchorHTMLAttributes<HTMLAnchorElement>)=><a {...props}>{children}</a>}));
vi.mock("@/components/ui/toast",()=>({useToast:()=>({show:mocks.show})}));
vi.mock("./compliance-required-gate",()=>({useComplianceApproved:()=>true,ComplianceRequiredGate:()=>null}));
vi.mock("./dashboard-customer",()=>({useDashboardCustomer:()=>({givenName:"Ada",familyName:"Test",email:"ada@example.test",country:"IT",emailVerified:true,accountType:"PERSONAL"}),useDashboardSetup:()=>({approved:true,pending:false,failed:false,routesReady:true,complianceStatus:"FULL_USER"}),useDashboardFinance:()=>({accountScope:"PERSONAL",canMutateFinances:true})}));
vi.mock("./currency-pair-clip",()=>({CurrencyPairClip:()=>null}));
vi.mock("@/components/deposit-qr",()=>({DepositQr:({value}:{value:string})=><div data-testid="deposit-qr">{value}</div>}));
vi.mock("./money-route-controls",async importOriginal=>({
  ...await importOriginal<typeof import("./money-route-controls")>(),
  networkLogo:()=>null,
  fiatLogo:()=>null,
  RouteSelect:({label,value,options,onChange,disabled}:{label:string;value:string;options:Array<{value:string;label:string}>;onChange:(value:string)=>void;disabled?:boolean})=><label>{label}<select value={value} disabled={disabled} onChange={event=>onChange(event.target.value)}><option value="">Choose</option>{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>,
}));

const customer={givenName:"Ada",familyName:"Test",email:"ada@example.test",country:"IT",emailVerified:true,accountType:"PERSONAL"};
const wallet=`0x${"1".repeat(40)}`;
const preference={fiatCurrency:"EUR",token:"USDC",network:"POLYGON",routeType:"STABLECOIN",address:wallet,addressType:"SELF_HOSTED"};
const coverage={fiatCurrencies:[{code:"EUR",name:"Euro"}],fundingCurrencies:[{code:"EUR",name:"Euro"}],transferableAssets:[{code:"USDC",name:"USD Coin",type:"STABLECOIN",networks:[{code:"POLYGON",name:"Polygon"}]}]};
const bank={id:"payout-1",accountName:"Euro account",currency:"EUR",status:"ACTIVE",mainRecipient:true,accountMask:"•••• 1234"};
const bankForm={currency:"EUR",id:"eur",accountDetailsSchema:{required:["currency","iban"],properties:{currency:{type:"string",enum:["EUR"]},iban:{type:"string"}}}};
const address={payoutAccountId:bank.id,asset:"USDC",network:"POLYGON",address:wallet,active:true};

function defaultMoney(path:string){
  if(path==="/preferences")return Promise.resolve([preference]);
  if(path.startsWith("/coverage"))return Promise.resolve(coverage);
  if(path.startsWith("/funding-accounts"))return Promise.resolve([]);
  if(path.startsWith("/bank-accounts"))return Promise.resolve([bank]);
  if(path==="/bank-requirements")return Promise.resolve([bankForm]);
  throw new Error(`Unexpected mocked route: ${path}`);
}

beforeEach(()=>{
  mocks.money.mockReset().mockImplementation(defaultMoney);
  mocks.session.mockReset().mockImplementation((path:string)=>{
    if(path.startsWith("/coverage"))return Promise.resolve(coverage);
    if(path==="/session")return Promise.resolve({active:true});
    throw new Error(`Unexpected mocked session route: ${path}`);
  });
  mocks.show.mockClear();mocks.push.mockClear();mocks.refresh.mockClear();
});
afterEach(()=>{cleanup();vi.useRealTimers();});

describe("recoverable route loads",()=>{
  it("does not show empty Buy history when history reads fail and offers a server retry",async()=>{
    const {rerender}=render(<BuyRoutePage orders={[]} historyAvailable={false}/>);
    expect(await screen.findByText("Buy history is unavailable")).toBeInTheDocument();
    expect(screen.queryByText("No buy orders yet. Fund a pay-in account to start.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Retry history"}));
    expect(mocks.refresh).toHaveBeenCalledOnce();
    rerender(<BuyRoutePage orders={[]} historyAvailable/>);
    expect(screen.getByText("No buy orders yet. Fund a pay-in account to start.")).toBeInTheDocument();
  });

  it("keeps partial Buy history visible with Expected amounts and honest update dates",async()=>{
    render(<BuyRoutePage historyPartial historyLimited orders={[{id:"order-1",status:"PENDING",createdAt:"2026-09-01T10:00:00Z",dateBasis:"updated",fiatCurrency:"EUR",fiatAmount:"100",cryptoAsset:"USDC",cryptoAmount:"99",destinationLabel:"Expected",destinationDisplay:"99 USDC",network:"POLYGON"}]}/>);
    expect(await screen.findByText("Some buy history is unavailable")).toBeInTheDocument();
    expect(screen.getByText("Expected")).toBeInTheDocument();
    expect(screen.queryByText("Received")).not.toBeInTheDocument();
    expect(screen.getByText("99 USDC")).toBeInTheDocument();
    expect(screen.getByText(/^Updated ·/)).toBeInTheDocument();
    expect(screen.getByText(/Only recent history is loaded/)).toBeInTheDocument();
  });
  it("leaves the Buy error screen after a successful retry",async()=>{
    let attempts=0;
    mocks.money.mockImplementation((path:string)=>path==="/preferences"&&attempts++===0?Promise.reject(new Error("Temporarily unavailable")):defaultMoney(path));
    render(<BuyRoutePage orders={[]}/>);
    expect(await screen.findByRole("alert")).toHaveTextContent("Temporarily unavailable");
    fireEvent.click(screen.getByRole("button",{name:"Try again"}));
    expect(await screen.findByText("Receiving wallet")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([
    ["crypto destination",()=> <CryptoRouteEditor customer={customer}/>,"Bank currency"],
    ["pay-in currencies",()=> <PayInAccountEditor customer={customer}/>,"Currency"],
    ["payout options",()=> <PayoutAccountEditor customer={customer}/>,"Payout currency"],
  ] as const)("recovers %s without disguising a failed load as empty",async(_name,element,label)=>{
    let attempts=0;
    mocks.session.mockImplementation((path:string)=>{
      if(path.startsWith("/coverage"))return attempts++===0?Promise.reject(new Error("Options are temporarily unavailable")):Promise.resolve(coverage);
      return Promise.resolve({active:true});
    });
    render(element());
    expect(await screen.findByRole("alert")).toHaveTextContent("Options are temporarily unavailable");
    expect(screen.queryByText("You already have a pay-in account for every available currency.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Try again"}));
    expect(await screen.findByLabelText(label)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mocks.money.mock.calls.every(([,init])=>!init?.method||init.method==="GET")).toBe(true);
  });

  it("distinguishes no eligible pay-in currencies from already owning every currency",async()=>{
    mocks.session.mockResolvedValue({...coverage,fundingCurrencies:[]});
    render(<PayInAccountEditor customer={customer}/>);
    expect(await screen.findByText("No pay-in currencies are available for your account right now.")).toBeInTheDocument();
    expect(screen.queryByText("You already have a pay-in account for every available currency.")).not.toBeInTheDocument();
  });

  it("offers retry when a pay-in load stalls",async()=>{
    vi.useFakeTimers();
    mocks.session.mockImplementation(()=>new Promise(()=>{}));
    render(<PayInAccountEditor customer={customer}/>);
    await act(async()=>{await vi.advanceTimersByTimeAsync(12001);});
    expect(screen.getByRole("alert")).toHaveTextContent("Loading took too long");
    expect(screen.getByRole("button",{name:"Try again"})).toBeInTheDocument();
  });

  it("keeps the local payout route usable when international catalogs are unavailable",async()=>{
    mocks.money.mockImplementation((path:string)=>path==="/preferences"?Promise.resolve([{...preference,fiatCurrency:"NGN",routeType:"NATIVE"}]):Promise.reject(new Error("International service unavailable")));
    mocks.session.mockRejectedValue(new Error("International service unavailable"));
    render(<PayoutAccountEditor customer={{...customer,country:"NG"}}/>);
    expect(await screen.findByLabelText("Account holder name",{exact:false})).toHaveValue("Ada Test");
    expect(screen.getByLabelText("Payout currency")).toHaveValue("NGN");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"Send code"})).not.toBeInTheDocument();
  });

  it("retries a failed bank list without losing entered account details",async()=>{
    let attempts=0;
    mocks.money.mockImplementation((path:string)=>{
      if(path==="/bank-requirements")return Promise.resolve([{currency:"EUR",id:"eur",accountDetailsSchema:{required:["currency","bank_code","account_number"],properties:{bank_code:{type:"string"},account_number:{type:"string"}}}}]);
      if(path.startsWith("/supported-banks"))return attempts++===0?Promise.reject(new Error("Bank list unavailable")):Promise.resolve([{code:"001",name:"Example bank"}]);
      return defaultMoney(path);
    });
    render(<PayoutAccountEditor customer={customer}/>);
    expect(await screen.findByRole("alert")).toHaveTextContent("Bank list unavailable");
    fireEvent.change(screen.getByLabelText("Account name",{exact:false}),{target:{value:"Travel account"}});
    fireEvent.click(screen.getByRole("button",{name:"Retry banks"}));
    expect(await screen.findByRole("button",{name:/Choose a supported bank/})).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Account name",{exact:false})).toHaveValue("Travel account");
  });
});

describe("secure session recovery",()=>{
  it("reopens verification only when active access is explicitly invalidated",async()=>{
    render(<RouteOtpGate email={customer.email}>{(active,requireSession)=><div><span>{active?"Session active":"Session missing"}</span><button onClick={()=>requireSession({expired:true})}>Session expired</button></div>}</RouteOtpGate>);
    expect(await screen.findByText("Session active")).toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"Send code"})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Session expired"}));
    expect(screen.getByRole("button",{name:"Send code"})).toBeInTheDocument();
    expect(mocks.session.mock.calls.every(([path])=>path==="/session")).toBe(true);
  });

  it("preserves the destination fields when a mocked save reports session expiry",async()=>{
    mocks.money.mockImplementation((path:string)=>path==="/crypto"?Promise.reject(new RouteError("Confirm this session",409,"verification_session_expired")):defaultMoney(path));
    mocks.session.mockImplementation((path:string)=>{
      if(path.startsWith("/coverage"))return Promise.resolve(coverage);
      if(path==="/session")return Promise.resolve({active:true});
      if(path==="/session/start"||path==="/session/otp")return Promise.resolve({});
      throw new Error(`Unexpected mocked session route: ${path}`);
    });
    render(<CryptoRouteEditor customer={customer}/>);
    const input=await screen.findByLabelText("Receiving wallet",{exact:false});
    expect(input).toHaveValue(wallet);
    fireEvent.click(screen.getByRole("button",{name:"Save destination"}));
    expect(await screen.findByRole("button",{name:"Send code"})).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.money.mock.calls.filter(([path])=>path==="/crypto")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button",{name:"Send code"}));
    fireEvent.change(await screen.findByLabelText("Email verification code"),{target:{value:"123456"}});
    fireEvent.click(screen.getByRole("button",{name:"Unlock setup"}));
    expect(await screen.findByLabelText("Receiving wallet",{exact:false})).toHaveValue(wallet);
    expect(mocks.money.mock.calls.filter(([path])=>path==="/crypto")).toHaveLength(1);
  });
});

describe("sell address readiness",()=>{
  it("shows a neutral pending state and can recover into a usable address",async()=>{
    let checks=0;
    mocks.money.mockImplementation((path:string)=>path==="/deposit-addresses"?Promise.resolve(checks++===0?{...address,address:"PENDING",active:false}:address):defaultMoney(path));
    render(<SellAccountPage accountId={bank.id}/>);
    expect(await screen.findByText("Preparing your address")).toBeInTheDocument();
    expect(screen.queryByText("Could not load this address")).not.toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"Copy address"})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Check again"}));
    expect(await screen.findByRole("button",{name:"Copy address"})).toBeInTheDocument();
    expect(screen.getByTestId("deposit-qr")).toHaveTextContent(wallet);
  });

  it("aborts a stalled address request and exposes a retry action",async()=>{
    vi.useFakeTimers();
    let signal:AbortSignal|undefined;
    mocks.money.mockImplementation((path:string,init?:RequestInit)=>{
      if(path==="/deposit-addresses"){signal=init?.signal??undefined;return new Promise(()=>{});}
      return defaultMoney(path);
    });
    render(<SellAccountPage accountId={bank.id}/>);
    await act(async()=>{await vi.advanceTimersByTimeAsync(0);});
    await act(async()=>{await vi.advanceTimersByTimeAsync(121);});
    expect(screen.getByText("Loading send address")).toBeInTheDocument();
    await act(async()=>{await vi.advanceTimersByTimeAsync(15001);});
    expect(signal?.aborted).toBe(true);
    expect(screen.getByText("Could not load this address")).toBeInTheDocument();
    expect(screen.getByRole("button",{name:"Try again"})).toBeInTheDocument();
  });
});
