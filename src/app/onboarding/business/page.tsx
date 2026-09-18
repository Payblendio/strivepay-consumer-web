import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {ComplianceWorkspace} from "@/components/compliance-workspace";
import {loginHref} from "@/lib/auth-access";
import {backend} from "@/lib/backend";

type Customer={email:string;givenName:string;familyName:string;phoneE164?:string|null;country:string;emailVerified:boolean;accountType?:string;membershipRole?:string|null};

export default async function BusinessOnboarding(){
  const token=(await cookies()).get("sp_access")?.value;
  if(!token)redirect(loginHref("/onboarding/business"));
  const response=await backend("/v1/auth/me",{headers:{Authorization:`Bearer ${token}`}});
  if(!response.ok)redirect(loginHref("/onboarding/business",response.status===401?"session-expired":undefined));
  const customer=await response.json() as Customer;
  if(!customer.emailVerified)redirect(`/verify-email?email=${encodeURIComponent(customer.email)}`);
  if(!customer.accountType)redirect("/onboarding/account-type");
  if(customer.accountType==="PERSONAL")redirect("/onboarding/personal");
  return <ComplianceWorkspace accountType="BUSINESS" membershipRole={customer.membershipRole} givenName={customer.givenName} familyName={customer.familyName} email={customer.email} country={customer.country} phoneE164={customer.phoneE164}/>;
}
