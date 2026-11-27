// @vitest-environment jsdom
import {afterEach, describe, expect, it} from "vitest";
import {cleanup, render, screen, within} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import AmlPolicyPage from "@/app/aml-policy/page";
import AntiBriberyPolicyPage, {metadata as antiBriberyMetadata} from "@/app/anti-bribery-policy/page";
import PrivacyPolicyPage from "@/app/privacy/page";
import TermsPage from "@/app/terms/page";
import {amlPolicy} from "@/content/legal/aml-cft-cpf-policy";
import {antiBriberyPolicy} from "@/content/legal/anti-bribery-corruption-policy";
import {LEGAL_LINKS} from "@/content/legal/links";

afterEach(cleanup);

const everyWord = (value: unknown) => JSON.stringify(value).toLowerCase();

describe("published legal content", () => {
  it("keeps the whole AML/CFT/CPF policy: sixteen sections and four appendices", () => {
    const ids = amlPolicy.sections.map((section) => section.id);
    expect(ids).toEqual([
      ...Array.from({length: 16}, (_, index) => `section-${index + 1}`),
      "appendix-a", "appendix-b", "appendix-c", "appendix-d",
    ]);
    expect(amlPolicy.sections.every((section) => section.paragraphs.length > 0)).toBe(true);
    expect(amlPolicy.status.tone).toBe("approved");
    expect(amlPolicy.meta).toContainEqual({label: "Effective", value: "1 September 2026"});
  });

  it("never carries the old brand name or internal drafting notes onto the public site", () => {
    for (const document of [amlPolicy, antiBriberyPolicy]) {
      const text = everyWord(document);
      for (const banned of ["payblend", "fail open", "clause 4.1.7", "internal review checklist", "historical", "[to be completed]", ".docx"]) {
        expect(text, `${document.slug} contains "${banned}"`).not.toContain(banned);
      }
    }
  });

  it("publishes the anti-bribery policy as a draft that search engines skip", () => {
    expect(antiBriberyPolicy.status).toEqual({label: "Draft for adoption", tone: "draft"});
    expect(antiBriberyPolicy.notice).toMatch(/not yet been adopted/i);
    expect(antiBriberyPolicy.sections).toHaveLength(9);
    expect(antiBriberyMetadata.robots).toEqual({index: false, follow: false});
  });
});

describe("legal pages", () => {
  it("renders the AML policy with status, contents and a link for every section", () => {
    render(<AmlPolicyPage />);
    expect(screen.getByRole("heading", {level: 1, name: "AML, CFT and CPF Policy"})).toBeInTheDocument();
    expect(screen.getByText(/Approved · Effective 1 September 2026/)).toBeInTheDocument();
    const contents = within(screen.getByRole("navigation", {name: "Contents"}));
    expect(contents.getAllByRole("link")).toHaveLength(amlPolicy.sections.length);
    expect(contents.getByRole("link", {name: "1. Purpose scope and legal framework"})).toHaveAttribute("href", "#section-1");
    expect(contents.getByRole("link", {name: /Appendix D/})).toHaveAttribute("href", "#appendix-d");
    expect(document.getElementById("section-12")).toHaveTextContent(/Suspicious activity reporting/);
  });

  it("renders the anti-bribery policy with a visible draft notice", () => {
    render(<AntiBriberyPolicyPage />);
    expect(screen.getByRole("heading", {level: 1, name: "Anti-Bribery and Anti-Corruption Policy"})).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(/draft/i);
    expect(screen.getAllByText("Draft for adoption").length).toBeGreaterThan(0);
  });

  it("links every legal document from each page and marks the current one", () => {
    for (const [page, current] of [[<AmlPolicyPage key="a" />, "/aml-policy"], [<AntiBriberyPolicyPage key="b" />, "/anti-bribery-policy"], [<PrivacyPolicyPage key="c" />, "/privacy"], [<TermsPage key="d" />, "/terms"]] as const) {
      render(page);
      const nav = within(screen.getByRole("navigation", {name: "Legal documents"}));
      for (const link of LEGAL_LINKS) expect(nav.getByRole("link", {name: link.short})).toHaveAttribute("href", link.href);
      expect(nav.getByRole("link", {current: "page"})).toHaveAttribute("href", current);
      cleanup();
    }
  });

  it("publishes terms that match the product: buy and sell digital assets, no unsupported products", () => {
    render(<TermsPage />);
    expect(screen.getByRole("heading", {level: 1, name: "Terms and conditions"})).toBeInTheDocument();
    const contents = within(screen.getByRole("navigation", {name: "Contents"}));
    expect(contents.getAllByRole("link")).toHaveLength(18);
    for (const link of contents.getAllByRole("link")) {
      expect(document.getElementById(link.getAttribute("href")!.slice(1)), link.textContent ?? "").not.toBeNull();
    }
    const text = everyWord(document.body.textContent);
    for (const banned of ["payblend", "virtual card", "gift card", "bill payment", "saving product", "[info@"]) {
      expect(text, `terms mention "${banned}"`).not.toContain(banned);
    }
    for (const required of ["port harcourt", "60 clear days", "irreversible", "relating to a buy or sell transaction is limited to the amount of that transaction", "profile → security → delete account"]) {
      expect(text, `terms are missing "${required}"`).toContain(required);
    }
    const body = within(document.body);
    expect(body.getAllByRole("link", {name: "privacy policy"})[0]).toHaveAttribute("href", "/privacy");
    expect(body.getAllByRole("link", {name: "AML, CFT and CPF policy"})[0]).toHaveAttribute("href", "/aml-policy");
  });

  it("points customers to where account deletion lives in the app today", () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getByText(/Profile → Security → Delete account/)).toBeInTheDocument();
    expect(screen.getByRole("link", {name: "AML, CFT and CPF policy"})).toHaveAttribute("href", "/aml-policy");
    expect(screen.getByText("Last updated 26 November 2026")).toBeInTheDocument();
    expect(everyWord(document.body.textContent)).not.toContain("payblend");
  });
});
