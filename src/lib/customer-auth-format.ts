export type AuthSession={
  id:string;
  ipAddress?:string|null;
  userAgent?:string|null;
  createdAt:string;
  lastSeenAt:string;
  expiresAt:string;
  revokedAt?:string|null;
  revokeReason?:string|null;
  current?:boolean;
};

export type SessionStatus="ACTIVE"|"EXPIRED"|"REVOKED";
export type SessionFilter="ACTIVE"|"ALL"|"ENDED";

export function sessionLabel(session:AuthSession){
  const agent=(session.userAgent||"").trim();
  if(!agent)return "Unknown device";
  if(/^(node|undici|axios|okhttp|python-requests|go-http-client)/i.test(agent))return "StrivePay web";
  if(/Edg\//i.test(agent))return "Microsoft Edge";
  if(/Chrome\//i.test(agent)&&!/Edg\//i.test(agent))return "Chrome";
  if(/Firefox\//i.test(agent))return "Firefox";
  if(/Safari\//i.test(agent)&&!/Chrome\//i.test(agent))return "Safari";
  if(/^Mozilla\//i.test(agent))return "Browser";
  return agent.slice(0,48);
}

export function formatSessionTime(value?:string|null){
  if(!value)return "—";
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return "—";
  return new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(date);
}

export function sessionStatus(session:AuthSession,now=Date.now()):SessionStatus{
  if(session.revokedAt)return "REVOKED";
  const expires=Date.parse(session.expiresAt||"");
  if(!Number.isNaN(expires)&&expires<=now)return "EXPIRED";
  if(Number.isNaN(expires))return "EXPIRED";
  return "ACTIVE";
}

export function formatSessionStatus(status:SessionStatus){
  if(status==="ACTIVE")return "Active";
  if(status==="EXPIRED")return "Expired";
  return "Signed out";
}

export function sessionStatusClass(status:SessionStatus){
  if(status==="ACTIVE")return "completed";
  if(status==="EXPIRED")return "processing";
  return "failed";
}

export function activeSessions(sessions:AuthSession[]){
  return sortSessions(sessions.filter(session=>sessionStatus(session)==="ACTIVE")).slice(0,12);
}

export function sortSessions(sessions:AuthSession[]){
  return [...sessions].sort((a,b)=>{
    const statusRank=(session:AuthSession)=>sessionStatus(session)==="ACTIVE"?0:1;
    const byStatus=statusRank(a)-statusRank(b);
    if(byStatus!==0)return byStatus;
    return Date.parse(b.lastSeenAt||"0")-Date.parse(a.lastSeenAt||"0");
  });
}

export function filterSessions(sessions:AuthSession[],filter:SessionFilter){
  const sorted=sortSessions(sessions).slice(0,40);
  if(filter==="ACTIVE")return sorted.filter(session=>sessionStatus(session)==="ACTIVE");
  if(filter==="ENDED")return sorted.filter(session=>sessionStatus(session)!=="ACTIVE");
  return sorted;
}
