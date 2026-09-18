import Image from "next/image";
import type { ReactNode } from "react";
import { Button } from "./primitives";

export type StatusArt = "success" | "failed" | "processing" | "pending" | "action" | "kyc" | "kyb" | "security";
const artwork: Record<StatusArt, string> = {
  success: "/illustrations/states/transaction-success-v2.webp",
  failed: "/illustrations/states/transaction-failed.webp",
  processing: "/illustrations/states/transaction-processing.webp",
  pending: "/illustrations/states/pending-review.webp",
  action: "/illustrations/states/action-required.webp",
  kyc: "/illustrations/states/kyc-verified.webp",
  kyb: "/illustrations/states/kyb-verified.webp",
  security: "/illustrations/states/security-verified.webp",
};

export function StatusIllustration({ status, size = 150 }: { status: StatusArt; size?: number }) {
  return <Image className="status-art" src={artwork[status]} width={size} height={size} alt="" aria-hidden="true" />;
}

export function EmptyState({ status = "pending", title, description, action, compact = false }: { status?: StatusArt; title: string; description: string; action?: { label: string; onClick: () => void }; compact?: boolean }) {
  return <div className={`sp-empty${compact ? " compact" : ""}`}><StatusIllustration status={status} size={compact ? 92 : 150} /><h3>{title}</h3><p>{description}</p>{action && <Button onClick={action.onClick}>{action.label}</Button>}</div>;
}

export function DetailList({ items }: { items: { label: string; value: ReactNode; emphasized?: boolean }[] }) {
  return <dl className="sp-details">{items.map(item => <div key={item.label}><dt>{item.label}</dt><dd className={item.emphasized ? "emphasized" : ""}>{item.value}</dd></div>)}</dl>;
}
