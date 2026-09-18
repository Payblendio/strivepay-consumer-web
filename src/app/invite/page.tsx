import type {Metadata} from "next";
import {Suspense} from "react";
import {InviteAcceptScreen} from "@/components/invite-accept-form";

export const metadata:Metadata={title:"Join your team"};

export default function InvitePage(){
  return (
    <Suspense fallback={<p className="access-safety-note">Loading invitation…</p>}>
      <InviteAcceptScreen/>
    </Suspense>
  );
}
