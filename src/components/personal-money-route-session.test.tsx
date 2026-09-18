// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {PersonalMoneyRoutes} from "./personal-money-routes";

const mocks=vi.hoisted(()=>({fetch:vi.fn(),show:vi.fn()}));
vi.mock("@/lib/customer-session",()=>({customerFetch:mocks.fetch,setCustomerFetchAccountScope:vi.fn()}));
vi.mock("@/components/ui/toast",()=>({useToast:()=>({show:mocks.show})}));
vi.mock("next/image",()=>({default:()=>null}));
vi.mock("react-circle-flags",()=>({CircleFlag:()=>null}));

const customer={givenName:"Ada",familyName:"Test",email:"ada@example.test",country:"IT"};
const preference={fiatCurrency:"EUR",token:"USDC",network:"POLYGON",routeType:"STABLECOIN",address:`0x${"1".repeat(40)}`};
const coverage={fiatCurrencies:[{code:"EUR",name:"Euro"}],fundingCurrencies:[{code:"EUR",name:"Euro"}],transferableAssets:[{code:"USDC",name:"USD Coin",type:"STABLECOIN",networks:[{code:"POLYGON",name:"Polygon"}]}]};
function json(value:unknown,status=200){return new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json"}});}

function mockSetup(errorType:string,status=409){
  mocks.fetch.mockImplementation((input:string,init:RequestInit={})=>{
    const path=input.replace("/api/onboarding","");
    if(path==="/session")return Promise.resolve(json({active:true}));
    if(path.startsWith("/coverage"))return Promise.resolve(json(coverage));
    if(path==="/money-routes/preferences")return Promise.resolve(json([preference]));
    if(path==="/money-routes/crypto-profile")return Promise.resolve(json({status:"READY"}));
    if(path==="/money-routes/funding-accounts"&&init.method==="POST")return Promise.resolve(json({type:errorType,title:"This account request needs attention"},status));
    if(path.startsWith("/money-routes/funding-accounts")||path==="/money-routes/bank-accounts"||path==="/money-routes/bank-requirements")return Promise.resolve(json([]));
    return Promise.reject(new Error(`Unexpected mocked request: ${init.method??"GET"} ${path}`));
  });
}

beforeEach(()=>{mocks.fetch.mockReset();mocks.show.mockReset();});
afterEach(cleanup);

describe("onboarding session recovery",()=>{
  it("keeps an ordinary 409 conflict on the current step and shows its error",async()=>{
    mockSetup("resource_conflict");
    render(<PersonalMoneyRoutes customer={customer} onComplete={vi.fn()}/>);
    fireEvent.click(await screen.findByRole("button",{name:"Request account"}));
    await waitFor(()=>expect(mocks.show).toHaveBeenCalledWith(expect.objectContaining({tone:"danger",message:"This account request needs attention"})));
    expect(screen.getByRole("button",{name:"Request account"})).toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"Send code"})).not.toBeInTheDocument();
  });

  it.each([
    ["verification_session_expired",409],
    ["verification_session_required",409],
    ["provider_session_required",401],
  ] as const)("recognizes the preserved %s API failure type",async(type,status)=>{
    mockSetup(type,status);
    render(<PersonalMoneyRoutes customer={customer} onComplete={vi.fn()}/>);
    fireEvent.click(await screen.findByRole("button",{name:"Request account"}));
    expect(await screen.findByRole("button",{name:"Send code"})).toBeInTheDocument();
    expect(mocks.fetch.mock.calls.some(([path])=>path==="/api/onboarding/session/start")).toBe(false);
  });
});
