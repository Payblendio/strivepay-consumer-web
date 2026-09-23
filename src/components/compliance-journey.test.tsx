// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {act,cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {ComplianceJourney} from "./compliance-journey";

const {customerFetch,show}=vi.hoisted(()=>({customerFetch:vi.fn(),show:vi.fn()}));
vi.mock("@/lib/customer-session",()=>({customerFetch}));
vi.mock("@/components/ui/toast",()=>({useToast:()=>({show})}));
vi.mock("@/components/sumsub-verification",()=>({SumsubVerification:()=>null}));
vi.mock("@/components/personal-money-routes",()=>({PersonalMoneyRoutes:()=>null}));
vi.mock("@/components/ui/date-of-birth-picker",()=>({DateOfBirthPicker:()=>null}));
vi.mock("@/components/ui/international-phone-field",()=>({InternationalPhoneField:()=>null}));
vi.mock("@/components/ui/status-state",()=>({StatusIllustration:()=>null}));

const customer={givenName:"Test",familyName:"Customer",email:"test@example.test",country:"IT",phoneE164:"+393518476295"};
const profile={firstName:"Test",lastName:"Customer",email:customer.email,country:"IT",dateOfBirth:"1990-01-01",phone:customer.phoneE164,address:{addressLine1:"1 Test Street",addressLine2:"",postCode:"00100",city:"Rome"},mailingSame:true,sourceOfFunds:"SALARY",annualIncomeRange:"UNDER_25K",investmentObjective:"BALANCED"};
const documents=["TERMS_AND_CONDITIONS","PRIVACY_POLICY","TERMS_OF_SERVICE"].map((type,index)=>({id:`document-${index}`,type,version:"1",url:`https://example.test/legal/${index}`}));
const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
let accountType:"PERSONAL"|"BUSINESS";
let legalReply:()=>Promise<Response>;

beforeEach(()=>{
  vi.clearAllMocks();
  accountType="PERSONAL";
  legalReply=()=>Promise.resolve(response(documents));
  customerFetch.mockImplementation((input:string,init:RequestInit={})=>{
    const path=input.replace("/api/onboarding","");
    if(path==="/legal-documents")return legalReply();
    if(path==="/local-profile")return Promise.resolve(response(profile));
    if(path==="/coverage")return Promise.resolve(response({countries:[{code:"IT",individualSupported:true}]}));
    if(path==="/session")return Promise.resolve(response({active:true}));
    if(path==="/postcode/IT")return Promise.resolve(response({country:"IT",regex:"[0-9]{5}"}));
    if(path==="")return Promise.resolve(accountType==="BUSINESS"?response({complianceStatus:"FULL_USER",onboardingStatus:"ACTIVE"}):response({title:"Not started"},400));
    if(path==="/business/profile")return Promise.resolve(response({legalName:"Test Company",registrationNumber:"TEST-123"}));
    if(path==="/business/status")return Promise.resolve(response({onboardingStatus:"NEW",complianceStatus:"NOT_STARTED"}));
    if(path==="/legal-acceptances"||path==="/business/legal-acceptances")return Promise.resolve(response({accepted:true}));
    if(path==="/profile"&&init.method==="POST")return Promise.resolve(response({onboardingStatus:"CREATED",complianceStatus:"PENDING_KYC_DATA"}));
    if(path==="/business"&&init.method==="POST")return Promise.resolve(response({onboardingStatus:"CREATED",complianceStatus:"KYB_PENDING",verification:{verificationUrl:"https://example.test/verification"}}));
    throw new Error(`Unexpected mocked request: ${init.method??"GET"} ${path}`);
  });
});
afterEach(cleanup);

it("blocks unsupported address letters before saving the onboarding draft",async()=>{
  render(<ComplianceJourney {...customer} accountType="PERSONAL"/>);
  fireEvent.click(await screen.findByRole("button",{name:"Save and continue"}));
  fireEvent.change(await screen.findByLabelText("Address line 1"),{target:{value:"Lindenstraße 38"}});
  customerFetch.mockClear();
  fireEvent.click(screen.getByRole("button",{name:"Save address"}));
  expect(show).toHaveBeenCalledWith(expect.objectContaining({tone:"danger",message:expect.stringContaining("Use ss for ß")}));
  expect(customerFetch).not.toHaveBeenCalled();
  expect(screen.getByRole("heading",{name:"Home address"})).toBeInTheDocument();
});

async function reachAgreements(kind:"PERSONAL"|"BUSINESS"){
  accountType=kind;
  render(<ComplianceJourney {...customer} accountType={kind}/>);
  if(kind==="PERSONAL"){
    fireEvent.click(await screen.findByRole("button",{name:"Save and continue"}));
    fireEvent.click(await screen.findByRole("button",{name:"Save address"}));
    fireEvent.click(await screen.findByRole("button",{name:"Continue"}));
  }else{
    fireEvent.change(await screen.findByLabelText("Business type"),{target:{value:"LIMITED_LIABILITY"}});
    fireEvent.change(screen.getByLabelText("Registered address"),{target:{value:"1 Test Street"}});
    fireEvent.change(screen.getByLabelText("City"),{target:{value:"Rome"}});
    fireEvent.change(screen.getByLabelText(/^Postcode/),{target:{value:"00100"}});
    fireEvent.click(screen.getByRole("button",{name:"Continue"}));
  }
  await screen.findByRole("heading",{name:"Agreements"});
}

