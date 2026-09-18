"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconArrowRight,
  IconLoader2,
  IconMail,
} from "@tabler/icons-react";
import { z } from "zod";
import { forgotPasswordSchema, maskEmail } from "@/lib/auth-access";
import { AccessField } from "./access-field";

type ForgotValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm({ returnTo }: { returnTo: string }) {
  const [sentTo, setSentTo] = useState("");
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const loginHref = returnTo === "/dashboard"
    ? "/login"
    : `/login?returnTo=${encodeURIComponent(returnTo)}`;
  const resetHref = returnTo === "/dashboard"
    ? "/reset-password"
    : `/reset-password?returnTo=${encodeURIComponent(returnTo)}`;

  async function submit(values: ForgotValues) {
    setServerError("");
    const email = values.email.trim().toLowerCase();
    try {
      const response = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        setServerError(response.status === 429
          ? "Too many requests. Wait a few minutes before trying again."
          : "We couldn’t start password recovery. Try again shortly.");
        return;
      }
      setSentTo(email);
    } catch {
      setServerError("We couldn’t reach StrivePay. Check your connection and try again.");
    }
  }

  if (sentTo) {
    return (
      <section className="access-card access-result recovery-result" aria-labelledby="forgot-success-title">
        <img className="recovery-art" src="/illustrations/recovery-envelope.png" width="144" height="144" alt="" />
        <h2 id="forgot-success-title">Check your email</h2>
        <p>
          If this email is registered, we’ll send a short-lived security code.
        </p>
        <strong className="recovery-destination">{maskEmail(sentTo).replace(/•{5,}/g,"••••")}</strong>
        <Link className="access-primary-button" href={resetHref}>
          Enter security code <IconArrowRight size={20} />
        </Link>
        <div className="recovery-links">
        <button className="access-text-button" type="button" onClick={() => setSentTo("")}>
          Use a different email
        </button>
        <Link className="access-back-link" href={loginHref}>
          <IconArrowLeft size={18} /> Back to sign in
        </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="access-card" aria-labelledby="forgot-title">
      <header className="access-card-heading">
        <span>Account recovery</span>
        <h2 id="forgot-title">Forgot your password?</h2>
        <p>Enter your account email and we’ll send a short-lived security code.</p>
      </header>

      {serverError ? (
        <div className="access-alert access-alert-error" role="alert">
          <IconAlertCircle size={20} aria-hidden="true" />
          <p>{serverError}</p>
        </div>
      ) : null}

      <form className="access-form" method="post" onSubmit={handleSubmit(submit)} noValidate>
        <AccessField id="forgot-email" label="Email address" error={errors.email?.message}>
          <div className="access-icon-input">
            <IconMail size={20} aria-hidden="true" />
            <input
              id="forgot-email"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoComplete="username"
              spellCheck={false}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "forgot-email-error" : undefined}
              placeholder="you@example.com"
              {...register("email")}
            />
          </div>
        </AccessField>

        <button className="access-primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <><IconLoader2 className="access-spinner" size={20} /> Sending code…</>
          ) : (
            <>Send security code <IconArrowRight size={20} /></>
          )}
        </button>
      </form>

      <div className="access-secondary-actions">
        <Link href={resetHref}>I already have a code</Link>
        <Link className="access-back-link" href={loginHref}>
          <IconArrowLeft size={18} /> Back to sign in
        </Link>
      </div>
    </section>
  );
}
