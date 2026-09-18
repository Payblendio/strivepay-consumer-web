"use client";

import { loginHref } from "./auth-access";
import { ACCOUNT_SCOPE_COOKIE, ACCOUNT_SCOPE_HEADER, parseAccountScope, type AccountScope } from "./account-scope";

const CUSTOMER_AUTH_FAILURES = new Set([
  "authentication_failed",
  "authentication_required",
  "customer_session_expired",
]);

let refreshRequest: Promise<boolean> | null = null;
let redirecting = false;
let activeScopeOverride: AccountScope | null = null;

export function setCustomerFetchAccountScope(scope: AccountScope | null) {
  activeScopeOverride = scope;
}

function browserAccountScope(): AccountScope | null {
  if (activeScopeOverride) return activeScopeOverride;
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${ACCOUNT_SCOPE_COOKIE}=([^;]*)`));
  return parseAccountScope(match ? decodeURIComponent(match[1]) : null);
}

async function isCustomerAuthFailure(response: Response) {
  if (response.status !== 401) return false;
  const problem = await response.clone().json().catch(() => null) as {
    type?: string;
    title?: string;
  } | null;
  return Boolean(
    problem && (
      CUSTOMER_AUTH_FAILURES.has(problem.type ?? "") ||
      problem.title === "Your session has expired" ||
      problem.title === "A valid bearer token is required"
    ),
  );
}

async function refreshCustomerSession() {
  try {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });
    const result = await response.json().catch(() => null) as { authenticated?: boolean } | null;
    return response.ok && result?.authenticated === true;
  } catch {
    return false;
  }
}

function moveToLogin() {
  if (redirecting || typeof window === "undefined") return;
  redirecting = true;
  const returnTo = `${window.location.pathname}${window.location.search}`;
  window.location.replace(loginHref(returnTo, "session-expired"));
}

function withAccountScope(init: RequestInit = {}): RequestInit {
  const scope = browserAccountScope();
  if (!scope) return init;
  const headers = new Headers(init.headers);
  if (!headers.has(ACCOUNT_SCOPE_HEADER)) headers.set(ACCOUNT_SCOPE_HEADER, scope);
  return { ...init, headers };
}

export async function customerFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const request = { ...withAccountScope(init), credentials: init.credentials ?? "same-origin" } satisfies RequestInit;
  let response = await fetch(input, request);
  if (!await isCustomerAuthFailure(response)) return response;

  refreshRequest ??= refreshCustomerSession().finally(() => { refreshRequest = null; });
  if (await refreshRequest) {
    response = await fetch(input, request);
    if (!await isCustomerAuthFailure(response)) return response;
  }

  moveToLogin();
  if (typeof window !== "undefined") return new Promise<Response>(() => {});
  return response;
}
