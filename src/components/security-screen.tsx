"use client";

import {FormEvent,useCallback,useEffect,useRef,useState} from "react";
import Image from "next/image";
import {IconDevices,IconKey,IconLoader2,IconLock,IconShieldCheck,IconShieldOff} from "@tabler/icons-react";
import QRCode from "qrcode";
import {SettingsRow} from "@/components/account-page";
import {useToast} from "@/components/ui/toast";
import {registerSchema} from "@/lib/auth-access";
import {
  authApi,
  filterSessions,
  formatSessionStatus,
  formatSessionTime,
  sessionLabel,
  sessionStatus,
  sessionStatusClass,
  signOut,
  type AuthSession,
  type SessionFilter,
} from "@/lib/customer-auth";
import "./security-settings.css";

type TotpStatus={enabled:boolean};
type TotpSetup={enabled:boolean;secret:string;otpAuthUri:string};

async function readAuthenticator(){
  const status=await authApi<TotpStatus>("/2fa");
  if(typeof status?.enabled!=="boolean")throw new Error("Authenticator status is unavailable");
  return status;
}

async function readSessions(){
  const sessions=await authApi<AuthSession[]>("/sessions");
  if(!Array.isArray(sessions))throw new Error("Sessions are unavailable");
  return sessions;
}

function useSecurityResource<T>(read:()=>Promise<T>){
  const [resource,setResource]=useState<{state:"loading"|"ready"|"error";data:T|null}>({state:"loading",data:null});
  const request=useRef(0);
  const load=useCallback(()=>{
    const current=++request.current;
    return read().then(data=>{
      if(current===request.current)setResource({state:"ready",data});
    },()=>{
      if(current===request.current)setResource({state:"error",data:null});
    });
  },[read]);
  useEffect(()=>{void load();return ()=>{request.current+=1;};},[load]);
  const reload=useCallback(()=>{setResource({state:"loading",data:null});return load();},[load]);
  const setData=useCallback((data:T)=>setResource({state:"ready",data}),[]);
  return {...resource,reload,setData};
}

function SecurityLoadState({loading,message,onRetry}:{loading:boolean;message:string;onRetry:()=>void}){
  return <div className="security-load-state">
    <p role="status">{loading?<IconLoader2 className="spin" size={17} aria-hidden="true"/>:null}{message}</p>
    {!loading?<button className="compliance-secondary" type="button" onClick={onRetry}>Retry</button>:null}
  </div>;
}

export function SecurityScreen(){
  const authenticator=useSecurityResource(readAuthenticator);
  const sessions=useSecurityResource(readSessions);
  const sessionCount=sessions.data?filterSessions(sessions.data,"ACTIVE").length:null;
  const unavailable=authenticator.state==="error"||sessions.state==="error";

  return <section className="dashboard-canvas dashboard-route-page buy-workspace account-workspace security-settings" aria-labelledby="security-page-title">
    <header className="buy-toolbar">
      <p id="security-page-title">Password, authenticator, and signed-in devices.</p>
    </header>
    <section className="buy-soft-section" aria-labelledby="security-links-title">
      <header className="buy-soft-head">
        <div>
          <h2 id="security-links-title">Security</h2>
          <p>Choose what you want to change.</p>
        </div>
      </header>
      <div className="account-settings-list" role="list">
        <SettingsRow
          href="/dashboard/settings/security/password"
          icon={<IconLock size={18}/>}
          title="Change password"
          detail="Update your password and sign in again"
        />
        <SettingsRow
          href="/dashboard/settings/security/authenticator"
          icon={<IconKey size={18}/>}
          title="Authenticator"
          detail={authenticator.state==="loading"?"Checking authenticator…":authenticator.state==="error"?"Status unavailable":authenticator.data?.enabled?"Enabled · 6-digit code at login":"Off · Add an authenticator app"}
        />
        <SettingsRow
          href="/dashboard/settings/security/sessions"
          icon={<IconDevices size={18}/>}
          title="Signed-in devices"
          detail={sessions.state==="loading"?"Loading sessions…":sessions.state==="error"?"Sessions unavailable":`${sessionCount} active session${sessionCount===1?"":"s"}`}
        />
      </div>
      {unavailable?<SecurityLoadState loading={false} message="Some security details could not be loaded." onRetry={()=>{if(authenticator.state==="error")void authenticator.reload();if(sessions.state==="error")void sessions.reload();}}/>:null}
    </section>
  </section>;
}

