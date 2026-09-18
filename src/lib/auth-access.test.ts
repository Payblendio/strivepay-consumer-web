import { describe, expect, it } from "vitest";
import {
  loginSchema,
  destinationAfterLogin,
  loginHref,
  maskEmail,
  resetPasswordSchema,
  safeReturnTo,
} from "./auth-access";

describe("auth access contracts", () => {
  it("preserves support access before account selection, including email entry", () => {
    expect(destinationAfterLogin("/support", null)).toBe("/support");
    expect(destinationAfterLogin("/dashboard/support?ticket=qa#conversation", null)).toBe("/support?ticket=qa#conversation");
    expect(destinationAfterLogin("/dashboard/support", "PERSONAL")).toBe("/dashboard/support");
  });

  it.each(["/dashboard", "/dashboard/accounts", "/support/other", "//evil.example", "/support/../dashboard"])("keeps the setup gate for %s", target => {
    expect(destinationAfterLogin(target, null)).toBe("/onboarding/account-type");
  });

  it("rejects external destinations after account selection too", () => {
    expect(destinationAfterLogin("https://evil.example", "PERSONAL")).toBe("/dashboard");
  });
  it("keeps only same-origin return paths", () => {
    expect(safeReturnTo("/dashboard/transactions?status=pending")).toBe("/dashboard/transactions?status=pending");
    expect(safeReturnTo(["/settings", "/dashboard"])).toBe("/settings");
    expect(safeReturnTo("//evil.example/steal")).toBe("/dashboard");
    expect(safeReturnTo("https://evil.example/steal")).toBe("/dashboard");
    expect(safeReturnTo(undefined)).toBe("/dashboard");
  });

  it("builds a safe expired-session login route", () => {
    expect(loginHref("/onboarding/personal?step=address", "session-expired"))
      .toBe("/login?returnTo=%2Fonboarding%2Fpersonal%3Fstep%3Daddress&reason=session-expired");
    expect(loginHref("https://evil.example/steal", "session-expired"))
      .toBe("/login?returnTo=%2Fdashboard&reason=session-expired");
  });

  it.each(["/\\example.com","/dashboard\\evil","/\n/evil.example","/\t/evil.example","/dashboard\u0000","/dashboard\u007f","/%5cevil.example","/%2fexample.com","/dashboard?x=%0a","/dashboard/%ZZ"])("rejects unsafe return target %j",target=>{
    expect(safeReturnTo(target)).toBe("/dashboard");
    expect(new URL(safeReturnTo(target),"https://strivepay.test").origin).toBe("https://strivepay.test");
  });

  it("masks the email local part in recovery confirmation", () => {
    expect(maskEmail("nobody@example.com")).toBe("no••••@example.com");
    expect(maskEmail("a@example.com")).toBe("a•••@example.com");
  });

  it("does not apply the new-password policy during login", () => {
    expect(loginSchema.safeParse({ email: "person@example.com", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "person@example.com", password: "" }).success).toBe(false);
  });

  it("enforces the backend password policy and confirmation during reset", () => {
    const valid = { token: "security-code", password: "StrongPassword2026", confirmation: "StrongPassword2026" };
    expect(resetPasswordSchema.safeParse(valid).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ ...valid, password: "short1A", confirmation: "short1A" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ ...valid, password: "strongpassword2026", confirmation: "strongpassword2026" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ ...valid, confirmation: "DifferentPassword2026" }).success).toBe(false);
  });
});
