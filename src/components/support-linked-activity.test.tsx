// @vitest-environment jsdom
import {createElement} from "react";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {afterEach,expect,it,vi} from "vitest";
import {SupportLinkedActivity,SupportLinkedActivityPreview} from "./support-linked-activity";

vi.mock("next/image",()=>({default:({src,alt}:{src:string;alt:string})=>createElement("img",{src,alt})}));
vi.mock("./currency-pair-clip",()=>({
  CurrencyPairClip:()=>createElement("span",{"data-testid":"pair-clip"}),
  tradePairAssets:(_buy:boolean,source?:string|null,destination?:string|null)=>({from:source??"EUR",to:destination??"USDC"}),
}));

afterEach(cleanup);
const id="00000000-0000-0000-0000-000000000001";

it("renders a validated order link in a separate tab",async()=>{
  const request=vi.fn().mockResolvedValue({
    activity:{kind:"ORDER",id},
    facts:{
      direction:"FIAT_TO_CRYPTO",
      status:"PROCESS_COMPLETED",
      sourceAsset:"EUR",
      sourceAmount:"500",
      destinationAsset:"USDT",
      destinationAmount:"569.76",
      createdAt:"2026-09-07T15:08:00Z",
    },
  });
  render(<SupportLinkedActivity ticketId={id} revision={0} request={request}/>);
  expect(await screen.findByRole("link")).toHaveAttribute("href","/dashboard/activity/"+id);
  expect(screen.getByRole("link")).toHaveAttribute("target","_blank");
  expect(screen.getByTestId("pair-clip")).toBeInTheDocument();
  expect(screen.getByText("Bought")).toBeInTheDocument();
  expect(screen.getByText("500 EUR")).toBeInTheDocument();
  expect(screen.getByText("569.76 USDT")).toBeInTheDocument();
});

it("stays hidden when there is no linked activity",async()=>{
  const request=vi.fn().mockResolvedValue({activity:null,facts:null});
  const {container}=render(<SupportLinkedActivity ticketId={id} revision={0} request={request}/>);
  await vi.waitFor(()=>expect(request).toHaveBeenCalled());
  await vi.waitFor(()=>expect(container).toBeEmptyDOMElement());
});

it("stays hidden for activity without transaction facts",async()=>{
  const request=vi.fn().mockResolvedValue({activity:{kind:"RAMP",id},facts:null});
  const {container}=render(<SupportLinkedActivity ticketId={id} revision={0} request={request}/>);
  await vi.waitFor(()=>expect(request).toHaveBeenCalled());
  await vi.waitFor(()=>expect(container).toBeEmptyDOMElement());
  expect(screen.queryByText("Linked transaction")).not.toBeInTheDocument();
});

it("shows activity facts while linking a transaction",async()=>{
  const request=vi.fn().mockResolvedValue({
    activity:{kind:"RAMP",id},
    facts:{
      direction:"CRYPTO_TO_FIAT",
      status:"OUTSIDE_TRANSFER_RECEIVED",
      sourceAsset:"USDC",
      sourceAmount:"850",
      destinationAsset:"AED",
      destinationAmount:null,
      createdAt:"2026-09-08T15:08:00Z",
    },
  });
  const onRemove=vi.fn();
  render(<SupportLinkedActivityPreview activity={{kind:"RAMP",id}} request={request} onRemove={onRemove}/>);
  expect(await screen.findByTestId("pair-clip")).toBeInTheDocument();
  expect(screen.getByText("850 USDC")).toBeInTheDocument();
  expect(screen.getByText("Selling")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"Remove transaction link"}));
  expect(onRemove).toHaveBeenCalled();
});

it("stays hidden for untrusted link identifiers",async()=>{
  const request=vi.fn().mockResolvedValue({activity:{kind:"ORDER",id:"https://foreign.invalid"}});
  const {container}=render(<SupportLinkedActivity ticketId={id} revision={0} request={request}/>);
  await vi.waitFor(()=>expect(request).toHaveBeenCalled());
  await vi.waitFor(()=>expect(container).toBeEmptyDOMElement());
});
