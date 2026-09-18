// @vitest-environment jsdom
import {act,cleanup,fireEvent,render,screen,within} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {RateCalculator} from "./rate-calculator";

const mocks=vi.hoisted(()=>({fetch:vi.fn(),country:"IT",setup:{approved:true} as {approved:boolean}|null,refresh:vi.fn()}));
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:mocks.refresh})}));
vi.mock("@/lib/customer-session",()=>({customerFetch:mocks.fetch}));
vi.mock("./dashboard-customer",()=>({useDashboardCustomer:()=>({country:mocks.country,accountType:"PERSONAL"}),useDashboardSetup:()=>mocks.setup,useDashboardFinance:()=>({accountScope:"PERSONAL",canMutateFinances:true})}));
vi.mock("./money-route-controls",()=>({ASSET_RELEVANCE:new Map([["BTC",0],["USDC",1],["USDT",2]]),COUNTRY_CURRENCY:{IT:"EUR",NG:"NGN",US:"USD"},assetLogo:()=>null,fiatLogo:()=>null,networkRailLabel:(code:string)=>code}));

const coverage={
  fundingCurrencies:[{code:"EUR"},{code:"GBP"}],
  fiatCurrencies:[{code:"EUR"},{code:"USD"},{code:"GBP"},{code:"NGN"},{code:"CAD"}],
  transferableAssets:[{code:"USDC",networks:[{code:"ETHEREUM"},{code:"POLYGON"}]},{code:"USDT",networks:[{code:"TRON"}]},{code:"BTC",networks:[{code:"BITCOIN"}]}],
};
function response(value:unknown,ok=true){return {ok,json:async()=>value} as Response;}
function quote(amount=100,output=98,extras:Record<string,unknown>={}){
  return response({sourceAsset:"EUR",sourceAmount:amount,destinationAsset:"USDC",destinationNetwork:"ETHEREUM",destinationAmount:output,customerFee:2,expiresAt:new Date(Date.now()+30000).toISOString(),pricingMode:"INDICATIVE",...extras});
}
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>{resolve=done;});return {promise,resolve};}
const quoteCalls=()=>mocks.fetch.mock.calls.filter(([url])=>String(url).startsWith("/api/money/quotes"));
async function tick(ms=450){await act(async()=>{await vi.advanceTimersByTimeAsync(ms);});}
async function mount(){render(<RateCalculator/>);await act(async()=>{});}

beforeEach(()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date("2026-09-06T12:00:00Z"));mocks.country="IT";mocks.fetch.mockReset();mocks.setup={approved:true};mocks.refresh.mockReset();
  mocks.fetch.mockImplementation(async(url:string)=>url.endsWith("/coverage")?response(coverage):url.endsWith("/preferences")?response([]):quote());
});
afterEach(()=>{cleanup();vi.clearAllTimers();vi.useRealTimers();});

