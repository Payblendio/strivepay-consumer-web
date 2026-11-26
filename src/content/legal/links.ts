/** Public legal pages. Order is the order shown in the legal navigation and the site footer. */
export const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy policy", short: "Privacy policy" },
  { href: "/aml-policy", label: "AML, CFT and CPF policy", short: "AML/CFT/CPF policy" },
  { href: "/anti-bribery-policy", label: "Anti-bribery and anti-corruption policy", short: "Anti-bribery policy" },
  { href: "/delete-account", label: "Delete your account", short: "Delete account" },
] as const;

export type LegalHref = (typeof LEGAL_LINKS)[number]["href"];
