import type { LegalDocument } from "@/content/legal/types";
import { LegalShell } from "./legal-shell";
import { linkify } from "./linkify";

export function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  return (
    <LegalShell
      current={`/${doc.slug}`}
      title={doc.title}
      subtitle={doc.subtitle}
      badge={doc.status}
      meta={doc.meta}
      notice={doc.notice}
      toc={doc.sections.map((section) => ({ id: section.id, label: section.heading }))}
    >
      <section>
        <p><strong>{doc.organisation}</strong></p>
        {doc.intro.map((paragraph, index) => <p key={index}>{linkify(paragraph)}</p>)}
      </section>
      {doc.sections.map((section) => (
        <section key={section.id} id={section.id}>
          <h2>{section.heading}</h2>
          {section.paragraphs.map((paragraph, index) => <p key={index}>{linkify(paragraph)}</p>)}
        </section>
      ))}
    </LegalShell>
  );
}
