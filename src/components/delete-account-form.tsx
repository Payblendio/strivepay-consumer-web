"use client";

import Link from "next/link";
import { useState } from "react";
import { IconAlertCircle, IconArrowLeft, IconLoader2, IconMail, IconTrash } from "@tabler/icons-react";
import { maskEmail } from "@/lib/auth-access";
import { AccessField } from "./access-field";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function DeletionFacts() {
  return (
    <div className="deletion-facts">
      <div>
        <h3>What happens</h3>
        <ul>
          <li>Your account is closed immediately and you are signed out on every device.</li>
          <li>You can no longer sign in, receive notifications or start new transactions.</li>
          <li>Transactions already in progress are completed or refunded.</li>
          <li>Your profile, contact details and saved devices are removed after review.</li>
        </ul>
      </div>
      <div>
        <h3>What we keep</h3>
        <ul>
          <li>Transaction, payment and ledger records.</li>
          <li>Identity verification and anti-money-laundering records.</li>
        </ul>
        <p>Financial regulations require us to keep these for 5 years after your account closes. They are then deleted.</p>
      </div>
    </div>
  );
}

export function DeleteAccountForm() {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const normalized = email.trim().toLowerCase();
    if (!EMAIL.test(normalized)) {
      setError("Enter the email address you use to sign in.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/account-deletion/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized, reason: reason.trim() || null }),
      });
      if (!response.ok) {
        setError("We couldn’t start the deletion request. Try again shortly.");
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
      <section className="access-card access-result recovery-result" aria-labelledby="delete-sent-title">
        <img className="recovery-art" src="/illustrations/recovery-envelope.png" width="144" height="144" alt="" />
        <h2 id="delete-sent-title">Check your email</h2>
        <p>If this email belongs to a StrivePay account, we’ve sent a link to confirm the deletion. It expires in 24 hours.</p>
        <strong className="recovery-destination">{maskEmail(sentTo).replace(/•{5,}/g, "••••")}</strong>
        <div className="recovery-links">
          <button className="access-text-button" type="button" onClick={() => setSentTo("")}>Use a different email</button>
          <Link className="access-back-link" href="/"><IconArrowLeft size={18} /> Back to StrivePay</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="access-card" aria-labelledby="delete-title">
      <header className="access-card-heading">
        <span>Account deletion</span>
        <h2 id="delete-title">Delete your StrivePay account</h2>
        <p>Enter the email you sign in with. We’ll email you a link to confirm. You can also delete your account in the StrivePay app under Profile → Delete account.</p>
      </header>

      <DeletionFacts />

      {error ? (
        <div className="access-alert access-alert-error" role="alert">
          <IconAlertCircle size={20} aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}

      <form className="access-form" onSubmit={submit} noValidate>
        <AccessField id="delete-email" label="Email address">
          <div className="access-icon-input">
            <IconMail size={20} aria-hidden="true" />
            <input id="delete-email" type="email" inputMode="email" autoCapitalize="none" autoComplete="username" spellCheck={false}
              placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
        </AccessField>
        <AccessField id="delete-reason" label="Why are you leaving? (optional)">
          <textarea id="delete-reason" className="deletion-reason" rows={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} />
        </AccessField>
        <button className="access-primary-button deletion-danger" type="submit" disabled={submitting}>
          {submitting ? <><IconLoader2 className="access-spinner" size={20} /> Sending link…</> : <><IconTrash size={20} /> Email me a deletion link</>}
        </button>
      </form>

      <div className="access-secondary-actions">
        <Link className="access-back-link" href="/login"><IconArrowLeft size={18} /> Back to sign in</Link>
      </div>
    </section>
  );
}

export function ConfirmAccountDeletion({ token }: { token?: string }) {
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">(token ? "idle" : "error");
  const [error, setError] = useState(token ? "" : "This deletion link is incomplete. Request a new one.");

  async function confirm() {
    setState("submitting");
    setError("");
    try {
      const response = await fetch("/api/auth/account-deletion/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) {
        setState("error");
        setError(response.status === 400 ? "This deletion link is invalid, already used or expired. Request a new one." : "We couldn’t close your account. Try again shortly.");
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
      <section className="access-card access-result recovery-result" aria-labelledby="delete-done-title">
        <h2 id="delete-done-title">Your account is closed</h2>
        <p>You’ve been signed out everywhere. We’ve emailed you a confirmation. Records we must keep by law are retained for 5 years, then deleted.</p>
        <Link className="access-primary-button" href="/">Back to StrivePay</Link>
      </section>
    );
  }

  return (
    <section className="access-card" aria-labelledby="delete-confirm-title">
      <header className="access-card-heading">
        <span>Account deletion</span>
        <h2 id="delete-confirm-title">Confirm account deletion</h2>
        <p>This closes your StrivePay account straight away. It can’t be undone.</p>
      </header>

      <DeletionFacts />

      {error ? (
        <div className="access-alert access-alert-error" role="alert">
          <IconAlertCircle size={20} aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}

      {token && state !== "error" ? (
        <button className="access-primary-button deletion-danger" type="button" onClick={confirm} disabled={state === "submitting"}>
          {state === "submitting" ? <><IconLoader2 className="access-spinner" size={20} /> Closing account…</> : <><IconTrash size={20} /> Delete my account</>}
        </button>
      ) : (
        <Link className="access-primary-button" href="/delete-account">Request a new link</Link>
      )}

      <div className="access-secondary-actions">
        <Link className="access-back-link" href="/"><IconArrowLeft size={18} /> Keep my account</Link>
      </div>
    </section>
  );
}
