"use client";
import {SupportUnreadBadge} from "./support-unread-badge";
import {TwoFactorReminder} from "./two-factor-reminder";
import {NotificationDrawer} from "./notification-drawer";

import Image from "next/image";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {useEffect,useRef,useState,useSyncExternalStore,type ReactNode} from "react";
import {
  IconArrowsExchange,
  IconChartArrowsVertical,
  IconChevronRight,
  IconHistory,
  IconLayoutDashboard,
  IconListCheck,
  IconMenu2,
  IconSettings,
  IconShieldCheck,
  IconWallet,
  IconX,
  IconMessageCircle,
} from "@tabler/icons-react";
import type {AccountScope} from "@/lib/account-scope";
import {hasBusinessMembershipHint} from "@/lib/account-scope";
import type {DashboardCustomer} from "@/lib/dashboard-access";
import {DashboardCustomerProvider} from "./dashboard-customer";
import {DashboardProfileMenu} from "./dashboard-profile-menu";
import {SidebarPromotion} from "./sidebar-promotion";
import {accountSetupHref,dashboardBreadcrumb,dashboardPageMeta,type AccountSetupState,type DashboardNavId} from "./dashboard-route-copy";

type NavItem={
  id:DashboardNavId;
  label:string;
  icon:typeof IconLayoutDashboard;
  href:string;
};

const primaryItems:NavItem[]=[
  {id:"overview",label:"Overview",icon:IconLayoutDashboard,href:"/dashboard"},
  {id:"buy",label:"Buy crypto",icon:IconChartArrowsVertical,href:"/dashboard/buy"},
  {id:"sell",label:"Sell crypto",icon:IconArrowsExchange,href:"/dashboard/sell"},
  {id:"activity",label:"Activity",icon:IconHistory,href:"/dashboard/activity"},
  {id:"accounts",label:"Accounts",icon:IconWallet,href:"/dashboard/accounts"},
  {id:"how-it-works",label:"How it works",icon:IconListCheck,href:"/dashboard/how-it-works"},
  {id:"support",label:"Support",icon:IconMessageCircle,href:"/dashboard/support"},
];

const mobileQuery="(max-width: 820px)";
const mobileSnapshot=()=>window.matchMedia(mobileQuery).matches;
const mobileServerSnapshot=()=>false;
function subscribeMobile(listener:()=>void){
  const query=window.matchMedia(mobileQuery);
  query.addEventListener("change",listener);
  return()=>query.removeEventListener("change",listener);
}

