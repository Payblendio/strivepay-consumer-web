import type { Metadata } from "next";
import { AccessShell } from "@/components/access-shell";
import { ConfirmDataDeletion } from "@/components/delete-data-form";

export const metadata: Metadata = { title: "Confirm data deletion", robots: { index: false } };

type ConfirmPageProps = { searchParams: Promise<{ token?: string | string[] }> };

export default async function ConfirmDataDeletionPage({ searchParams }: ConfirmPageProps) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  return (
    <AccessShell
      eyebrow="Data deletion"
      title="You stay in control of your data."
      copy="Confirm to delete the data you selected. Your StrivePay account stays open."
      panelTitle="Confirm data deletion"
    >
      <ConfirmDataDeletion token={token} />
    </AccessShell>
  );
}
