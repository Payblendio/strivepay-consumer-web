// @vitest-environment jsdom
import type {AnchorHTMLAttributes} from "react";
import {createElement} from "react";
import {act,cleanup,fireEvent,render,screen,waitFor,within} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {ActivityDetailPage} from "./activity-detail-page";
import type {TimelineEvent,TradeItem} from "./dashboard-route-copy";

const mocks=vi.hoisted(()=>({refresh:vi.fn(),receipt:vi.fn(),show:vi.fn()}));
vi.mock("./dashboard-customer",()=>({useDashboardFinance:()=>({accountScope:"PERSONAL"})}));
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:mocks.refresh})}));
vi.mock("next/link",()=>({default:({children,...props}:AnchorHTMLAttributes<HTMLAnchorElement>)=><a {...props}>{children}</a>}));
vi.mock("next/image",()=>({default:({src,alt}:{src:string;alt:string})=>createElement("img",{src,alt})}));
vi.mock("@/components/ui/toast",()=>({useToast:()=>({show:mocks.show})}));
vi.mock("@/lib/transaction-receipt",()=>({downloadTransactionReceipt:mocks.receipt}));
vi.mock("./currency-pair-clip",()=>({
  CurrencyPairClip:()=>null,
  tradePairAssets:(_buy:boolean,source?:string,destination?:string)=>({from:source??"",to:destination??""}),
}));

const pending:TradeItem={
  id:"activity-test-1",
  status:"PAYOUT_PENDING",
  direction:"CRYPTO_TO_FIAT",
  createdAt:"2026-09-01T10:00:00Z",
  occurredAt:"2026-09-01T10:05:00Z",
  sourceAsset:"USDC",
  sourceNetwork:"POLYGON",
  sourceAmount:"100",
  destinationAsset:"EUR",
  quotedDestinationAmount:"99",
  deliveredAmount:null,
};
const timeline:TimelineEvent[]=[{id:"event-1",toStatus:"PAYOUT_PENDING",occurredAt:"2026-09-01T10:05:00Z"}];

beforeEach(()=>{mocks.refresh.mockReset();mocks.receipt.mockReset();mocks.show.mockReset();});
afterEach(cleanup);

describe("activity detail settlement language",()=>{
  it("labels an undelivered pending quote Expected rather than Received",()=>{
    render(<ActivityDetailPage trade={pending} timeline={[]} available/>);
    const expected=screen.getByText("Expected",{selector:"dt"}).parentElement!;
    expect(within(expected).getByText("99 EUR")).toBeInTheDocument();
    expect(screen.queryByText("Received",{selector:"dt"})).not.toBeInTheDocument();
  });

  it("shows Pending instead of a zero received amount before payout",()=>{
    render(<ActivityDetailPage trade={{...pending,quotedDestinationAmount:undefined,deliveredAmount:"0"}} timeline={[]} available/>);
    const payout=screen.getByText("Payout",{selector:"dt"}).parentElement!;
    expect(within(payout).getByText("Pending")).toBeInTheDocument();
    expect(screen.queryByText("Received",{selector:"dt"})).not.toBeInTheDocument();
    expect(screen.queryByText("0 EUR")).not.toBeInTheDocument();
  });

  it("renders neutral route steps without provider codes or false delivery claims",()=>{
    const {container}=render(<ActivityDetailPage trade={{...pending,bridgeAsset:"USDT",bridgeNetwork:"ETHEREUM",legs:[{sequence:1,providerCode:"BAKKT_INTERNAL",status:"COMPLETED"},{sequence:2,providerCode:"QUIDAX_INTERNAL",status:"PENDING"}]}} timeline={[]} available/>);
    const route=within(screen.getByRole("region",{name:"Transfer route"}));
    expect(route.getByText("From",{exact:true})).toBeInTheDocument();
    expect(route.getByText("Conversion",{exact:true})).toBeInTheDocument();
    expect(route.getByText("To",{exact:true})).toBeInTheDocument();
    expect(screen.getByText("Step 1")).toBeInTheDocument();
    expect(screen.getByText("Step 2")).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/bakkt|quidax|delivered/i);
  });

  it("labels a pending occurrence Recorded, not Settled",()=>{
    render(<ActivityDetailPage trade={pending} timeline={timeline} available/>);
    expect(screen.getByText("Recorded",{selector:"dt"})).toBeInTheDocument();
    expect(screen.queryByText("Settled",{selector:"dt"})).not.toBeInTheDocument();
  });

  it("retains Received and Settled for a completed transaction with delivered funds",()=>{
    render(<ActivityDetailPage trade={{...pending,status:"COMPLETED",deliveredAmount:"98"}} timeline={[]} available/>);
    const received=screen.getByText("Received",{selector:"dt"}).parentElement!;
    expect(within(received).getByText("98 EUR")).toBeInTheDocument();
    expect(screen.getByText("Settled",{selector:"dt"})).toBeInTheDocument();
    expect(screen.queryByText("Recorded",{selector:"dt"})).not.toBeInTheDocument();
  });
});

