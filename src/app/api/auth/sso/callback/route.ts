import {NextRequest,NextResponse} from "next/server";
import {secureCookies} from "@/lib/cookie-secure";
import {publicRequestOrigin} from "@/lib/request-origin";

const ACCESS="sp_access";
const ORG_ID=/^[0-9a-fA-F-]{36}$/;

/** Hosts that bind servers but are not usable in a browser Location. */
function sanitizeBrowserOrigin(origin:string){
  try{
    const url=new URL(origin);
    const host=url.hostname.toLowerCase();
    if(host==="0.0.0.0"||host==="::"||host==="[::]"){
      url.hostname="localhost";
    }
    return url.origin;
  }catch{
    return "http://localhost:18081";
  }
}

function browserOrigin(request:NextRequest){
  const configured=process.env.NEXT_PUBLIC_APP_URL?.trim();
  if(configured){
    try{
      const sanitized=sanitizeBrowserOrigin(configured);
      const host=new URL(sanitized).hostname.toLowerCase();
      if(host&&host!=="0.0.0.0")return sanitized;
    }catch{/* fall through */}
  }
  return sanitizeBrowserOrigin(publicRequestOrigin(request.headers,request.nextUrl.origin));
}

function redirectTo(path:string,request:NextRequest){
  return NextResponse.redirect(new URL(path,browserOrigin(request)));
}

/** IdP ACS lands on the API, which 302s here so cookies are set on the web origin. */
export async function GET(request:NextRequest){
  const token=request.nextUrl.searchParams.get("accessToken")?.trim()??"";
  const expiresAt=request.nextUrl.searchParams.get("expiresAt")?.trim()??"";
  const organizationId=request.nextUrl.searchParams.get("organizationId")?.trim()??"";
  if(!token.startsWith("sp_sso_")||token.length<24){
    return redirectTo("/login?error=sso-session",request);
  }
  const expires=expiresAt?new Date(expiresAt):undefined;
  if(expires&&Number.isNaN(expires.getTime())){
    return redirectTo("/login?error=sso-session",request);
  }
  const response=redirectTo("/dashboard",request);
  response.cookies.set(ACCESS,token,{
    httpOnly:true,
    secure:secureCookies(),
    sameSite:"lax",
    path:"/",
    expires,
  });
  response.cookies.set("sp_account_scope","BUSINESS",{
    httpOnly:false,
    secure:secureCookies(),
    sameSite:"lax",
    path:"/",
  });
  if(ORG_ID.test(organizationId)){
    response.cookies.set("sp_sso_org",organizationId,{
      httpOnly:true,
      secure:secureCookies(),
      sameSite:"lax",
      path:"/",
      expires,
    });
  }
  return response;
}
