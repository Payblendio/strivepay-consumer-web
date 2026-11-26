import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { amlPolicy } from "@/content/legal/aml-cft-cpf-policy";

export const metadata: Metadata = {
  title: "AML, CFT and CPF policy",
  description: "How StrivePay prevents money laundering, terrorist financing and proliferation financing.",
};

export default function AmlPolicyPage() {
  return <LegalDocumentView doc={amlPolicy} />;
}
