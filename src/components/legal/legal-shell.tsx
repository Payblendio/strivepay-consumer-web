import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL_LINKS } from "@/content/legal/links";
import "./legal.css";

export type LegalTocItem = { id: string; label: string };

type LegalShellProps = {
  /** Path of the page being shown, used to mark it in the legal navigation. */
  current: string;
  title: string;
  subtitle?: string;
  updated?: string;
  badge?: { label: string; tone: "approved" | "draft" };
  meta?: { label: string; value: string }[];
  notice?: string;
  toc: LegalTocItem[];
  children: ReactNode;
};

export function LegalShell({ current, title, subtitle, updated, badge, meta, notice, toc, children }: LegalShellProps) {
  return (
    <main className="legal-page">
      <article className="legal-article">
        <header>
          <Link className="legal-brand" href="/">StrivePay</Link>
          <nav className="legal-nav" aria-label="Legal documents">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href} aria-current={link.href === current ? "page" : undefined}>
                {link.short}
              </Link>
            ))}
          </nav>
          <h1>{title}</h1>
          {subtitle ? <p className="legal-subtitle">{subtitle}</p> : null}
          {badge ? <p className="legal-badge-row"><span className={`legal-badge legal-badge-${badge.tone}`}>{badge.label}</span></p> : null}
          {updated ? <p className="legal-updated">Last updated {updated}</p> : null}
          {meta && meta.length > 0 ? (
            <dl className="legal-meta">
              {meta.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </header>

        {notice ? <aside className="legal-notice" role="note">{notice}</aside> : null}

        <nav className="legal-toc" aria-label="Contents">
          <p className="legal-toc-title">Contents</p>
          <ul>
            {toc.map((item) => (
              <li key={item.id}><a href={`#${item.id}`}>{item.label}</a></li>
            ))}
          </ul>
        </nav>

        {children}

        <footer className="legal-foot">
          <Link href="/">Back to StrivePay</Link>
        </footer>
      </article>
    </main>
  );
}
