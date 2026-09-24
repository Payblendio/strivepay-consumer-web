"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconArrowRight,
  IconEye,
  IconEyeOff,
  IconLoader2,
} from "@tabler/icons-react";
import { isValidPhoneNumber, type Country, type Value } from "react-phone-number-input";
import { z } from "zod";
import { businessRegistrationSchema, registerSchema } from "@/lib/auth-access";
import { supportedCodes, useJurisdictions } from "@/lib/jurisdictions";
import { storeVerificationChallenge } from "@/lib/verification-challenge";
import { AccessField } from "./access-field";
import { AccountOption } from "./account-type-choice";
import { CountrySelect } from "./ui/country-select";
import { InternationalPhoneField } from "./ui/international-phone-field";

type RegisterValues = z.infer<typeof registerSchema>;
type BusinessValues = z.infer<typeof businessRegistrationSchema>;
type AccountType = "PERSONAL" | "BUSINESS";
type Step = "type" | "business" | "person";

export function RegisterForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("type");
  const [accountType, setAccountType] = useState<AccountType>();
  const [business, setBusiness] = useState<BusinessValues>();
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { jurisdictions, error: jurisdictionError, reload } = useJurisdictions();
  const residenceCodes = useMemo(() => (jurisdictions ? supportedCodes(jurisdictions, "individual") as Country[] : []), [jurisdictions]);
  const corporateOptions = useMemo(
    () => (jurisdictions ?? []).filter((item) => item.corporateSupported).map((item) => ({ code: item.code, name: item.name })),
    [jurisdictions],
  );
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });
  const businessForm = useForm<BusinessValues>({ resolver: zodResolver(businessRegistrationSchema), defaultValues: business });
  const country = useWatch({ control, name: "country" }) as Country | undefined;
  const phone = useWatch({ control, name: "phoneE164" }) as Value | undefined;
  const incorporationCountry = useWatch({ control: businessForm.control, name: "country" });

  const steps: Step[] = accountType === "BUSINESS" ? ["type", "business", "person"] : ["type", "person"];
  const stepIndex = steps.indexOf(step);

  function chooseType(next: AccountType) {
    setAccountType(next);
    setError("");
    setStep(next === "BUSINESS" ? "business" : "person");
  }

  function back() {
    setError("");
    setStep(steps[Math.max(stepIndex - 1, 0)]);
  }

  function saveBusiness(values: BusinessValues) {
    if (!supportedCodes(jurisdictions ?? [], "corporate").includes(values.country)) {
      businessForm.setError("country", { message: "Business accounts aren’t available for companies registered in this country." });
      return;
    }
    setBusiness(values);
    setStep("person");
  }

  async function submit(values: RegisterValues) {
    setError("");
    setPhoneError("");

    if (!residenceCodes.includes(values.country as Country)) {
      setError("StrivePay isn’t available to residents of the selected country.");
      return;
    }
    if (!isValidPhoneNumber(values.phoneE164)) {
      setPhoneError("Enter a valid phone number.");
      return;
    }

    const email = values.email.trim().toLowerCase();

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          email,
          accountType,
          business: accountType === "BUSINESS" ? business : undefined,
        }),
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
      if (!data.accountType && !accountType) {
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

  const heading = step === "type"
    ? { title: "How will you use StrivePay?", copy: "Choose an account type. You can join a business workspace later." }
    : step === "business"
      ? { title: "Tell us about your company", copy: "We use these details for business verification." }
      : { title: accountType === "BUSINESS" ? "Your details" : "Create your account", copy: accountType === "BUSINESS" ? "You’ll be the account owner and verify your identity next." : "Set up secure access. Verification comes next." };

  return (
    <section className="access-card access-register-card" aria-labelledby="register-title">
      <header className="access-card-heading">
        <span>{step === "type" ? "Customer account" : `Step ${stepIndex + 1} of ${steps.length}`}</span>
        <h2 id="register-title">{heading.title}</h2>
        <p>{heading.copy}</p>
      </header>

      {error || jurisdictionError ? (
        <div className="access-alert access-alert-error" role="alert">
          <IconAlertCircle size={20} aria-hidden="true" />
          <p>{error || jurisdictionError}</p>
          {jurisdictionError && !error ? <button type="button" className="access-text-button" onClick={() => void reload()}>Retry</button> : null}
        </div>
      ) : null}

      {step !== "type" ? (
        <button type="button" className="access-back-link access-step-back" onClick={back}>
          <IconArrowLeft size={16} aria-hidden="true" /> Back
        </button>
      ) : null}

      {step === "type" ? (
        <div className="account-type-options" role="group" aria-label="Account type">
          <AccountOption
            title="Personal account"
            description="Buy, sell and move money for yourself."
            imageSrc="/illustrations/account-personal-3d.png"
            busy={false} disabled={false}
            onClick={() => chooseType("PERSONAL")}
          />
          <AccountOption
            title="Business account"
            description="Manage company money, teammates and transactions."
            imageSrc="/illustrations/account-business-3d.png"
            busy={false} disabled={false}
            onClick={() => chooseType("BUSINESS")}
          />
        </div>
      ) : null}

      {step === "business" ? (
        <form className="access-form" onSubmit={businessForm.handleSubmit(saveBusiness)} noValidate>
          <AccessField id="register-legal-name" label="Legal company name" error={businessForm.formState.errors.legalName?.message}>
            <input
              id="register-legal-name"
              autoComplete="organization"
              aria-invalid={Boolean(businessForm.formState.errors.legalName)}
              placeholder="As shown on your registration documents"
              {...businessForm.register("legalName")}
            />
          </AccessField>
          <AccessField id="register-registration-number" label="Company registration number" error={businessForm.formState.errors.registrationNumber?.message}>
            <input
              id="register-registration-number"
              aria-invalid={Boolean(businessForm.formState.errors.registrationNumber)}
              placeholder="e.g. RC-1234567"
              {...businessForm.register("registrationNumber")}
            />
          </AccessField>
          <input type="hidden" {...businessForm.register("country")} />
          <CountrySelect
            label="Country of incorporation"
            placeholder="Choose where the company is registered"
            value={incorporationCountry}
            options={corporateOptions}
            error={businessForm.formState.errors.country?.message}
            className="access-country-field"
            modalClassName="access-selector-dialog"
            onChange={(code) => businessForm.setValue("country", code, { shouldDirty: true, shouldValidate: true })}
          />
          <button className="access-primary-button" type="submit">
            Continue <IconArrowRight size={20} />
          </button>
        </form>
      ) : null}

      {step === "person" ? (
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

          <AccessField id="register-email" label={accountType === "BUSINESS" ? "Work email address" : "Email address"} error={errors.email?.message}>
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
            allowedCountries={residenceCodes}
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
      ) : null}

      <p className="access-card-footer">
        Already registered? <Link href="/login">Sign in</Link>
      </p>
    </section>
  );
}
