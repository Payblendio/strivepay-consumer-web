import {customerFetch} from "@/lib/customer-session";
import {apiErrorMessage} from "@/lib/api-error";

export class TeamApiError extends Error{
  status:number;
  constructor(message:string,status:number){
    super(message);
    this.status=status;
  }
}

export type TeamRole="OWNER"|"ADMINISTRATOR"|"OPERATOR"|"VIEWER";
export type InviteRole="ADMINISTRATOR"|"OPERATOR"|"VIEWER";

export type TeamMember={
  id:string;
  personId:string;
  email:string;
  givenName:string;
  familyName:string;
  role:TeamRole;
  status:string;
  providerStatus?:string|null;
  activatedAt?:string|null;
  createdAt:string;
};

export type TeamInvitation={
  id:string;
  email:string;
  role:InviteRole;
  status:string;
  expiresAt:string;
  invitationToken?:string|null;
};

export const INVITE_ROLES:Array<{value:InviteRole;label:string;hint:string}>=[
  {value:"ADMINISTRATOR",label:"Administrator",hint:"Manage team, company settings, and money routes"},
  {value:"OPERATOR",label:"Operator",hint:"View company activity and money routes"},
  {value:"VIEWER",label:"Viewer",hint:"Read-only access"},
];

export function roleLabel(role:string){
  return role.charAt(0)+role.slice(1).toLowerCase().replaceAll("_"," ");
}

async function teamApi<T>(path:string,init:RequestInit={}):Promise<T>{
  const response=await customerFetch(`/api/corporate/members${path}`,{...init,headers:{Accept:"application/json",...init.headers}});
  const value=response.status===204?null:await response.json().catch(()=>null);
  if(!response.ok)throw new TeamApiError(apiErrorMessage(value,"That team request could not be completed"),response.status);
  return value as T;
}

export function listMembers(){return teamApi<TeamMember[]>("");}
export function listInvitations(){return teamApi<TeamInvitation[]>("/invitations");}
export function inviteMember(email:string,role:InviteRole){
  return teamApi<TeamInvitation>("/invitations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,role})});
}
export function revokeInvitation(id:string){
  return teamApi<void>(`/invitations/${encodeURIComponent(id)}/revoke`,{method:"POST"});
}
export function updateMemberRole(personId:string,role:InviteRole){
  return teamApi<TeamMember>(`/${encodeURIComponent(personId)}/role`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({role})});
}
export function removeMember(personId:string){
  return teamApi<void>(`/${encodeURIComponent(personId)}`,{method:"DELETE"});
}

export async function acceptInvitation(body:{
  token:string;
  givenName:string;
  familyName:string;
  country:string;
  phone?:string;
  password:string;
}){
  const response=await fetch("/api/corporate/members/accept",{
    method:"POST",
    headers:{Accept:"application/json","Content-Type":"application/json"},
    credentials:"same-origin",
    body:JSON.stringify(body),
  });
  const value=await response.json().catch(()=>null);
  if(!response.ok)throw new TeamApiError(apiErrorMessage(value,"Invitation could not be accepted"),response.status);
  return value as {
    organizationId:string;
    memberId:string;
    role:string;
    onboardingStatus:string;
  };
}

export type InvitationPreview={
  companyName:string;
  email:string;
  role:InviteRole|string;
  expiresAt:string;
};

export async function previewInvitation(token:string){
  const response=await fetch(`/api/corporate/members/invitations/preview?token=${encodeURIComponent(token)}`,{
    headers:{Accept:"application/json"},
    credentials:"same-origin",
    cache:"no-store",
  });
  const value=await response.json().catch(()=>null);
  if(!response.ok)throw new TeamApiError(apiErrorMessage(value,"Invitation is invalid or expired"),response.status);
  return value as InvitationPreview;
}
