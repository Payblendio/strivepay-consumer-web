import type { Metadata } from "next";
import { AccessShell } from "@/components/access-shell";
import { DeleteAccountForm } from "@/components/delete-account-form";

export const metadata: Metadata = {
  title: "Delete your account",
  description: "Request deletion of your StrivePay account and see which data is deleted and which is kept.",
};

export default function DeleteAccountPage() {
  return (
    <AccessShell
      eyebrow="Account deletion"
      title="You stay in control of your data."
      copy="Close your StrivePay account at any time. We delete your personal data and keep only the records financial regulations require."
      panelTitle="Delete your account"
    >
      <DeleteAccountForm />
    </AccessShell>
  );
}
