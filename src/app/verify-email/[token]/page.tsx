import {redirect} from "next/navigation";

/** Legacy link-based verify URLs no longer auto-verify; send users to enter the emailed code. */
export default async function VerifyEmailToken({searchParams}:{searchParams:Promise<{email?:string}>}){
  const {email}=await searchParams;
  redirect(email?`/verify-email?email=${encodeURIComponent(email)}`:"/verify-email");
}
