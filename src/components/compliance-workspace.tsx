"use client";

import Image from "next/image";
import Link from "next/link";
import {IconX} from "@tabler/icons-react";
import {useState} from "react";
import {ComplianceJourney} from "@/components/compliance-journey";

type ComplianceWorkspaceProps={
  accountType:"PERSONAL"|"BUSINESS";
  givenName:string;
  familyName:string;
  email:string;
  country:string;
  phoneE164?:string|null;
  membershipRole?:string|null;
  initialComplianceApproved?:boolean;
};

export function ComplianceWorkspace({accountType,givenName,familyName,email,country,phoneE164,membershipRole,initialComplianceApproved=false}:ComplianceWorkspaceProps){
  const [profile,setProfile]=useState<{givenName:string;familyName:string;email:string;country:string;phoneE164?:string|null}>({givenName,familyName,email,country,phoneE164});

  return <main className="compliance-workspace">
    <div className="compliance-workspace-grid" aria-hidden="true"/>
    <header className="compliance-topbar">
      <Link className="compliance-brand" href="/" aria-label="StrivePay home">
        <Image src="/branding/strivepay-logo-dark.svg" alt="StrivePay" width={1937} height={621} priority/>
      </Link>
      <div className="compliance-topbar-label"><span>Account setup</span><b>Setup desk</b></div>
      <div className="compliance-topbar-actions">
        <div className="compliance-account">
          <div><strong>{profile.givenName} {profile.familyName}</strong><small>{profile.email}</small></div>
        </div>
        <Link className="compliance-close" href="/dashboard" aria-label="Close account setup and return to dashboard">
          <IconX size={22}/>
        </Link>
      </div>
    </header>

    <section className="compliance-stage" aria-labelledby="compliance-title"><ComplianceJourney accountType={accountType} membershipRole={membershipRole} initialComplianceApproved={initialComplianceApproved} givenName={profile.givenName} familyName={profile.familyName} email={profile.email} country={profile.country} phoneE164={profile.phoneE164} onProfileSaved={setProfile}/></section>
  </main>;
}
