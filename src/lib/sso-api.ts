import {customerFetch} from "@/lib/customer-session";
import {apiErrorMessage} from "@/lib/api-error";

export class SsoApiError extends Error{
  status:number;
  constructor(message:string,status:number){
    super(message);
    this.status=status;
  }
}

export type SsoProviderPreset={
  code:string;
  displayName:string;
  metadataInstructions:string;
};

export type SsoServiceProvider={
  assertionConsumerUrl:string;
  entityId:string;
  metadataUrl:string;
};

export type SsoConfiguration={
  issuer:string;
  ssoUrl:string;
  audience:string;
  allowedEmailDomain?:string|null;
  jitProvisioning:boolean;
  status:string;
  certificateSha256:string;
  assertionConsumerUrl:string;
  serviceProviderEntityId:string;
  providerType?:string|null;
  metadataSourceUrl?:string|null;
  certificateExpiresAt?:string|null;
  testedAt?:string|null;
  activatedAt?:string|null;
  updatedAt:string;
};

export type SsoTestResult={
  valid:boolean;
  email:string;
  issuer:string;
  assertionExpiresAt?:string|null;
  configuration:SsoConfiguration;
};

async function ssoApi<T>(path:string,init:RequestInit={}):Promise<T>{
  const response=await customerFetch(`/api/corporate/sso${path}`,{...init,headers:{Accept:"application/json",...init.headers}});
  const value=response.status===204?null:await response.json().catch(()=>null);
  if(!response.ok)throw new SsoApiError(apiErrorMessage(value,"That SSO request could not be completed"),response.status);
  return value as T;
}

export function listSsoPresets(){return ssoApi<SsoProviderPreset[]>("/presets");}
export function getSsoServiceProvider(){return ssoApi<SsoServiceProvider>("/service-provider");}
export function getSsoConfiguration(){return ssoApi<SsoConfiguration>("");}
export function importSsoMetadata(body:{
  metadataXml?:string|null;
  metadataUrl?:string|null;
  allowedEmailDomain?:string|null;
  jitProvisioning?:boolean;
  providerType?:string|null;
}){
  return ssoApi<SsoConfiguration>("/metadata/import",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body),
  });
}
export function testSsoConnection(samlResponse:string){
  return ssoApi<SsoTestResult>("/test",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({samlResponse}),
  });
}
export function startSsoConnectionTest(){
  return ssoApi<{redirectUrl:string;expiresAt?:string}>("/test/start",{method:"POST"});
}
export function activateSso(){return ssoApi<SsoConfiguration>("/activate",{method:"POST"});}
export function disableSso(){return ssoApi<void>("",{method:"DELETE"});}

export function publicSsoLoginUrl(organizationId:string){
  const base=(process.env.NEXT_PUBLIC_SSO_API_URL??process.env.NEXT_PUBLIC_APP_URL??"").replace(/\/+$/,"");
  if(!base)return "";
  return `${base}/v1/corporate/sso/${encodeURIComponent(organizationId)}/login`;
}