export function SecurityPasswordScreen(){
  const {show}=useToast();
  const error=useCallback((message:string)=>show({tone:"danger",title:"Check this step",message}),[show]);
  const success=useCallback((message:string)=>show({tone:"success",title:"Saved",message}),[show]);
  const [currentPassword,setCurrentPassword]=useState("");
  const [newPassword,setNewPassword]=useState("");
  const [confirmation,setConfirmation]=useState("");
  const [busy,setBusy]=useState(false);
  const [fieldErrors,setFieldErrors]=useState<Partial<Record<"currentPassword"|"newPassword"|"confirmation",string>>>({});

  async function changePassword(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const errors:typeof fieldErrors={};
    if(!currentPassword)errors.currentPassword="Enter your current password.";
    const passwordResult=registerSchema.shape.password.safeParse(newPassword);
    if(!passwordResult.success)errors.newPassword=passwordResult.error.issues[0]?.message??"Check the new password requirements.";
    if(!confirmation)errors.confirmation="Confirm your new password.";
    else if(newPassword!==confirmation)errors.confirmation="The passwords do not match.";
    setFieldErrors(errors);
    const first=Object.keys(errors)[0] as keyof typeof fieldErrors|undefined;
    if(first){
      error(errors[first]!);
      (event.currentTarget.elements.namedItem(first) as HTMLInputElement|null)?.focus();
      return;
    }
    setBusy(true);
    try{
      await authApi("/password/change",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({currentPassword,newPassword}),
      });
      success("Password updated. Sign in again with the new password.");
      await signOut();
    }catch(problem){
      error(problem instanceof Error?problem.message:"The password could not be changed");
    }finally{
      setBusy(false);
    }
  }

  return <section className="dashboard-canvas dashboard-route-page buy-workspace account-workspace security-settings" aria-labelledby="password-page-title">
    <header className="buy-toolbar">
      <p id="password-page-title">Changing it signs you out so you can continue with the new password.</p>
    </header>
    <section className="activity-soft" aria-labelledby="password-title">
      <header className="buy-soft-head">
        <div>
          <span className="overview-kicker">Access</span>
          <h2 id="password-title">Change password</h2>
          <p>Enter your current password, then choose a new one.</p>
        </div>
      </header>
      <form className="account-password-form" onSubmit={event=>void changePassword(event)} noValidate>
        <label>
          <span id="current-password-label">Current password</span>
          <input name="currentPassword" aria-labelledby="current-password-label" type="password" autoComplete="current-password" value={currentPassword} onChange={event=>{setCurrentPassword(event.target.value);setFieldErrors(previous=>({...previous,currentPassword:undefined}));}} aria-invalid={Boolean(fieldErrors.currentPassword)} aria-describedby={fieldErrors.currentPassword?"current-password-error":undefined} disabled={busy} required/>
          {fieldErrors.currentPassword?<small className="security-field-error" id="current-password-error">{fieldErrors.currentPassword}</small>:null}
        </label>
        <label>
          <span id="new-password-label">New password</span>
          <input name="newPassword" aria-labelledby="new-password-label" type="password" autoComplete="new-password" value={newPassword} onChange={event=>{setNewPassword(event.target.value);setFieldErrors(previous=>({...previous,newPassword:undefined,confirmation:undefined}));}} aria-invalid={Boolean(fieldErrors.newPassword)} aria-describedby={`new-password-hint${fieldErrors.newPassword?" new-password-error":""}`} disabled={busy} required minLength={12}/>
          <small className="security-field-hint" id="new-password-hint">At least 12 characters, including uppercase, lowercase and a number.</small>
          {fieldErrors.newPassword?<small className="security-field-error" id="new-password-error">{fieldErrors.newPassword}</small>:null}
        </label>
        <label>
          <span id="confirmation-label">Confirm new password</span>
          <input name="confirmation" aria-labelledby="confirmation-label" type="password" autoComplete="new-password" value={confirmation} onChange={event=>{setConfirmation(event.target.value);setFieldErrors(previous=>({...previous,confirmation:undefined}));}} aria-invalid={Boolean(fieldErrors.confirmation)} aria-describedby={fieldErrors.confirmation?"confirmation-error":undefined} disabled={busy} required minLength={12}/>
          {fieldErrors.confirmation?<small className="security-field-error" id="confirmation-error">{fieldErrors.confirmation}</small>:null}
        </label>
        <button className="compliance-primary" type="submit" disabled={busy}>
          {busy?<IconLoader2 className="spin" size={17}/>:null}Update password
        </button>
      </form>
    </section>
  </section>;
}

