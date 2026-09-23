import type {Metadata} from "next";
import {AccessShell} from "@/components/access-shell";
import {SsoLoginForm} from "@/components/sso-login-form";

export const metadata:Metadata={title:"Company sign-in"};

export default function CompanySsoLoginPage(){
  return (
    <AccessShell
      eyebrow="Company access"
      title="One gate for your company team."
      copy="Sign in with the identity provider your company already uses—any SAML 2.0 IdP."
      panelTitle="Sign in with your company"
    >
      <SsoLoginForm/>
    </AccessShell>
  );
}
