import type { Metadata } from "next";
import { AccessShell } from "@/components/access-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { safeReturnTo } from "@/lib/auth-access";

export const metadata: Metadata = { title: "Reset your password" };

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string | string[]; returnTo?: string | string[] }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  return (
    <AccessShell
      eyebrow="Secure reset"
      title="Restore access with confidence."
      copy="Use the code sent to your email, set a new password and return to your account."
      panelTitle="Set a new password"
    >
      <ResetPasswordForm initialToken={token} returnTo={safeReturnTo(params.returnTo)} />
    </AccessShell>
  );
}
