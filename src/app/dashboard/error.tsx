"use client";

import {IconArrowRight} from "@tabler/icons-react";
import Link from "next/link";
import {RouteEmptyState} from "@/components/route-empty-state";

type DashboardErrorProps={error:unknown;retry?:()=>void;reset?:()=>void};

export default function DashboardError({retry,reset}:DashboardErrorProps){
  const recover=retry??reset??(()=>window.location.reload());
  return <section className="dashboard-canvas dashboard-route-page" aria-label="Page unavailable">
    <RouteEmptyState
      title="We couldn’t load this page."
      detail="Try again in a moment. If it keeps happening, contact support."
      imageSrc="/illustrations/account-error-3d.png"
    >
      <button type="button" className="compliance-primary" onClick={()=>recover()}>
        Try again <IconArrowRight size={17}/>
      </button>
      <Link href="/dashboard" prefetch={false} className="compliance-secondary">
        Back to overview <IconArrowRight size={17}/>
      </Link>
    </RouteEmptyState>
  </section>;
}