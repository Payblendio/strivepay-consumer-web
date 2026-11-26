export type LegalSection = {
  id: string;
  heading: string;
  paragraphs: string[];
};

export type LegalDocument = {
  slug: string;
  title: string;
  subtitle: string;
  organisation: string;
  status: { label: string; tone: "approved" | "draft" };
  meta: { label: string; value: string }[];
  notice?: string;
  intro: string[];
  sections: LegalSection[];
};