const verificationWrites=()=>customerFetch.mock.calls.filter(([input,init])=>init?.method==="POST"&&["/api/onboarding/profile","/api/onboarding/business","/api/onboarding/legal-acceptances","/api/onboarding/business/legal-acceptances"].includes(input));

describe.each(["PERSONAL","BUSINESS"] as const)("%s agreement loading safety",kind=>{
  it("blocks failure and pending retry, then retains the consent check before mocked creation",async()=>{
    legalReply=()=>Promise.resolve(response({title:"Unavailable"},503));
    await reachAgreements(kind);
    expect(screen.getByRole("status")).toHaveTextContent("Agreements could not be loaded. Please retry.");
    const blocked=screen.getByRole("button",{name:"Continue to verification"});
    expect(blocked).toBeDisabled();
    fireEvent.click(blocked);
    expect(verificationWrites()).toHaveLength(0);
    expect(screen.queryByText(/No separate agreement acceptance is required/)).not.toBeInTheDocument();
    let resolve!: (value:Response)=>void;
    legalReply=()=>new Promise<Response>(complete=>{resolve=complete;});
    fireEvent.click(screen.getByRole("button",{name:"Retry agreements"}));
    expect(screen.getByRole("status")).toHaveTextContent("Loading agreements…");
    expect(blocked).toBeDisabled();
    await act(async()=>{resolve(response(documents));});
    const create=screen.getByRole("button",{name:kind==="PERSONAL"?"Create profile":"Create company profile"});
    fireEvent.click(create);
    expect(verificationWrites()).toHaveLength(0);
    expect(show).toHaveBeenCalledWith(expect.objectContaining({tone:"danger",message:expect.stringMatching(/Accept/)}));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(create);
    await waitFor(()=>expect(verificationWrites()).toHaveLength(2));
    expect(verificationWrites()[0][0]).toContain("legal-acceptances");
  });

  it("preserves a successful empty-list configuration without claiming agreements are not required",async()=>{
    legalReply=()=>Promise.resolve(response([]));
    await reachAgreements(kind);
    expect(screen.getByText("No agreements were returned for this step.")).toBeInTheDocument();
    const next=screen.getByRole("button",{name:"Continue to verification"});
    expect(next).toBeEnabled();
    fireEvent.click(next);
    await waitFor(()=>expect(verificationWrites()).toHaveLength(1));
    expect(verificationWrites()[0][0]).not.toContain("legal-acceptances");
  });

  it("blocks an incomplete agreement set",async()=>{
    legalReply=()=>Promise.resolve(response(documents.slice(0,2)));
    await reachAgreements(kind);
    expect(screen.getByRole("status")).toHaveTextContent("The full agreement set is not available yet.");
    expect(screen.getByRole("button",{name:kind==="PERSONAL"?"Create profile":"Create company profile"})).toBeDisabled();
    expect(screen.getByRole("button",{name:"Retry agreements"})).toBeEnabled();
    expect(verificationWrites()).toHaveLength(0);
  });

  it("treats a malformed successful response as unavailable, not optional",async()=>{
    legalReply=()=>Promise.resolve(response(null));
    await reachAgreements(kind);
    expect(screen.getByRole("status")).toHaveTextContent("Agreements could not be loaded.");
    expect(screen.getByRole("button",{name:"Continue to verification"})).toBeDisabled();
    expect(verificationWrites()).toHaveLength(0);
  });
});

describe("business member identity copy",()=>{
  it("skips company record and opens member identity check",async()=>{
    accountType="BUSINESS";
    customerFetch.mockImplementation((input:string)=>{
      const path=input.replace("/api/onboarding","");
      if(path==="/legal-documents")return Promise.resolve(response(documents));
      if(path==="/local-profile")return Promise.resolve(response(profile));
      if(path==="/coverage")return Promise.resolve(response({countries:[{code:"IT",individualSupported:true}]}));
      if(path==="/session")return Promise.resolve(response({active:true}));
      if(path==="/postcode/IT")return Promise.resolve(response({country:"IT",regex:"[0-9]{5}"}));
      if(path==="")return Promise.resolve(response({title:"Not started"},400));
      throw new Error(`Unexpected mocked request: ${path}`);
    });
    render(<ComplianceJourney {...customer} accountType="BUSINESS" membershipRole="ADMINISTRATOR"/>);
    expect(await screen.findByText("YOUR CHECK")).toBeInTheDocument();
    expect(screen.getByRole("heading",{name:"Your profile"})).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 6/i)).toBeInTheDocument();
    expect(screen.queryByText(/OWNER FIRST/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Legal company name")).not.toBeInTheDocument();
  });
});
