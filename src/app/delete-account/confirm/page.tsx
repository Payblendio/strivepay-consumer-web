import type { Metadata } from "next";
import { AccessShell } from "@/components/access-shell";
import { ConfirmAccountDeletion } from "@/components/delete-account-form";

export const metadata: Metadata = { title: "Confirm account deletion", robots: { index: false } };

type ConfirmPageProps = { searchParams: Promise<{ token?: string | string[] }> };

export default async function ConfirmAccountDeletionPage({ searchParams }: ConfirmPageProps) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  return (
    <AccessShell
      eyebrow="Account deletion"
      title="You stay in control of your data."
      copy="Confirm to close your StrivePay account. We delete your personal data and keep only the records financial regulations require."
      panelTitle="Confirm deletion"
    >
      <ConfirmAccountDeletion token={token} />
    </AccessShell>
  );
}
