"use client";

import Link from "next/link";
import {IconChevronRight,IconLock,IconShieldCheck,IconUser,IconUsers} from "@tabler/icons-react";
import type {ReactNode} from "react";

export function AccountPage({title,copy,children}:{title:string;copy:string;children:ReactNode}){
  return <section className="dashboard-canvas dashboard-route-page account-workspace" aria-label={title}>
    <header className="account-toolbar">
      <p id="account-page-title">{copy}</p>
    </header>
    <div className="account-body">{children}</div>
  </section>;
}

export function SettingsRow({href,icon,title,detail,onNavigate}:{href:string;icon:ReactNode;title:string;detail:string;onNavigate?:()=>void|Promise<void>}){
  return <Link className="account-settings-row" href={href} onClick={event=>{if(!onNavigate)return;event.preventDefault();void onNavigate();}}>
    <span className="account-settings-icon" aria-hidden="true">{icon}</span>
    <span className="account-settings-copy">
      <strong>{title}</strong>
      <small>{detail}</small>
    </span>
    <IconChevronRight size={16} aria-hidden="true"/>
  </Link>;
}

export function ProfileDetail({label,value}:{label:string;value:ReactNode}){
  return <div className="account-profile-row">
    <dt>{label}</dt>
    <dd>{value||"—"}</dd>
  </div>;
}

export const accountIcons={
  profile:<IconUser size={18}/>,
  security:<IconLock size={18}/>,
  setup:<IconShieldCheck size={18}/>,
  team:<IconUsers size={18}/>,
};
