"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconLoader2,
} from "@tabler/icons-react";
import { z } from "zod";
import { resetPasswordSchema } from "@/lib/auth-access";
import { AccessField } from "./access-field";

type ResetValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm({
  initialToken = "",
  returnTo,
}: {
  initialToken?: string;
  returnTo: string;
}) {
  const [serverError, setServerError] = useState("");
  const [complete, setComplete] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: initialToken, password: "", confirmation: "" },
  });
  const password = useWatch({ control, name: "password" }) ?? "";
  const loginHref = returnTo === "/dashboard"
    ? "/login"
    : `/login?returnTo=${encodeURIComponent(returnTo)}`;
  const forgotHref = returnTo === "/dashboard"
    ? "/forgot-password"
    : `/forgot-password?returnTo=${encodeURIComponent(returnTo)}`;

  async function submit(values: ResetValues) {
    setServerError("");
    try {
      const response = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: values.token.trim(), password: values.password }),
      });
      if (!response.ok) {
        setServerError(response.status === 429
          ? "Too many attempts. Wait a few minutes or request a new code."
          : "That security code is invalid, expired, or already used. Request a new code and try again.");
        return;
      }
      setComplete(true);
    } catch {
      setServerError("We couldn’t reach StrivePay. Check your connection and try again.");
    }
  }

  if (complete) {
    return (
      <section className="access-card access-result" aria-labelledby="reset-success-title">
        <span className="access-result-icon"><IconCheck size={26} aria-hidden="true" /></span>
        <span className="access-result-kicker">Recovery complete</span>
        <h2 id="reset-success-title">Password changed</h2>
        <p>Your new password is ready. For your security, existing sessions have been signed out.</p>
        <Link className="access-primary-button" href={loginHref}>
          Continue to sign in <IconArrowRight size={20} />
        </Link>
      </section>
    );
  }

  const passwordChecks = [
    { label: "12 or more characters", met: password.length >= 12 },
    { label: "Uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Lowercase letter", met: /[a-z]/.test(password) },
    { label: "Number", met: /\d/.test(password) },
  ];

  return (
    <section className="access-card" aria-labelledby="reset-title">
      <header className="access-card-heading">
        <span>Account recovery</span>
        <h2 id="reset-title">Set a new password</h2>
        <p>Enter the security code from your email, then choose a new password.</p>
      </header>

      {serverError ? (
        <div className="access-alert access-alert-error" role="alert">
          <IconAlertCircle size={20} aria-hidden="true" />
          <p>{serverError}</p>
        </div>
      ) : null}

      <form className="access-form" method="post" onSubmit={handleSubmit(submit)} noValidate>
        <AccessField
          id="reset-token"
          label="Security code"
          error={errors.token?.message}
          hint="Paste the complete code exactly as it appears in your email."
        >
          <input
            id="reset-token"
            className="access-code-input"
            type="text"
            autoComplete="one-time-code"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={Boolean(errors.token)}
            aria-describedby={errors.token ? "reset-token-error" : "reset-token-hint"}
            placeholder="Security code"
            {...register("token")}
          />
        </AccessField>

        <AccessField id="reset-password" label="New password" error={errors.password?.message}>
          <div className="access-password-input">
            <input
              id="reset-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "reset-password-error password-requirements" : "password-requirements"}
              placeholder="Create a new password"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide passwords" : "Show passwords"}
              aria-pressed={showPassword}
            >
              {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
            </button>
          </div>
        </AccessField>

        <ul className="access-password-rules" id="password-requirements" aria-label="Password requirements">
          {passwordChecks.map((check) => (
            <li className={check.met ? "is-met" : ""} key={check.label}>
              <IconCheck size={14} aria-hidden="true" /> {check.label}
            </li>
          ))}
        </ul>

        <AccessField id="reset-confirmation" label="Confirm new password" error={errors.confirmation?.message}>
          <input
            id="reset-confirmation"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmation)}
            aria-describedby={errors.confirmation ? "reset-confirmation-error" : undefined}
            placeholder="Repeat your new password"
            {...register("confirmation")}
          />
        </AccessField>

        <button className="access-primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <><IconLoader2 className="access-spinner" size={20} /> Updating password…</>
          ) : (
            <>Update password <IconArrowRight size={20} /></>
          )}
        </button>
      </form>

      <div className="access-secondary-actions">
        <Link href={forgotHref}>Request a new code</Link>
        <Link className="access-back-link" href={loginHref}>
          <IconArrowLeft size={18} /> Back to sign in
        </Link>
      </div>
    </section>
  );
}
