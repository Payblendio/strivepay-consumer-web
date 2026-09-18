"use client";

import {useRouter} from "next/navigation";
import {SettingsRow,accountIcons} from "@/components/account-page";
import {useDashboardCustomer,useDashboardFinance} from "@/components/dashboard-customer";
import {hasBusinessMembershipHint,writeBrowserAccountScope,type AccountScope} from "@/lib/account-scope";

export function SettingsScreen(){
  const router=useRouter();
  const customer=useDashboardCustomer();
  const {accountScope}=useDashboardFinance();
  const business=customer.accountType==="BUSINESS"||hasBusinessMembershipHint(customer);

  async function openScopedSetup(scope:AccountScope,href:string){
    await fetch("/api/account-scope",{
      method:"POST",
      headers:{"Content-Type":"application/json",Accept:"application/json"},
      credentials:"same-origin",
      body:JSON.stringify({scope}),
    }).catch(()=>null);
    writeBrowserAccountScope(scope);
    router.push(href);
    router.refresh();
  }

  return <section className="dashboard-canvas dashboard-route-page buy-workspace account-workspace" aria-labelledby="settings-page-title">
    <header className="buy-toolbar">
      <p id="settings-page-title">Manage your profile, security, and setup.</p>
    </header>
    <section className="buy-soft-section" aria-labelledby="settings-links-title">
      <header className="buy-soft-head">
        <div>
          <span className="overview-kicker">Account</span>
          <h2 id="settings-links-title">Settings</h2>
          <p>{business?"Company profile, team access, security, and onboarding.":"Profile, security, and onboarding shortcuts."}</p>
        </div>
      </header>
      <div className="account-settings-list" role="list">
        <SettingsRow href="/dashboard/profile" icon={accountIcons.profile} title="Profile" detail={customer.organizationLegalName||customer.email}/>
        {business?<SettingsRow href="/dashboard/settings/team" icon={accountIcons.team} title="Team" detail="Invite members and manage roles"/>:null}
        <SettingsRow href="/dashboard/settings/security" icon={accountIcons.security} title="Security" detail="Password, authenticator, and devices"/>
        {hasBusinessMembershipHint(customer)?<>
          <SettingsRow href="/onboarding/personal" icon={accountIcons.setup} title="Personal setup" detail="Your identity check and personal money routes" onNavigate={()=>openScopedSetup("PERSONAL","/onboarding/personal")}/>
          <SettingsRow href="/onboarding/business" icon={accountIcons.setup} title="Company money routes" detail="View or update company pay-in, payout, and crypto routes" onNavigate={()=>openScopedSetup("BUSINESS","/onboarding/business")}/>
        </>:
          <SettingsRow href={accountScope==="BUSINESS"?"/onboarding/business":"/onboarding/personal"} icon={accountIcons.setup} title="Account setup" detail="Compliance, pay-in, and payout"/>
        }
      </div>
    </section>
  </section>;
}
