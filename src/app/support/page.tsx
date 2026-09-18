import Link from "next/link";
import {SupportWorkspace} from "@/components/support-workspace";
import {requireSetupSupportCustomer} from "@/lib/dashboard-access";

export const metadata={title:"Setup support"};
export default async function SetupSupportPage(){
  await requireSetupSupportCustomer();
  return <main className="dashboard-canvas" style={{maxWidth:1280,margin:"0 auto",padding:24}}>
    <header style={{marginBottom:24}}><Link href="/onboarding/account-type">Back to account setup</Link><h1>Setup support</h1><p>Ask about getting started. This conversation belongs to your personal profile.</p></header>
    <SupportWorkspace scope="PERSONAL"/>
  </main>;
}
