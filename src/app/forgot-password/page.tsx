import type { Metadata } from "next";
import { AccessShell } from "@/components/access-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { safeReturnTo } from "@/lib/auth-access";

export const metadata: Metadata = { title: "Recover your account" };

type ForgotPasswordPageProps = {
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;

  return (
    <AccessShell
      eyebrow="Account recovery"
      title="A clear route back to your account."
      copy="Request a short-lived security code without exposing whether an email is registered."
      panelTitle="Forgot your password?"
    >
      <ForgotPasswordForm returnTo={safeReturnTo(params.returnTo)} />
    </AccessShell>
  );
}
