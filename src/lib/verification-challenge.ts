/** Client-only handle for email OTP — never display to the user. */
const KEY = "sp_email_verification_challenge";

type Stored = { email: string; challengeId: string };

export function storeVerificationChallenge(email: string, challengeId: string | null | undefined) {
  if (typeof window === "undefined" || !challengeId) return;
  const payload: Stored = { email: email.trim().toLowerCase(), challengeId: String(challengeId) };
  sessionStorage.setItem(KEY, JSON.stringify(payload));
}

export function readVerificationChallenge(email?: string | null): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Stored;
    if (!stored?.challengeId) return null;
    if (email && stored.email !== email.trim().toLowerCase()) return null;
    return stored.challengeId;
  } catch {
    return null;
  }
}

export function clearVerificationChallenge() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}
