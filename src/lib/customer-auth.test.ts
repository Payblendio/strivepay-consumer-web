import {describe,expect,it} from "vitest";
import {
  activeSessions,
  filterSessions,
  formatSessionStatus,
  sessionLabel,
  sessionStatus,
  type AuthSession,
} from "./customer-auth-format";

function session(partial:Partial<AuthSession>):AuthSession{
  return {
    id:"1",
    createdAt:"2026-09-01T10:00:00Z",
    lastSeenAt:"2026-09-01T11:00:00Z",
    expiresAt:"2026-10-01T10:00:00Z",
    ...partial,
  };
}

describe("customer auth helpers",()=>{
  it("labels common browsers and app clients from the user agent",()=>{
    expect(sessionLabel(session({userAgent:"Mozilla/5.0 Chrome/120.0.0.0"}))).toBe("Chrome");
    expect(sessionLabel(session({userAgent:"Mozilla/5.0 Firefox/128.0"}))).toBe("Firefox");
    expect(sessionLabel(session({userAgent:"node"}))).toBe("StrivePay web");
    expect(sessionLabel(session({userAgent:null}))).toBe("Unknown device");
  });

  it("classifies active, expired, and revoked sessions",()=>{
    expect(sessionStatus(session({expiresAt:"2099-01-01T00:00:00Z"}))).toBe("ACTIVE");
    expect(sessionStatus(session({expiresAt:"2020-01-01T00:00:00Z"}))).toBe("EXPIRED");
    expect(sessionStatus(session({revokedAt:"2026-09-02T10:00:00Z",expiresAt:"2099-01-01T00:00:00Z"}))).toBe("REVOKED");
    expect(formatSessionStatus("REVOKED")).toBe("Signed out");
  });

  it("keeps only active sessions for the security summary",()=>{
    const rows=activeSessions([
      session({id:"live",expiresAt:"2099-01-01T00:00:00Z"}),
      session({id:"gone",revokedAt:"2026-09-02T10:00:00Z",expiresAt:"2099-01-01T00:00:00Z"}),
      session({id:"old",expiresAt:"2020-01-01T00:00:00Z"}),
    ]);
    expect(rows.map(item=>item.id)).toEqual(["live"]);
  });

  it("filters session history like an activity list",()=>{
    const rows=[
      session({id:"live",lastSeenAt:"2026-09-04T12:00:00Z",expiresAt:"2099-01-01T00:00:00Z"}),
      session({id:"gone",lastSeenAt:"2026-09-04T11:00:00Z",revokedAt:"2026-09-02T10:00:00Z",expiresAt:"2099-01-01T00:00:00Z"}),
      session({id:"old",lastSeenAt:"2026-09-04T10:00:00Z",expiresAt:"2020-01-01T00:00:00Z"}),
    ];
    expect(filterSessions(rows,"ACTIVE").map(item=>item.id)).toEqual(["live"]);
    expect(filterSessions(rows,"ENDED").map(item=>item.id)).toEqual(["gone","old"]);
    expect(filterSessions(rows,"ALL").map(item=>item.id)).toEqual(["live","gone","old"]);
  });
});
