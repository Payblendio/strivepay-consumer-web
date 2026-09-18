import { afterEach, describe, expect, it, vi } from "vitest";
import { customerFetch } from "./customer-session";

function jsonResponse(status: number, value: unknown) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("customer session fetch", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("refreshes an expired customer session and retries the request", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(401, { type: "customer_session_expired" }))
      .mockResolvedValueOnce(jsonResponse(200, { authenticated: true }))
      .mockResolvedValueOnce(jsonResponse(200, { onboardingStatus: "PENDING" }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await customerFetch("/api/onboarding");

    expect(response.ok).toBe(true);
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/auth/refresh", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not refresh a provider-specific unauthorized response", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(401, { type: "provider_session_required" }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await customerFetch("/api/onboarding/session/otp", { method: "POST" });

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