describe("activity detail recovery",()=>{
  it("retries an unavailable transaction through the router and renders a recovered response",()=>{
    const {rerender}=render(<ActivityDetailPage trade={null} timeline={[]} available={false}/>);
    expect(screen.getByText("Transaction unavailable")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:/Try again/i}));
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    rerender(<ActivityDetailPage trade={pending} timeline={timeline} available/>);
    expect(screen.queryByText("Transaction unavailable")).not.toBeInTheDocument();
    expect(screen.getByText("Expected",{selector:"dt"})).toBeInTheDocument();
  });

  it("distinguishes a missing transaction from a service error",()=>{
    const {container}=render(<ActivityDetailPage trade={null} timeline={[]} available/>);
    expect(screen.getByText("Transaction not found")).toBeInTheDocument();
    expect(container.querySelector('img[src="/illustrations/account-not-found-3d.png"]')).not.toBeNull();
    expect(screen.queryByRole("button",{name:/Try again/i})).not.toBeInTheDocument();
    expect(screen.getByRole("link",{name:/Back to all activity/i})).toHaveAttribute("href","/dashboard/activity");
  });

  it("recovers from receipt failure and announces success only after preparation finishes",async()=>{
    let finishReceipt:()=>void=()=>{};
    const prepared=new Promise<void>(resolve=>{finishReceipt=resolve;});
    mocks.receipt.mockRejectedValueOnce(new Error("Receipt generation unavailable")).mockReturnValueOnce(prepared);
    render(<ActivityDetailPage trade={pending} timeline={timeline} available/>);
    fireEvent.click(screen.getByRole("button",{name:"Download receipt"}));
    await waitFor(()=>expect(mocks.show).toHaveBeenCalledWith(expect.objectContaining({tone:"danger",title:"Download failed"})));
    expect(screen.getByRole("button",{name:"Download receipt"})).toBeEnabled();
    expect(mocks.show).not.toHaveBeenCalledWith(expect.objectContaining({tone:"success"}));
    fireEvent.click(screen.getByRole("button",{name:"Download receipt"}));
    expect(screen.getByRole("button",{name:"Preparing…"})).toBeDisabled();
    expect(mocks.show).not.toHaveBeenCalledWith(expect.objectContaining({tone:"success"}));
    await act(async()=>{finishReceipt();});
    await waitFor(()=>expect(mocks.show).toHaveBeenCalledWith(expect.objectContaining({tone:"success",title:"Receipt ready"})));
    expect(screen.getByRole("button",{name:"Download receipt"})).toBeEnabled();
    expect(mocks.receipt).toHaveBeenCalledTimes(2);
    expect(mocks.receipt).toHaveBeenLastCalledWith(pending,timeline);
  });
});