export function DashboardFrame({customer,setup,accountScope="PERSONAL",canMutateFinances=true,children}:{customer:DashboardCustomer;setup:AccountSetupState|null;accountScope?:AccountScope;canMutateFinances?:boolean;children:ReactNode}){
  const router=useRouter();
  const pathname=usePathname();
  const [menuOpen,setMenuOpen]=useState(false);
  const mobile=useSyncExternalStore(subscribeMobile,mobileSnapshot,mobileServerSnapshot);
  const sidebarRef=useRef<HTMLElement>(null);
  const menuButtonRef=useRef<HTMLButtonElement>(null);
  const drawerOpen=mobile&&menuOpen;
  const meta=dashboardPageMeta(pathname,customer.givenName);
  const crumbs=dashboardBreadcrumb(pathname);
  const onAccount=pathname.startsWith("/dashboard/settings")||pathname.startsWith("/dashboard/profile");
  const active:DashboardNavId|null=onAccount?null:meta.active;
  const businessContext=hasBusinessMembershipHint(customer);
  const companyLabel=customer.organizationLegalName?.trim()||"Company";
  const personLabel=`${customer.givenName} ${customer.familyName}`.trim();
  const identityPrimary=accountScope==="BUSINESS"&&businessContext?companyLabel:personLabel;
  const identitySecondary=accountScope==="BUSINESS"&&businessContext?`${personLabel} · Company`:"Personal account";
  const setupHref=accountSetupHref(customer.accountType,accountScope);

  useEffect(()=>{
    const query=window.matchMedia(mobileQuery);
    const resized=()=>{if(!query.matches)setMenuOpen(false);};
    query.addEventListener("change",resized);
    return()=>query.removeEventListener("change",resized);
  },[]);

  useEffect(()=>{
    if(!drawerOpen)return;
    const sidebar=sidebarRef.current;
    const opener=menuButtonRef.current;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    sidebar?.querySelector<HTMLButtonElement>('button[aria-label="Close navigation"]')?.focus();
    function contain(event:KeyboardEvent){
      if(event.key==="Escape"){event.preventDefault();setMenuOpen(false);return;}
      if(event.key!=="Tab")return;
      const controls=Array.from(sidebar?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex="0"]')??[]);
      const first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
    document.addEventListener("keydown",contain);
    return()=>{document.body.style.overflow=previousOverflow;document.removeEventListener("keydown",contain);opener?.focus();};
  },[drawerOpen]);

  return <DashboardCustomerProvider customer={customer} setup={setup} accountScope={accountScope} canMutateFinances={canMutateFinances}>
    <main className={`dashboard-shell${drawerOpen?" menu-open":""}`}>
      <button className="dashboard-scrim" type="button" aria-label="Dismiss navigation" tabIndex={-1} hidden={!drawerOpen} onClick={()=>setMenuOpen(false)}/>

      <aside ref={sidebarRef} className="dashboard-sidebar" id="dashboard-sidebar" aria-label="Dashboard navigation" role={drawerOpen?"dialog":undefined} aria-modal={drawerOpen?true:undefined} inert={mobile&&!drawerOpen}>
        <div className="dashboard-sidebar-brand">
          <Link href="/dashboard" aria-label="StrivePay dashboard">
            <Image src="/branding/strivepay-logo-dark.svg" width={148} height={36} alt="StrivePay" priority/>
          </Link>
          <button type="button" aria-label="Close navigation" onClick={()=>setMenuOpen(false)}><IconX size={22}/></button>
        </div>

        <div className="dashboard-sidebar-identity">
          <DashboardProfileMenu
            customer={customer}
            accountScope={accountScope}
            variant="identity"
            primary={identityPrimary}
            secondary={identitySecondary}
          />
        </div>

        <nav className="dashboard-primary-nav" aria-label="Primary">
          {primaryItems.map(item=>{
            const Icon=item.icon;
            const current=active===item.id;
            return <Link
              key={item.id}
              className={`dashboard-nav-item${current?" active":""}`}
              href={item.href}
              aria-current={current?"page":undefined}
              onClick={()=>setMenuOpen(false)}
            >
              <Icon size={18} stroke={1.75}/><span>{item.label}</span>{item.id==="support"?<SupportUnreadBadge key={accountScope} scope={accountScope}/>:null}
            </Link>;
          })}
        </nav>

        <nav className="dashboard-system-nav" aria-label="Account">
          <Link href={setupHref} onClick={()=>setMenuOpen(false)}><IconShieldCheck size={18} stroke={1.75}/><span>Account setup</span></Link>
          <Link
            href="/dashboard/settings"
            className={pathname.startsWith("/dashboard/settings")||pathname.startsWith("/dashboard/profile")?" active":undefined}
            aria-current={onAccount?"page":undefined}
            onClick={()=>setMenuOpen(false)}
          >
            <IconSettings size={18} stroke={1.75}/><span>Settings</span>
          </Link>
        </nav>

        <SidebarPromotion setup={setup} setupHref={setupHref} onNavigate={()=>setMenuOpen(false)}/>
      </aside>

      <section className="dashboard-workspace" inert={drawerOpen}>
        <header className="dashboard-header">
          <button
            className="dashboard-menu-button"
            ref={menuButtonRef}
            type="button"
            aria-label="Open navigation"
            aria-controls="dashboard-sidebar"
            aria-expanded={drawerOpen}
            onClick={()=>setMenuOpen(true)}
            suppressHydrationWarning
          >
            <IconMenu2 size={23}/>
          </button>

          <div className="dashboard-page-title">
            <h1>{meta.title}</h1>
          </div>

          <div className="dashboard-header-actions">
            <NotificationDrawer/>
            <Link className="dashboard-support-button" href="/dashboard/support" aria-label="Open support" title="Support"><IconMessageCircle size={21} aria-hidden="true"/></Link>
            <DashboardProfileMenu customer={customer} accountScope={accountScope}/>
          </div>
        </header>

        {crumbs.length>1?<nav className="dashboard-breadcrumb" aria-label="Breadcrumb">
          <ol>
            {crumbs.map((crumb,index)=><li key={`${crumb.label}-${index}`}>
              {index>0?<IconChevronRight size={14} aria-hidden="true"/>:null}
              {crumb.href?<Link href={crumb.href}>{crumb.label}</Link>:<span aria-current="page">{crumb.label}</span>}
            </li>)}
          </ol>
        </nav>:null}

        {!setup?<div className="dashboard-setup-unavailable" role="status"><div><strong>Setup status unavailable</strong><p>We couldn’t confirm your setup. Your history is still available.</p></div><button type="button" className="compliance-secondary" onClick={()=>router.refresh()}>Try again</button></div>:null}
        {children}
      </section>
    </main>
    <TwoFactorReminder key={customer.email}/>
  </DashboardCustomerProvider>;
}
