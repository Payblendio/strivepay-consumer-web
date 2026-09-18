import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const registerSchema = z.object({
  givenName: z.string().trim().min(1, "Enter your first name"),
  familyName: z.string().trim().min(1, "Enter your last name"),
  email: z.email("Enter a valid email address"),
  country: z.string().length(2, "Choose your country of residence"),
  phoneE164: z.string().min(1, "Enter your phone number"),
  password: z.string()
    .min(12, "Use at least 12 characters")
    .regex(/[A-Z]/, "Add an uppercase letter")
    .regex(/[a-z]/, "Add a lowercase letter")
    .regex(/\d/, "Add a number"),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, "Enter the security code from your email"),
  password: z.string()
    .min(12, "Use at least 12 characters")
    .regex(/[A-Z]/, "Add an uppercase letter")
    .regex(/[a-z]/, "Add a lowercase letter")
    .regex(/\d/, "Add a number"),
  confirmation: z.string().min(1, "Confirm your new password"),
}).refine((values) => values.password === values.confirmation, {
  message: "Passwords do not match",
  path: ["confirmation"],
});

export function safeReturnTo(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  const unsafe=(path:string)=>!path.startsWith("/")||path.startsWith("//")||path.includes("\\")
    ||Array.from(path).some(character=>character.charCodeAt(0)<32||character.charCodeAt(0)===127);
  if(!candidate||unsafe(candidate))return "/dashboard";
  try{
    // Reject encoded controls/separators too; never normalize a bad target into a redirect.
    if(unsafe(decodeURIComponent(candidate)))return "/dashboard";
    if(new URL(candidate,"https://return.invalid").origin!=="https://return.invalid")return "/dashboard";
    return candidate;
  }catch{return "/dashboard";}
}

export function destinationAfterLogin(returnTo: string, accountType?: string | null) {
  const target = safeReturnTo(returnTo);
  if (accountType) return target;
  const url = new URL(target, "https://return.invalid");
  // Support remains available before account selection; dashboard access does not.
  if (url.pathname === "/support" || url.pathname === "/dashboard/support") {
    return `/support${url.search}${url.hash}`;
  }
  return "/onboarding/account-type";
}

export function loginHref(returnTo: string, reason?: "session-expired") {
  const params = new URLSearchParams({ returnTo: safeReturnTo(returnTo) });
  if (reason) params.set("reason", reason);
  return `/login?${params.toString()}`;
}

export function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${"•".repeat(Math.max(3, name.length - visible.length))}@${domain}`;
}
