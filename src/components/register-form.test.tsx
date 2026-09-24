// @vitest-environment jsdom
import type {ReactNode} from "react";
import {cleanup,fireEvent,render,screen,waitFor,within} from "@testing-library/react";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
import "@testing-library/jest-dom/vitest";
import {RegisterForm} from "./register-form";

const replace=vi.fn();
vi.mock("next/navigation",()=>({useRouter:()=>({replace,push:vi.fn(),refresh:vi.fn()})}));
vi.mock("next/image",()=>({default:({alt}:{alt:string})=><span data-alt={alt}/>}));
vi.mock("./ui/modal",()=>({Modal:({open,title,children}:{open:boolean;title:string;children:ReactNode})=>open?<div role="dialog" aria-label={title}>{children}</div>:null}));

const jurisdictions=[
  {code:"FR",name:"France",individualSupported:true,corporateSupported:true},
  {code:"GH",name:"Ghana",individualSupported:false,corporateSupported:false},
  {code:"JP",name:"Japan",individualSupported:true,corporateSupported:false},
  {code:"NG",name:"Nigeria",individualSupported:true,corporateSupported:true},
];
const fetchMock=vi.fn(async(url:string,init?:RequestInit)=>{
  void init;
  if(url==="/api/jurisdictions")return new Response(JSON.stringify(jurisdictions),{status:200});
  return new Response(JSON.stringify({verificationRequired:true,emailVerified:false,verificationChallengeId:"challenge"}),{status:201});
});
beforeEach(()=>{fetchMock.mockClear();replace.mockClear();vi.stubGlobal("fetch",fetchMock);});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});

it("asks for the account type first and limits every country list to Bakkt-supported jurisdictions",async()=>{
  render(<RegisterForm returnTo="/dashboard"/>);
  expect(screen.getByRole("heading",{name:"How will you use StrivePay?"})).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:/Business account/}));

  expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Legal company name"),{target:{value:"Ada Ventures Ltd"}});
  fireEvent.change(screen.getByLabelText("Company registration number"),{target:{value:"RC-1024"}});
  await waitFor(()=>expect(fetchMock).toHaveBeenCalledWith("/api/jurisdictions",expect.anything()));
  fireEvent.click(screen.getByRole("button",{name:/Choose where the company is registered/}));
  const companyCountries=screen.getByRole("dialog",{name:"Choose your country"});
  await waitFor(()=>expect(within(companyCountries).getByText("France")).toBeInTheDocument());
  expect(within(companyCountries).queryByText("Japan")).not.toBeInTheDocument();
  expect(within(companyCountries).queryByText("Ghana")).not.toBeInTheDocument();
  fireEvent.click(within(companyCountries).getByText("France"));
  fireEvent.click(screen.getByRole("button",{name:/Continue/}));

  await screen.findByText("Step 3 of 3");
  fireEvent.change(screen.getByLabelText("First name"),{target:{value:"Ada"}});
  fireEvent.change(screen.getByLabelText("Last name"),{target:{value:"Okafor"}});
  fireEvent.change(screen.getByLabelText("Work email address"),{target:{value:"Ada@Example.com"}});
  fireEvent.click(screen.getByRole("button",{name:"Country of residence"}));
  const residences=screen.getByRole("dialog",{name:"Country of residence"});
  expect(within(residences).getByText("Japan")).toBeInTheDocument();
  expect(within(residences).queryByText("Ghana")).not.toBeInTheDocument();
  expect(within(residences).queryByText("Afghanistan")).not.toBeInTheDocument();
  fireEvent.click(within(residences).getByText("Nigeria"));
  fireEvent.change(screen.getByLabelText("Phone number"),{target:{value:"+2348031234567"}});
  fireEvent.change(screen.getByLabelText("Password"),{target:{value:"StrongPassword1"}});
  fireEvent.click(screen.getByRole("button",{name:/Create account/}));

  await waitFor(()=>expect(fetchMock).toHaveBeenCalledWith("/api/auth/register",expect.anything()));
  const call=fetchMock.mock.calls.find(([url])=>url==="/api/auth/register")!;
  expect(JSON.parse(String(call[1]?.body))).toMatchObject({
    email:"ada@example.com",country:"NG",accountType:"BUSINESS",
    business:{legalName:"Ada Ventures Ltd",registrationNumber:"RC-1024",country:"FR"},
  });
  expect(replace).toHaveBeenCalledWith("/verify-email?email=ada%40example.com");
});

it("sends personal registrations without company details",async()=>{
  render(<RegisterForm returnTo="/dashboard"/>);
  fireEvent.click(screen.getByRole("button",{name:/Personal account/}));
  expect(screen.getByText("Step 2 of 2")).toBeInTheDocument();
  expect(screen.queryByLabelText("Legal company name")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:/Back/}));
  expect(screen.getByRole("heading",{name:"How will you use StrivePay?"})).toBeInTheDocument();
});
