"use client";

import type {ReactNode} from "react";

export function DashboardRouteWindow({eyebrow,title,copy,aside,children}:{eyebrow:string;title:string;copy:string;aside?:{kicker:string;value:string;note:string};children:ReactNode}){
  return <section className="dashboard-canvas dashboard-route-page">
    <div className="compliance-window dashboard-route-window">
      <header className="compliance-window-hero">
        <div>
          <span>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{copy}</p>
        </div>
        {aside?<div className="compliance-step-number" aria-hidden="true"><small>{aside.kicker}</small><strong>{aside.value}</strong><span>{aside.note}</span></div>:null}
      </header>
      <div className="compliance-window-body dashboard-route-body">
        <section className="compliance-form-panel dashboard-route-panel">{children}</section>
      </div>
    </div>
  </section>;
}