export function SecurityAuthenticatorScreen(){
  const {show}=useToast();
  const error=useCallback((message:string)=>show({tone:"danger",title:"Check this step",message}),[show]);
  const success=useCallback((message:string)=>show({tone:"success",title:"Saved",message}),[show]);
  const {data:totp,state:totpState,reload:loadTotp,setData:setTotp}=useSecurityResource(readAuthenticator);
  const [setup,setSetup]=useState<TotpSetup|null>(null);
  const [qrDataUri,setQrDataUri]=useState("");
  const [appCode,setAppCode]=useState("");
  const [disablePassword,setDisablePassword]=useState("");
  const [disableCode,setDisableCode]=useState("");
  const [busy,setBusy]=useState(false);
  const [appCodeError,setAppCodeError]=useState("");
  const [disableErrors,setDisableErrors]=useState<{password?:string;code?:string}>({});

  async function startAuthenticator(){
    setBusy(true);
    try{
      const next=await authApi<TotpSetup>("/2fa/setup",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
      setSetup(next);
      setAppCode("");
      setQrDataUri(await QRCode.toDataURL(next.otpAuthUri,{margin:1,width:180}));
      setTotp({enabled:false});
      success("Scan the QR code, then enter a fresh authenticator code.");
    }catch(problem){
      error(problem instanceof Error?problem.message:"Authenticator setup could not start");
    }finally{
      setBusy(false);
    }
  }

  async function confirmAuthenticator(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(appCode.length!==6){
      const message="Enter the 6-digit authenticator code.";
      setAppCodeError(message);error(message);
      (event.currentTarget.elements.namedItem("appCode") as HTMLInputElement|null)?.focus();
      return;
    }
    setAppCodeError("");
    setBusy(true);
    try{
      const next=await authApi<TotpStatus>("/2fa/enable",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:appCode})});
      setTotp(next);
      setSetup(null);
      setQrDataUri("");
      setAppCode("");
      success("Authenticator enabled. Sign-in will ask for a code next time.");
    }catch(problem){
      error(problem instanceof Error?problem.message:"That authenticator code was not accepted");
    }finally{
      setBusy(false);
    }
  }

  async function disableAuthenticator(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const errors:typeof disableErrors={};
    if(!disablePassword)errors.password="Enter your current password.";
    if(disableCode.length!==6)errors.code="Enter the 6-digit authenticator code.";
    setDisableErrors(errors);
    const first=errors.password?"password":errors.code?"code":null;
    if(first){error(errors[first]!);(event.currentTarget.elements.namedItem(first) as HTMLInputElement|null)?.focus();return;}
    setBusy(true);
    try{
      const next=await authApi<TotpStatus>("/2fa/disable",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:disablePassword,code:disableCode})});
      setTotp(next);
      setDisablePassword("");
      setDisableCode("");
      setSetup(null);
      success("Authenticator disabled for this account.");
    }catch(problem){
      error(problem instanceof Error?problem.message:"Authenticator could not be disabled");
    }finally{
      setBusy(false);
    }
  }

  return <section className="dashboard-canvas dashboard-route-page buy-workspace account-workspace security-settings" aria-labelledby="authenticator-page-title">
    <header className="buy-toolbar">
      <p id="authenticator-page-title">When enabled, login asks for a 6-digit code after your password.</p>
    </header>
    <section className="activity-soft" aria-labelledby="2fa-title">
      <header className="buy-soft-head">
        <div>
          <span className="overview-kicker">Sign-in</span>
          <h2 id="2fa-title">Authenticator app</h2>
          <p>Use Google Authenticator, 1Password, or any TOTP app.</p>
        </div>
        <span className={`sell-destination-status${totp?.enabled?" ready":""}`}>
          {totpState==="loading"?"Checking…":totpState==="error"?"Unavailable":totp?.enabled?<><IconShieldCheck size={14}/> Enabled</>:<><IconShieldOff size={14}/> Off</>}
        </span>
      </header>

      {totpState!=="ready"?<SecurityLoadState loading={totpState==="loading"} message={totpState==="loading"?"Checking authenticator status…":"Authenticator status could not be loaded."} onRetry={()=>void loadTotp()}/>:null}

      {totp?.enabled===false&&!setup?<div className="account-security-actions">
        <button className="compliance-primary" type="button" disabled={busy} onClick={()=>void startAuthenticator()}>
          {busy?<IconLoader2 className="spin" size={17}/>:null}Enable authenticator
        </button>
      </div>:null}

      {setup?<div className="account-totp-setup">
        {qrDataUri?<Image className="account-totp-qr" src={qrDataUri} alt="Authenticator QR code" width={180} height={180} unoptimized/>:null}
        <p className="account-totp-secret">Manual key: <code>{setup.secret}</code></p>
        <form className="account-password-form" onSubmit={event=>void confirmAuthenticator(event)} noValidate>
          <label>
            <span id="enable-code-label">Authenticator code</span>
            <input name="appCode" aria-labelledby="enable-code-label" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={appCode} onChange={event=>{setAppCode(event.target.value.replace(/\D/g,"").slice(0,6));setAppCodeError("");}} placeholder="123456" aria-invalid={Boolean(appCodeError)} aria-describedby={appCodeError?"enable-code-error":undefined} disabled={busy} required/>
            {appCodeError?<small className="security-field-error" id="enable-code-error">{appCodeError}</small>:null}
          </label>
          <button className="compliance-primary" type="submit" disabled={busy}>
            {busy?<IconLoader2 className="spin" size={17}/>:null}Confirm and enable
          </button>
        </form>
      </div>:null}

      {totp?.enabled?<form className="account-password-form" onSubmit={event=>void disableAuthenticator(event)} noValidate>
        <label>
          <span id="disable-password-label">Current password</span>
          <input name="password" aria-labelledby="disable-password-label" type="password" autoComplete="current-password" value={disablePassword} onChange={event=>{setDisablePassword(event.target.value);setDisableErrors(previous=>({...previous,password:undefined}));}} aria-invalid={Boolean(disableErrors.password)} aria-describedby={disableErrors.password?"disable-password-error":undefined} disabled={busy} required/>
          {disableErrors.password?<small className="security-field-error" id="disable-password-error">{disableErrors.password}</small>:null}
        </label>
        <label>
          <span id="disable-code-label">Authenticator code</span>
          <input name="code" aria-labelledby="disable-code-label" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={disableCode} onChange={event=>{setDisableCode(event.target.value.replace(/\D/g,"").slice(0,6));setDisableErrors(previous=>({...previous,code:undefined}));}} placeholder="123456" aria-invalid={Boolean(disableErrors.code)} aria-describedby={disableErrors.code?"disable-code-error":undefined} disabled={busy} required/>
          {disableErrors.code?<small className="security-field-error" id="disable-code-error">{disableErrors.code}</small>:null}
        </label>
        <button className="compliance-secondary" type="submit" disabled={busy}>
          {busy?<IconLoader2 className="spin" size={17}/>:null}Disable authenticator
        </button>
      </form>:null}
    </section>
  </section>;
}

