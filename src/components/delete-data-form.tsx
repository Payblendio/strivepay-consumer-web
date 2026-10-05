"use client";

import Link from "next/link";
import { useState } from "react";
import { IconAlertCircle, IconArrowLeft, IconCheck, IconLoader2, IconMail } from "@tabler/icons-react";
import { maskEmail } from "@/lib/auth-access";
import { AccessField } from "./access-field";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const CATEGORIES = [
  { id: "PHONE_NUMBER", label: "Phone number", hint: "Removed from your profile." },
  { id: "PUSH_DEVICES", label: "Push notification devices", hint: "Removed as soon as you confirm. Sign in again to re-enable alerts." },
  { id: "SAVED_DESTINATIONS", label: "Saved bank accounts and wallet addresses", hint: "Except any used by a transaction still in progress." },
  { id: "SUPPORT_HISTORY", label: "Support conversations and attachments", hint: "Messages and files you sent to StrivePay support." },
];

function DataFacts() {
  return (
    <div className="deletion-facts">
      <div>
        <h3>How it works</h3>
        <ul>
          <li>Choose the data you want deleted and enter your sign-in email.</li>
          <li>Confirm using the link we email you. It expires in 24 hours.</li>
          <li>Your account stays open. We complete requests within 30 days and email you when done.</li>
        </ul>
      </div>
      <div>
        <h3>What we keep</h3>
        <ul>
          <li>Transaction, payment and ledger records.</li>
          <li>Identity verification and anti-money-laundering records.</li>
        </ul>
        <p>Financial regulations require us to keep these for 5 years after your account closes. To delete your whole account instead, use <Link href="/delete-account">account deletion</Link>.</p>
      </div>
    </div>
  );
}

export function DeleteDataForm() {
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const normalized = email.trim().toLowerCase();
    if (!selected.length) {
      setError("Choose at least one type of data to delete.");
      return;
    }
    if (!EMAIL.test(normalized)) {
      setError("Enter the email address you use to sign in.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/data-deletion/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized, categories: selected, note: note.trim() || null }),
      });
      if (!response.ok) {
        setError("We couldn’t start the request. Try again shortly.");
        return;
      }
      setSentTo(normalized);
    } catch {
      setError("We couldn’t reach StrivePay. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sentTo) {
    return (
      <section className="access-card access-result recovery-result" aria-labelledby="data-sent-title">
        <img className="recovery-art" src="/illustrations/recovery-envelope.png" width="144" height="144" alt="" />
        <h2 id="data-sent-title">Check your email</h2>
        <p>If this email belongs to a StrivePay account, we’ve sent a link to confirm your request. It expires in 24 hours.</p>
        <strong className="recovery-destination">{maskEmail(sentTo).replace(/•{5,}/g, "••••")}</strong>
        <div className="recovery-links">
          <button className="access-text-button" type="button" onClick={() => setSentTo("")}>Use a different email</button>
          <Link className="access-back-link" href="/"><IconArrowLeft size={18} /> Back to StrivePay</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="access-card" aria-labelledby="data-title">
      <header className="access-card-heading">
        <span>Data deletion</span>
        <h2 id="data-title">Delete some of your StrivePay data</h2>
        <p>Remove specific data from your StrivePay account without closing it.</p>
      </header>

      <DataFacts />

      {error ? (
        <div className="access-alert access-alert-error" role="alert">
          <IconAlertCircle size={20} aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}

      <form className="access-form" onSubmit={submit} noValidate>
        <fieldset className="deletion-choices">
          <legend>Data to delete</legend>
          {CATEGORIES.map((category) => (
            <label key={category.id} className={`deletion-choice${selected.includes(category.id) ? " is-selected" : ""}`}>
              <input type="checkbox" checked={selected.includes(category.id)} onChange={() => toggle(category.id)} />
              <span><strong>{category.label}</strong><small>{category.hint}</small></span>
            </label>
          ))}
        </fieldset>
        <AccessField id="data-email" label="Email address">
          <div className="access-icon-input">
            <IconMail size={20} aria-hidden="true" />
            <input id="data-email" type="email" inputMode="email" autoCapitalize="none" autoComplete="username" spellCheck={false}
              placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
        </AccessField>
        <AccessField id="data-note" label="Anything we should know? (optional)">
          <textarea id="data-note" className="deletion-reason" rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} />
        </AccessField>
        <button className="access-primary-button" type="submit" disabled={submitting}>
          {submitting ? <><IconLoader2 className="access-spinner" size={20} /> Sending link…</> : <>Email me a confirmation link</>}
        </button>
      </form>

      <div className="access-secondary-actions">
        <Link className="access-back-link" href="/login"><IconArrowLeft size={18} /> Back to sign in</Link>
      </div>
    </section>
  );
}

export function ConfirmDataDeletion({ token }: { token?: string }) {
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">(token ? "idle" : "error");
  const [error, setError] = useState(token ? "" : "This confirmation link is incomplete. Request a new one.");

  async function confirm() {
    setState("submitting");
    setError("");
    try {
      const response = await fetch("/api/auth/data-deletion/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) {
        setState("error");
        setError(response.status === 400 ? "This link is invalid, already used or expired. Request a new one." : "We couldn’t confirm your request. Try again shortly.");
        return;
      }
      setState("done");
    } catch {
      setState("error");
      setError("We couldn’t reach StrivePay. Check your connection and try again.");
    }
  }

  if (state === "done") {
    return (
      <section className="access-card access-result recovery-result" aria-labelledby="data-done-title">
        <h2 id="data-done-title">Request confirmed</h2>
        <p>Your account stays open. We’ll complete your request within 30 days and email you when it’s done.</p>
        <Link className="access-primary-button" href="/">Back to StrivePay</Link>
      </section>
    );
  }

  return (
    <section className="access-card" aria-labelledby="data-confirm-title">
      <header className="access-card-heading">
        <span>Data deletion</span>
        <h2 id="data-confirm-title">Confirm data deletion</h2>
        <p>Confirm to delete the data you selected. Your account stays open.</p>
      </header>

      {error ? (
        <div className="access-alert access-alert-error" role="alert">
          <IconAlertCircle size={20} aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}

      {token && state !== "error" ? (
        <button className="access-primary-button" type="button" onClick={confirm} disabled={state === "submitting"}>
          {state === "submitting" ? <><IconLoader2 className="access-spinner" size={20} /> Confirming…</> : <><IconCheck size={20} /> Confirm request</>}
        </button>
      ) : (
        <Link className="access-primary-button" href="/delete-data">Request a new link</Link>
      )}

      <div className="access-secondary-actions">
        <Link className="access-back-link" href="/"><IconArrowLeft size={18} /> Cancel</Link>
      </div>
    </section>
  );
}
