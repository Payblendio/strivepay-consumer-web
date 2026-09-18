import {beforeEach,describe,expect,it,vi} from "vitest";
import BuyDashboardPage from "@/app/dashboard/(shell)/buy/page";
import Dashboard from "@/app/dashboard/(shell)/page";

const mocks=vi.hoisted(()=>({read:vi.fn()}));
vi.mock("@/lib/dashboard-access",()=>({backendJson:mocks.read,requireDashboardCustomer:async()=>({token:"fixture-token"})}));
vi.mock("@/components/buy-route-page",()=>({BuyRoutePage:()=>null}));
vi.mock("@/components/dashboard-overview",()=>({DashboardOverview:()=>null}));

const trade={id:"buy-order",status:"PENDING",createdAt:"2026-09-01T10:00:00Z",direction:"FIAT_TO_CRYPTO",sourceAsset:"EUR",sourceAmount:100,destinationAsset:"USDC",quotedDestinationAmount:99};
const ok=(value:unknown)=>({ok:true,status:200,value});
const failed={ok:false,status:503,value:null,error:"http"};
beforeEach(()=>{mocks.read.mockReset().mockResolvedValue(ok([]));});

describe("dashboard history server states",()=>{
  it("does not flatten failed Buy reads into confirmed empty history",async()=>{
    mocks.read.mockResolvedValue(failed);
    const page=await BuyDashboardPage();
    expect(page.props).toMatchObject({orders:[],historyAvailable:false,historyPartial:false});
  });

  it("keeps a successful Buy source while marking missing history",async()=>{
    mocks.read.mockImplementation((_token:string,path:string)=>Promise.resolve(path==="/v1/account-activity"?failed:ok([trade])));
    const page=await BuyDashboardPage();
    expect(page.props).toMatchObject({historyAvailable:true,historyPartial:true});
    expect(page.props.orders).toHaveLength(1);
    expect(page.props.orders[0]).toMatchObject({destinationLabel:"Expected",destinationDisplay:"99 USDC"});
  });

  it("rejects malformed successful history payloads and accepts genuine empty arrays",async()=>{
    mocks.read.mockResolvedValue(ok({unexpected:"payload"}));
    expect((await BuyDashboardPage()).props.historyAvailable).toBe(false);
    expect((await Dashboard()).props.tradeDataAvailable).toBe(false);
    mocks.read.mockResolvedValue(ok([]));
    expect((await BuyDashboardPage()).props).toMatchObject({historyAvailable:true,historyPartial:false,historyLimited:false});
    expect((await Dashboard()).props).toMatchObject({tradeDataAvailable:true,partialData:false,historyLimited:false});
  });

  it("marks a full first transaction page as potentially limited in Buy and Overview",async()=>{
    const firstPage=Array.from({length:100},(_,index)=>({...trade,id:`order-${index}`}));
    mocks.read.mockImplementation((_token:string,path:string)=>Promise.resolve(ok(path==="/v1/account-activity"?[]:firstPage)));
    expect((await BuyDashboardPage()).props.historyLimited).toBe(true);
    expect((await Dashboard()).props.historyLimited).toBe(true);
  });

  it("passes the actual update-date basis through to Overview",async()=>{
    mocks.read.mockImplementation((_token:string,path:string)=>Promise.resolve(ok(path==="/v1/account-activity"?[{id:"direct",status:"PENDING",direction:"FIAT_TO_CRYPTO",updatedAt:"2026-09-06T10:00:00Z"}]:[])));
    const page=await Dashboard();
    expect(page.props.trades[0]).toMatchObject({id:"direct",createdAt:"2026-09-06T10:00:00Z",dateBasis:"updated"});
  });
});
