import {Suspense} from "react";
import {SsoSettingsScreen} from "@/components/sso-settings-screen";

export default function SsoSettingsPage(){
  return <Suspense fallback={<div className="compliance-loading">Loading SSO…</div>}><SsoSettingsScreen/></Suspense>;
}
