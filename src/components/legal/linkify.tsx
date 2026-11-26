import type { ReactNode } from "react";

const TOKEN = /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)]|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

/** Turns plain URLs and email addresses in policy text into links. Everything else stays text. */
export function linkify(text: string): ReactNode[] {
  return text.split(TOKEN).map((part, index) => {
    if (index % 2 === 0) return part;
    if (part.includes("@") && !part.startsWith("http")) return <a key={index} href={`mailto:${part}`}>{part}</a>;
    return <a key={index} href={part} target="_blank" rel="noopener noreferrer">{part}</a>;
  });
}
