import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { antiBriberyPolicy } from "@/content/legal/anti-bribery-corruption-policy";

export const metadata: Metadata = {
  title: "Anti-bribery and anti-corruption policy",
  description: "StrivePay's draft policy on bribery, corruption, gifts, third parties and reporting.",
  // A draft that the Board has not adopted should not be listed by search engines.
  robots: { index: false, follow: false },
};

export default function AntiBriberyPolicyPage() {
  return <LegalDocumentView doc={antiBriberyPolicy} />;
}