export function SecuritySessionsScreen(){
  const {show}=useToast();
  const error=useCallback((message:string)=>show({tone:"danger",title:"Check this step",message}),[show]);
  const success=useCallback((message:string)=>show({tone:"success",title:"Saved",message}),[show]);
  const {data,state,reload:loadSessions}=useSecurityResource(readSessions);
  const sessions=data??[];
  const [revoking,setRevoking]=useState("");
  const [signingOutAll,setSigningOutAll]=useState(false);
  const [filter,setFilter]=useState<SessionFilter>("ACTIVE");

  const rows=filterSessions(sessions,filter);
  const activeCount=filterSessions(sessions,"ACTIVE").length;
  const endedCount=filterSessions(sessions,"ENDED").length;

  async function revoke(sessionId:string){
    setRevoking(sessionId);
    try{
      await authApi(`/sessions/${sessionId}`,{method:"DELETE"});
      success("Session revoked.");
      await loadSessions();
    }catch(problem){
      error(problem instanceof Error?problem.message:"That session could not be revoked");
    }finally{
      setRevoking("");
    }
  }

  async function signOutEverywhere(){
    setSigningOutAll(true);
    try{
      await authApi("/logout-all",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
      success("Signed out everywhere. Sign in again to continue.");
      await signOut();
    }catch(problem){
      error(problem instanceof Error?problem.message:"Could not sign out of all devices");
      setSigningOutAll(false);
    }
  }

  return <section className="dashboard-canvas dashboard-route-page buy-workspace account-workspace activity-workspace security-settings" aria-labelledby="sessions-page-title">
    <header className="buy-toolbar">
      <div>
        <p id="sessions-page-title">Revoke a device you no longer use. Use Sign out to end this browser session.</p>
        <p className="sell-toolbar-hint">A new sign-in ends other open sessions.</p>
      </div>
      {activeCount>1?<button type="button" className="compliance-secondary buy-toolbar-action" disabled={signingOutAll} onClick={()=>void signOutEverywhere()}>
        {signingOutAll?<IconLoader2 className="spin" size={15}/>:null}Sign out everywhere
      </button>:null}
    </header>

    <form className="activity-filters" onSubmit={event=>event.preventDefault()} aria-label="Filter sessions">
      <label>
        <span>Status</span>
        <select value={filter} onChange={event=>setFilter(event.target.value as SessionFilter)} aria-label="Filter by status" disabled={state!=="ready"}>
          <option value="ACTIVE">Active</option>
          <option value="ENDED">Ended</option>
          <option value="ALL">All</option>
        </select>
      </label>
      {filter!=="ACTIVE"?<button type="button" className="activity-filter-clear" onClick={()=>setFilter("ACTIVE")}>Show active</button>:null}
    </form>

    {state!=="ready"?<SecurityLoadState loading={state==="loading"} message={state==="loading"?"Loading sessions…":"Your signed-in devices could not be loaded."} onRetry={()=>void loadSessions()}/>
      :rows.length===0?<p className="account-empty">{!sessions.length?"No sessions found.":filter==="ACTIVE"?`No active sessions.${endedCount?` ${endedCount} ended session${endedCount===1?"":"s"} under Ended.`:""}`:"No sessions match this filter."}</p>
      :<section className="activity-panel" aria-labelledby="sessions-title">
        <div className="activity-list-meta">
          <p id="sessions-title">Showing {rows.length} session{rows.length===1?"":"s"}{filter==="ACTIVE"?` · ${activeCount} active`:filter==="ENDED"?" ended":""}</p>
        </div>
        <ul className="activity-list session-history-list">
          {rows.map(session=>{
            const status=sessionStatus(session);
            return <li key={session.id}>
              <div className="activity-item session-history-item">
                <div className="activity-item-lead">
                  <span className="activity-direction">{sessionLabel(session)}{session.current?" · This device":""}</span>
                  <span className={`activity-status ${sessionStatusClass(status)}`}>{formatSessionStatus(status)}</span>
                </div>
                <div className="activity-item-amounts session-history-detail">
                  <span><small>IP</small>{session.ipAddress||"Unknown"}</span>
                  <span><small>Last seen</small>{formatSessionTime(session.lastSeenAt)}</span>
                </div>
                <div className="activity-item-meta session-history-actions">
                  {status==="ACTIVE"&&!session.current?<button type="button" className="session-revoke" disabled={revoking===session.id} onClick={()=>void revoke(session.id)}>
                    {revoking===session.id?<IconLoader2 className="spin" size={14}/>:null}Revoke
                  </button>:status==="ACTIVE"?<span className="session-current-note">Current</span>:<time dateTime={session.revokedAt||session.expiresAt}>{formatSessionTime(session.revokedAt||session.expiresAt)}</time>}
                </div>
              </div>
            </li>;
          })}
        </ul>
      </section>}
  </section>;
}
