import type { Metadata } from "next";
import { AccessShell } from "@/components/access-shell";
import { DeleteDataForm } from "@/components/delete-data-form";

export const metadata: Metadata = {
  title: "Delete your data",
  description: "Request deletion of some of your StrivePay data without closing your account.",
};

export default function DeleteDataPage() {
  return (
    <AccessShell
      eyebrow="Data deletion"
      title="You stay in control of your data."
      copy="Remove specific data from your StrivePay account while keeping it open. We keep only the records financial regulations require."
      panelTitle="Delete your data"
    >
      <DeleteDataForm />
    </AccessShell>
  );
}
