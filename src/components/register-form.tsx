"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconAlertCircle,
  IconArrowRight,
  IconEye,
  IconEyeOff,
  IconLoader2,
} from "@tabler/icons-react";
import { isValidPhoneNumber, type Country, type Value } from "react-phone-number-input";
import { z } from "zod";
import { registerSchema } from "@/lib/auth-access";
import { storeVerificationChallenge } from "@/lib/verification-challenge";
import { AccessField } from "./access-field";
import { InternationalPhoneField } from "./ui/international-phone-field";

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });
  const country = useWatch({ control, name: "country" }) as Country | undefined;
  const phone = useWatch({ control, name: "phoneE164" }) as Value | undefined;

  async function submit(values: RegisterValues) {
    setError("");
    setPhoneError("");

    if (!isValidPhoneNumber(values.phoneE164)) {
      setPhoneError("Enter a valid phone number.");
      return;
    }

    const email = values.email.trim().toLowerCase();

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, email }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data.type === "email_verification_required") {
          storeVerificationChallenge(data.email ?? email, data.verificationChallengeId);
          router.push(`/verify-email?email=${encodeURIComponent(data.email ?? email)}`);
          return;
        }
        setError(response.status === 409
          ? "An account already exists for this email. Sign in or reset your password."
          : response.status === 429
            ? "Too many attempts. Wait a few minutes and try again."
            : data.title ?? data.detail ?? data.message ?? "We couldn’t create your account. Try again.");
        return;
      }
      if (data.verificationRequired && !data.emailVerified) {
        storeVerificationChallenge(email, data.verificationChallengeId);
        router.replace(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
      if (!data.accountType) {
        router.replace("/onboarding/account-type");
        router.refresh();
        return;
      }
      router.replace(returnTo);
      router.refresh();
    } catch {
      setError("We couldn’t reach StrivePay. Check your connection and try again.");
    }
  }

  return (
    <section className="access-card access-register-card" aria-labelledby="register-title">
      <header className="access-card-heading">
        <span>Customer account</span>
        <h2 id="register-title">Create your account</h2>
        <p>Set up secure access. Verification comes next.</p>
      </header>

      {error ? (
        <div className="access-alert access-alert-error" role="alert">
          <IconAlertCircle size={20} aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}

      <form className="access-form" method="post" onSubmit={handleSubmit(submit)} noValidate>
        <div className="access-name-grid">
          <AccessField id="register-first-name" label="First name" error={errors.givenName?.message}>
            <input
              id="register-first-name"
              autoComplete="given-name"
              aria-invalid={Boolean(errors.givenName)}
              aria-describedby={errors.givenName ? "register-first-name-error" : undefined}
              placeholder="First name"
              {...register("givenName")}
            />
          </AccessField>
          <AccessField id="register-last-name" label="Last name" error={errors.familyName?.message}>
            <input
              id="register-last-name"
              autoComplete="family-name"
              aria-invalid={Boolean(errors.familyName)}
              aria-describedby={errors.familyName ? "register-last-name-error" : undefined}
              placeholder="Last name"
              {...register("familyName")}
            />
          </AccessField>
        </div>

        <AccessField id="register-email" label="Email address" error={errors.email?.message}>
          <input
            id="register-email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoComplete="username"
            spellCheck={false}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "register-email-error" : undefined}
            placeholder="you@example.com"
            {...register("email")}
          />
        </AccessField>

        <input type="hidden" {...register("country")} />
        <input type="hidden" {...register("phoneE164")} />
        <InternationalPhoneField
          className="access-phone-fields"
          country={country}
          value={phone}
          countryError={errors.country?.message}
          error={phoneError || errors.phoneE164?.message}
          onCountryChange={(nextCountry) => {
            setValue("country", nextCountry, { shouldDirty: true, shouldValidate: true });
            setValue("phoneE164", "", { shouldDirty: true, shouldValidate: true });
            setPhoneError("");
          }}
          onChange={(value) => {
            setValue("phoneE164", value ?? "", { shouldDirty: true, shouldValidate: true });
            setPhoneError("");
          }}
        />

        <AccessField
          id="register-password"
          label="Password"
          error={errors.password?.message}
          hint="12+ characters with uppercase, lowercase and a number."
        >
          <div className="access-password-input">
            <input
              id="register-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "register-password-error" : "register-password-hint"}
              placeholder="Create a password"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
            </button>
          </div>
        </AccessField>

        <button className="access-primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <><IconLoader2 className="access-spinner" size={20} /> Creating account…</>
          ) : (
            <>Create account <IconArrowRight size={20} /></>
          )}
        </button>
      </form>

      <p className="access-card-footer">
        Already registered? <Link href="/login">Sign in</Link>
      </p>
    </section>
  );
}
