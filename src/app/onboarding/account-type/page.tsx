import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {AccessShell} from "@/components/access-shell";
import {AccountTypeChoice} from "@/components/account-type-choice";
import {loginHref} from "@/lib/auth-access";
import {backend} from "@/lib/backend";

type Customer={email:string;emailVerified:boolean;accountType?:string};
export default async function AccountTypePage(){
  const token=(await cookies()).get("sp_access")?.value;
  if(!token)redirect(loginHref("/onboarding/account-type"));
  const response=await backend("/v1/auth/me",{headers:{Authorization:`Bearer ${token}`}});
  if(!response.ok)redirect(loginHref("/onboarding/account-type",response.status===401?"session-expired":undefined));
  const customer=await response.json() as Customer;
  if(!customer.emailVerified)redirect(`/verify-email?email=${encodeURIComponent(customer.email)}`);
  if(customer.accountType==="PERSONAL")redirect("/onboarding/personal");
  if(customer.accountType==="BUSINESS")redirect("/onboarding/business");
  return <AccessShell eyebrow="Account setup" title="Choose your account. Keep money moving." copy="Start personally or set up StrivePay for your business." panelTitle="Choose your account"><AccountTypeChoice/></AccessShell>;
}