describe("rate estimate safety",()=>{
  it("does not send an unknown setup state back through compliance",async()=>{
    mocks.setup=null;
    await mount();
    expect(screen.getByText("Setup status unavailable. Refresh to continue.")).toBeInTheDocument();
    expect(screen.queryByRole("link",{name:"Complete compliance first"})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Retry setup status"}));
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });
  it("uses eligible funding currencies and exact asset networks from coverage",async()=>{
    await mount();
    expect(within(screen.getByRole("combobox",{name:"Funding currency"})).getAllByRole("option").map(option=>option.textContent)).toEqual(["EUR","GBP"]);
    expect(within(screen.getByRole("combobox",{name:"Crypto asset"})).getAllByRole("option").map(option=>option.textContent)).toEqual(["BTC","USDC","USDT"]);
    expect(within(screen.getByRole("combobox",{name:"Network"})).getAllByRole("option").map(option=>option.textContent)).toEqual(["ETHEREUM","POLYGON"]);
    await tick();
    expect(screen.getByLabelText("USDC estimated amount")).toHaveValue("98");
    expect(screen.getByLabelText("USDC estimated amount")).toHaveAttribute("readonly");
    expect(screen.getByText("Indicative estimate")).toBeInTheDocument();
    expect(screen.queryByText(/Live/)).not.toBeInTheDocument();
    expect(JSON.parse(quoteCalls()[0][1].body)).toMatchObject({sourceAsset:"EUR",destinationAsset:"USDC",destinationNetwork:"ETHEREUM"});
    fireEvent.click(screen.getByRole("button",{name:"Swap buy and sell"}));
    expect(within(screen.getByRole("combobox",{name:"Payout currency"})).queryByRole("option",{name:"CAD"})).not.toBeInTheDocument();
  });

  it("aborts superseded requests and ignores their late responses",async()=>{
    const old=deferred<Response>();
    mocks.fetch.mockImplementation((url:string,init?:RequestInit)=>url.endsWith("/coverage")?Promise.resolve(response(coverage)):url.endsWith("/preferences")?Promise.resolve(response([])):JSON.parse(String(init?.body)).sourceAmount===100?old.promise:Promise.resolve(quote(200,196)));
    await mount();await tick();
    const oldSignal=quoteCalls()[0][1].signal as AbortSignal;
    fireEvent.change(screen.getByLabelText("EUR amount"),{target:{value:"200"}});
    expect(oldSignal.aborted).toBe(true);
    expect(screen.getByLabelText("USDC estimated amount")).toHaveValue("");
    await tick();expect(screen.getByLabelText("USDC estimated amount")).toHaveValue("196");
    await act(async()=>old.resolve(quote(100,98)));
    expect(screen.getByLabelText("USDC estimated amount")).toHaveValue("196");
  });

  it("clears stale numbers immediately on invalid amounts and network changes",async()=>{
    await mount();await tick();
    fireEvent.change(screen.getByRole("combobox",{name:"Network"}),{target:{value:"POLYGON"}});
    expect(screen.getByLabelText("USDC estimated amount")).toHaveValue("");
    expect(screen.queryByText(/1 EUR ≈/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("EUR amount"),{target:{value:"1e3"}});
    await tick(1000);expect(quoteCalls()).toHaveLength(1);
    expect(screen.getByText("Enter an amount")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("EUR amount"),{target:{value:""}});
    expect(screen.getByLabelText("USDC estimated amount")).toHaveValue("");
  });

  it("does not revive a cached result when an amount is cleared and re-entered",async()=>{
    await mount();await tick();
    fireEvent.change(screen.getByLabelText("EUR amount"),{target:{value:""}});
    fireEvent.change(screen.getByLabelText("EUR amount"),{target:{value:"100"}});
    expect(screen.getByLabelText("USDC estimated amount")).toHaveValue("");
    await tick();expect(quoteCalls()).toHaveLength(2);
    expect(screen.getByLabelText("USDC estimated amount")).toHaveValue("98");
  });

  it("prices the sell direction with the selected source network and fiat fee",async()=>{
    await mount();await tick();
    mocks.fetch.mockResolvedValueOnce(quote(98,95,{sourceAsset:"USDC",destinationAsset:"EUR",destinationNetwork:null,customerFee:3}));
    fireEvent.click(screen.getByRole("button",{name:"Swap buy and sell"}));
    expect(screen.getByLabelText("EUR estimated amount")).toHaveValue("");
    await tick();
    const [path,options]=quoteCalls()[1];
    expect(path).toBe("/api/money/quotes/sell/estimate");
    expect(JSON.parse(options.body)).toEqual({sourceAsset:"USDC",sourceNetwork:"ETHEREUM",sourceAmount:98,destinationFiat:"EUR"});
    expect(screen.getByLabelText("EUR estimated amount")).toHaveValue("95");
    expect(screen.getByText("3 EUR")).toBeInTheDocument();
  });

  it("discards failed output, keeps internal error details private and can retry",async()=>{
    await mount();await tick();
    mocks.fetch.mockResolvedValueOnce(response({message:"QUIDAX upstream failed"},false));
    fireEvent.change(screen.getByLabelText("EUR amount"),{target:{value:"200"}});await tick();
    expect(screen.getByLabelText("USDC estimated amount")).toHaveValue("");
    expect(screen.getByText("An estimate is unavailable right now. Try again.")).toBeInTheDocument();
    expect(screen.queryByText(/QUIDAX/)).not.toBeInTheDocument();
    mocks.fetch.mockResolvedValueOnce(quote(200,196));
    fireEvent.click(screen.getByRole("button",{name:"Refresh estimate"}));await tick();
    expect(screen.getByLabelText("USDC estimated amount")).toHaveValue("196");
  });

  it("expires estimates and requires a fresh result before showing amounts again",async()=>{
    mocks.fetch.mockImplementation(async(url:string)=>url.endsWith("/coverage")?response(coverage):url.endsWith("/preferences")?response([]):quote(100,98,{expiresAt:new Date(Date.now()+2000).toISOString()}));
    await mount();await tick();expect(screen.getByLabelText("USDC estimated amount")).toHaveValue("98");
    await tick(2000);
    expect(screen.getByLabelText("USDC estimated amount")).toHaveValue("");
    expect(screen.getByText("Estimate expired. Refresh to see a current estimate.")).toBeInTheDocument();
    expect(quoteCalls()).toHaveLength(1);
    fireEvent.click(screen.getByRole("button",{name:"Refresh estimate"}));await tick();
    expect(screen.getByLabelText("USDC estimated amount")).toHaveValue("98");
  });

  it.each([
    {destinationAmount:-10},{sourceAmount:999},{destinationAsset:"BTC"},{destinationNetwork:"TRON"},{expiresAt:"invalid"},{expiresAt:"2020-01-01T00:00:00Z"},
  ])("rejects a malformed or mismatched estimate: %j",async extras=>{
    mocks.fetch.mockImplementation(async(url:string)=>url.endsWith("/coverage")?response(coverage):url.endsWith("/preferences")?response([]):quote(100,98,extras));
    await mount();await tick();
    expect(screen.getByLabelText("USDC estimated amount")).toHaveValue("");
    expect(screen.getByRole("button",{name:"Refresh estimate"})).toBeInTheDocument();
  });

  it("shows NGN eligibility honestly without silently selecting EUR",async()=>{
    mocks.country="NG";
    mocks.fetch.mockImplementation(async(url:string)=>url.endsWith("/coverage")?response({...coverage,fundingCurrencies:[{code:"NGN"}]}):response([{fiatCurrency:"EUR",token:"USDC",network:"BITCOIN"}]));
    await mount();await tick();
    expect(screen.getByRole("combobox",{name:"Funding currency"})).toHaveValue("NGN");
    expect(screen.getByRole("combobox",{name:"Network"})).toHaveValue("ETHEREUM");
    expect(screen.getByText("Buy estimates aren’t available for NGN yet.")).toBeInTheDocument();
    expect(quoteCalls()).toHaveLength(0);
    expect(screen.getByRole("link",{name:"Continue to buy"})).toHaveAttribute("href","/dashboard/buy");
  });

  it("offers recovery after a coverage failure without guessing supported routes",async()=>{
    mocks.fetch.mockResolvedValue(response({},false));
    await mount();await tick();
    expect(screen.getByText("Available routes could not be loaded.")).toBeInTheDocument();
    expect(quoteCalls()).toHaveLength(0);
    expect(screen.getByRole("combobox",{name:"Funding currency"})).toBeDisabled();
    mocks.fetch.mockImplementation(async(url:string)=>url.endsWith("/coverage")?response(coverage):url.endsWith("/preferences")?response([]):quote());
    fireEvent.click(screen.getByRole("button",{name:"Retry loading routes"}));await act(async()=>{});await tick();
    expect(screen.getByLabelText("USDC estimated amount")).toHaveValue("98");
  });

  it("recovers from a quote timeout and ignores a late success",async()=>{
    const hung=deferred<Response>();
    mocks.fetch.mockImplementation((url:string)=>url.endsWith("/coverage")?Promise.resolve(response(coverage)):url.endsWith("/preferences")?Promise.resolve(response([])):hung.promise);
    await mount();await tick();await tick(12000);
    expect((quoteCalls()[0][1].signal as AbortSignal).aborted).toBe(true);
    expect(screen.getByRole("button",{name:"Refresh estimate"})).toBeInTheDocument();
    await act(async()=>hung.resolve(quote()));
    expect(screen.getByLabelText("USDC estimated amount")).toHaveValue("");
  });
});
