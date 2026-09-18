/** Session cookies should only be Secure on HTTPS. LAN/http testing must stay non-Secure. */
export function secureCookies(): boolean {
  const flag = process.env.COOKIE_SECURE?.trim().toLowerCase();
  if (flag === "true" || flag === "1") return true;
  if (flag === "false" || flag === "0") return false;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (appUrl.startsWith("http://")) return false;
  return process.env.NODE_ENV === "production";
}
