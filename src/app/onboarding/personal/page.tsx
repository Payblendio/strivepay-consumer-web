import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {ComplianceWorkspace} from "@/components/compliance-workspace";
import {loginHref} from "@/lib/auth-access";
import {backend} from "@/lib/backend";

type Customer={email:string;givenName:string;familyName:string;phoneE164?:string|null;country:string;emailVerified:boolean;accountType?:string};
type OnboardingStatus={complianceStatus?:string|null};

export default async function PersonalOnboarding(){
  const token=(await cookies()).get("sp_access")?.value;
  if(!token)redirect(loginHref("/onboarding/personal"));
  const response=await backend("/v1/auth/me",{headers:{Authorization:`Bearer ${token}`}});
  if(!response.ok)redirect(loginHref("/onboarding/personal",response.status===401?"session-expired":undefined));
  const customer=await response.json() as Customer;
  if(!customer.emailVerified)redirect(`/verify-email?email=${encodeURIComponent(customer.email)}`);
  if(!customer.accountType)redirect("/onboarding/account-type");
  if(customer.accountType==="BUSINESS")redirect("/onboarding/business");
  const statusResponse=await backend("/v1/onboarding",{headers:{Authorization:`Bearer ${token}`}});
  const status=statusResponse.ok?await statusResponse.json() as OnboardingStatus:null;
  return <ComplianceWorkspace accountType="PERSONAL" initialComplianceApproved={status?.complianceStatus==="FULL_USER"} givenName={customer.givenName} familyName={customer.familyName} email={customer.email} country={customer.country} phoneE164={customer.phoneE164}/>;
}
