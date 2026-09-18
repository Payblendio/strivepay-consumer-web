// @vitest-environment jsdom
import {createElement} from "react";
import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,within} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {DashboardOverview,tradeChartData,type DashboardTrade} from "./dashboard-overview";

const {refresh}=vi.hoisted(()=>({refresh:vi.fn()}));
vi.mock("next/navigation",()=>({useRouter:()=>({refresh})}));
vi.mock("next/image",()=>({default:({src,alt}:{src:string;alt:string})=>createElement("img",{src,alt})}));
vi.mock("./dashboard-customer",()=>({useDashboardCustomer:()=>({givenName:"Test",accountType:"PERSONAL"}),useDashboardSetup:()=>({approved:true,routesReady:true}),useDashboardFinance:()=>({accountScope:"PERSONAL",canMutateFinances:true})}));
vi.mock("./money-route-controls",()=>({assetLogo:()=>null,fiatLogo:()=>null}));
vi.mock("./currency-pair-clip",()=>({CurrencyPairClip:()=>null,tradePairAssets:()=>({})}));
vi.mock("./rate-calculator",()=>({RateCalculator:()=>null}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
const base:DashboardTrade={id:"t",status:"PROCESSING",createdAt:"2026-09-06T12:00:00Z",direction:"FIAT_TO_CRYPTO",sourceAsset:"EUR",sourceAmount:100,destinationAsset:"USDC"};
describe("dashboard overview",()=>{
  it("discloses limited history and update-date buckets without claiming a first transaction",()=>{
    render(<DashboardOverview trades={[{...base,createdAt:"2020-01-01",dateBasis:"updated"}]} tradeDataAvailable historyLimited/>);
    expect(screen.getByRole("status")).toHaveTextContent("Only recent history is loaded");
    expect(screen.getByText(/Some routes provide only their latest update date/)).toBeInTheDocument();
    expect(screen.getByText("No routes in loaded history")).toBeInTheDocument();
    expect(screen.queryByText("Your first buy or sell will appear here.")).not.toBeInTheDocument();
    expect(screen.getByRole("img",{name:/Counts may be incomplete/})).toHaveAttribute("aria-label",expect.stringContaining("latest update date"));
    expect(screen.getByText(/^Updated ·/)).toBeInTheDocument();
  });
  it("counts only the fourteen UTC days shown and excludes invalid, old and future rows",()=>{
    const chart=tradeChartData([base,{...base,id:"old",createdAt:"2026-08-23T23:59:59Z"},{...base,id:"bad",createdAt:"broken"},{...base,id:"future",createdAt:"2026-09-07"},{...base,id:"sell",direction:"CRYPTO_TO_FIAT",createdAt:"2026-08-24T00:00:00Z"}],new Date("2026-09-06T13:00:00Z"));
    expect(chart.days).toHaveLength(14);
    expect(chart).toMatchObject({buyCount:1,sellCount:1,periodCount:2});
    expect(chart.days[0].sell).toBe(1);
    expect(chart.days[13].buy).toBe(1);
    expect(chart.maximum%4).toBe(0);
  });
  it("offers refresh on failure without presenting zero counts as confirmed",()=>{
    render(<DashboardOverview trades={[]} tradeDataAvailable={false}/>);
    expect(screen.getByText("History unavailable")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button",{name:"Refresh history"}));
    expect(refresh).toHaveBeenCalledOnce();
  });
  it("lets users pause decorative motion and distinguishes expected amounts",()=>{
    render(<DashboardOverview trades={[{...base,quotedDestinationAmount:110}]} tradeDataAvailable partialData/>);
    fireEvent.click(screen.getByRole("button",{name:"Pause asset list"}));
    expect(screen.getByRole("button",{name:"Resume asset list"})).toHaveAttribute("aria-pressed","true");
    const transactions=within(screen.getByRole("region",{name:"Transactions"}));
    expect(transactions.getByText("Expected")).toBeInTheDocument();
    expect(transactions.queryByText("Received")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("may be incomplete");
  });
});
