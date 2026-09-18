import {Suspense} from "react";
import {AccessShell} from "@/components/access-shell";
import {EmailVerificationForm} from "@/components/email-verification-form";

export default async function VerifyEmail({searchParams}:{searchParams:Promise<{email?:string}>}){
  const params=await searchParams;
  return <AccessShell eyebrow="Email verification" title="Confirm once. Keep moving." copy="Verify your email to protect your account, then continue setting up bank and crypto access." panelTitle="Check your inbox"><Suspense fallback={<div className="access-card">Loading...</div>}><EmailVerificationForm verificationEmail={params.email}/></Suspense></AccessShell>;
}
