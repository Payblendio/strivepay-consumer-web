import type { Metadata } from "next";
import { AccessShell } from "@/components/access-shell";
import { LoginForm } from "@/components/login-form";
import { safeReturnTo } from "@/lib/auth-access";

export const metadata: Metadata = { title: "Sign in" };

type LoginPageProps = {
  searchParams: Promise<{ returnTo?: string | string[]; reason?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo);

  return (
    <AccessShell title="Your bank. Your crypto. Connected." copy="Move between bank money and crypto. Manage your accounts and follow every transfer in one place." panelTitle="Welcome back">
      <LoginForm returnTo={returnTo} sessionExpired={params.reason === "session-expired"} />
    </AccessShell>
  );
}
