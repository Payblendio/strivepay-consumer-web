import type { Metadata } from "next";
import { AccessShell } from "@/components/access-shell";
import { RegisterForm } from "@/components/register-form";
import { safeReturnTo } from "@/lib/auth-access";

export const metadata: Metadata = { title: "Create account" };

type RegisterPageProps = {
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;

  return (
    <AccessShell
      contentClassName="access-main-register"
      title="Money in. Crypto out. And back again."
      copy="Buy crypto from your bank account. Sell it back to your verified bank account. Track every transaction from start to finish."
      panelTitle="Create your account"
    >
      <RegisterForm returnTo={safeReturnTo(params.returnTo)} />
    </AccessShell>
  );
}
