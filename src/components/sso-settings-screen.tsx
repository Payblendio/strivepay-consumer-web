"use client";

import {FormEvent,useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {useRouter,useSearchParams} from "next/navigation";
import {IconArrowLeft,IconArrowRight,IconCheck,IconCopy,IconExternalLink,IconKey,IconLoader2,IconShieldCheck} from "@tabler/icons-react";
import {useDashboardCustomer} from "@/components/dashboard-customer";
import {useToast} from "@/components/ui/toast";
import {
  activateSso,
  disableSso,
  getSsoConfiguration,
  getSsoServiceProvider,
  importSsoMetadata,
  listSsoPresets,
  publicSsoLoginUrl,
  startSsoConnectionTest,
  testSsoConnection,
  type SsoConfiguration,
  type SsoProviderPreset,
  type SsoServiceProvider,
} from "@/lib/sso-api";
import {confirmAction} from "@/lib/swal";

function canManage(role?:string|null){
  return role==="OWNER"||role==="ADMINISTRATOR";
}

function initialStep(config:SsoConfiguration|null){
  if(!config)return 1;
  if(config.status==="ACTIVE"||config.status==="TESTED")return 4;
  if(config.status==="DRAFT"||config.status==="DISABLED")return 3;
  return 2;
}

export function SsoSettingsScreen(){
  const customer=useDashboardCustomer();
  const router=useRouter();
  const params=useSearchParams();
  const {show}=useToast();
  const manage=canManage(customer.membershipRole);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState("");
  const [step,setStep]=useState(1);
  const [presets,setPresets]=useState<SsoProviderPreset[]>([]);
  const [serviceProvider,setServiceProvider]=useState<SsoServiceProvider|null>(null);
  const [config,setConfig]=useState<SsoConfiguration|null>(null);
  const [providerType,setProviderType]=useState("GENERIC_SAML");
  const [metadataXml,setMetadataXml]=useState("");
  const [metadataUrl,setMetadataUrl]=useState("");
  const [allowedEmailDomain,setAllowedEmailDomain]=useState("");
  const [jitProvisioning,setJitProvisioning]=useState(true);
  const [samlResponse,setSamlResponse]=useState("");
  const [organizationId,setOrganizationId]=useState("");
  const [showManualTest,setShowManualTest]=useState(false);

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const [nextPresets,nextServiceProvider]=await Promise.all([listSsoPresets(),getSsoServiceProvider()]);
      setPresets(Array.isArray(nextPresets)?nextPresets:[]);
      setServiceProvider(nextServiceProvider);
      const match=nextServiceProvider.entityId.match(/\/sso\/([0-9a-fA-F-]{36})\//);
      if(match)setOrganizationId(match[1]);
      try{
        const next=await getSsoConfiguration();
        setConfig(next);
        setStep(initialStep(next));
        if(next.providerType)setProviderType(next.providerType);
        if(next.allowedEmailDomain)setAllowedEmailDomain(next.allowedEmailDomain);
        setJitProvisioning(Boolean(next.jitProvisioning));
        const entityMatch=next.serviceProviderEntityId?.match(/\/sso\/([0-9a-fA-F-]{36})\//);
        if(entityMatch)setOrganizationId(entityMatch[1]);
      }catch(problem){
        const status=typeof problem==="object"&&problem&&"status" in problem?Number((problem as {status:number}).status):0;
        const message=problem instanceof Error?problem.message:"";
        if(status===404||status===400||/not configured/i.test(message)){
          setConfig(null);
          setStep(1);
        }else throw problem;
      }
    }catch(problem){
      show({tone:"danger",title:"SSO unavailable",message:problem instanceof Error?problem.message:"Company SSO could not be loaded."});
    }finally{
      setLoading(false);
    }
  },[show]);

  useEffect(()=>{
    if(customer.accountType!=="BUSINESS"&&!customer.hasBusinessMembership){
      router.replace("/dashboard/settings");
      return;
    }
    void load();
  },[customer.accountType,customer.hasBusinessMembership,load,router]);

  useEffect(()=>{
    if(params.get("ssoTest")!=="passed")return;
    show({tone:"success",title:"Connection tested",message:"Administrator sign-in verified. You can activate SSO now."});
    setStep(4);
    void load();
    router.replace("/dashboard/settings/sso");
  },[params,show,load,router]);

  async function onStartIdpTest(){
    if(!manage||busy)return;
    setBusy("testidp");
    try{
      const started=await startSsoConnectionTest();
      if(!started.redirectUrl)throw new Error("Identity provider redirect was not returned.");
      window.location.assign(started.redirectUrl);
    }catch(problem){
      show({tone:"danger",title:"Test could not start",message:problem instanceof Error?problem.message:"Could not open your identity provider."});
      setBusy("");
    }
  }

  async function onImport(event:FormEvent){
    event.preventDefault();
    if(!manage||busy)return;
    const xml=metadataXml.trim();
    const url=metadataUrl.trim();
    if((!xml&&!url)||(xml&&url)){
      show({tone:"warning",title:"Metadata required",message:"Provide exactly one of metadata XML or an HTTPS metadata URL."});
      return;
    }
    setBusy("import");
    try{
      const next=await importSsoMetadata({
        metadataXml:xml||null,
        metadataUrl:url||null,
        allowedEmailDomain:allowedEmailDomain.trim()||null,
        jitProvisioning,
        providerType,
      });
      setConfig(next);
      setMetadataXml("");
      setMetadataUrl("");
      const match=next.serviceProviderEntityId?.match(/\/sso\/([0-9a-fA-F-]{36})\//);
      if(match)setOrganizationId(match[1]);
      show({tone:"success",title:"Connection saved",message:"Metadata imported. Continue to verify an administrator sign-in."});
      setStep(3);
    }catch(problem){
      show({tone:"danger",title:"Import failed",message:problem instanceof Error?problem.message:"Metadata could not be imported."});
    }finally{
      setBusy("");
    }
  }

  async function onTest(event:FormEvent){
    event.preventDefault();
    if(!manage||busy)return;
    const encoded=samlResponse.trim();
    if(!encoded){
      show({tone:"warning",title:"SAML response required",message:"Paste a base64 SAMLResponse for your signed-in admin email."});
      return;
    }
    setBusy("test");
    try{
      const result=await testSsoConnection(encoded);
      setConfig(result.configuration);
      setSamlResponse("");
      show({tone:"success",title:"Connection tested",message:`Accepted assertion for ${result.email}. You can activate SSO now.`});
      setStep(4);
    }catch(problem){
      show({tone:"danger",title:"Test failed",message:problem instanceof Error?problem.message:"The SAML response was rejected."});
    }finally{
      setBusy("");
    }
  }

  async function onActivate(){
    if(!manage||busy)return;
    setBusy("activate");
    try{
      const next=await activateSso();
      setConfig(next);
      show({tone:"success",title:"SSO active",message:"Company members can sign in with your identity provider."});
    }catch(problem){
      show({tone:"danger",title:"Activate failed",message:problem instanceof Error?problem.message:"SSO could not be activated."});
    }finally{
      setBusy("");
    }
  }

  async function onDisable(){
    if(!manage||busy)return;
    const ok=await confirmAction({
      title:"Disable company SSO?",
      text:"Members will need another way to sign in. Active SSO sessions are revoked.",
      confirmLabel:"Disable SSO",
    });
    if(!ok)return;
    setBusy("disable");
    try{
      await disableSso();
      setConfig(current=>current?{...current,status:"DISABLED"}:current);
      show({tone:"success",title:"SSO disabled",message:"Company SSO is turned off."});
      setStep(2);
    }catch(problem){
      show({tone:"danger",title:"Disable failed",message:problem instanceof Error?problem.message:"SSO could not be disabled."});
    }finally{
      setBusy("");
    }
  }

  async function copy(label:string,value:string){
    try{
      await navigator.clipboard.writeText(value);
      show({tone:"success",title:"Copied",message:`${label} copied to clipboard.`});
    }catch{
      show({tone:"warning",title:"Copy failed",message:"Select the field and copy manually."});
    }
  }

  const loginUrl=organizationId?publicSsoLoginUrl(organizationId):"";
  const selectedPreset=presets.find(item=>item.code===providerType)??null;
  const providerOptions=presets.length?presets:[{code:"GENERIC_SAML",displayName:"Generic SAML 2.0",metadataInstructions:""}];

  function providerLabel(code?:string|null){
    if(!code)return "SAML 2.0";
    return presets.find(item=>item.code===code)?.displayName
      ?? code.replaceAll("_"," ").replace(/\b\w/g,char=>char.toUpperCase());
  }

  const configured=Boolean(config);
  const tested=config?.status==="TESTED"||config?.status==="ACTIVE";
  const active=config?.status==="ACTIVE";
  const maxReachable=active||tested?4:configured?3:2;

  function goTo(next:number){
    if(next<1||next>4)return;
    if(next>maxReachable){
      show({tone:"warning",title:"Finish this step first",message:next===3?"Save IdP metadata before testing.":"Pass the administrator sign-in test before activation."});
      return;
    }
    setStep(next);
  }

  return <section className="dashboard-canvas dashboard-route-page account-workspace sso-workspace" aria-labelledby="sso-page-title">
    <header className="sso-page-header">
      <div>
        <span className="overview-kicker">Company access</span>
        <h1 id="sso-page-title">Single sign-on</h1>
        <p>Connect a SAML 2.0 identity provider, verify an administrator assertion, then activate sign-in for members.</p>
      </div>
      <span className={`sso-status-badge ${active?"active":tested?"tested":configured?"draft":"idle"}`}>
        {active?"Active":tested?"Tested":configured?"Draft":"Not configured"}
      </span>
    </header>

    {loading?(
      <div className="compliance-loading"><IconLoader2 className="spin"/> Loading SSO…</div>
    ):!serviceProvider?(
      <div className="accounts-load-error" role="alert"><div><strong>SSO setup could not be loaded</strong><p>Refresh to retrieve your company service-provider details.</p></div><button className="compliance-secondary" type="button" onClick={()=>void load()}>Try again</button></div>
    ):(
      <>
        <ol className="sso-progress" aria-label="SSO setup progress">
          <ProgressStep number="1" label="Create app" complete={configured||step>1} current={step===1} onSelect={()=>goTo(1)}/>
          <ProgressStep number="2" label="Connect IdP" complete={configured} current={step===2} onSelect={()=>goTo(2)}/>
          <ProgressStep number="3" label="Test sign-in" complete={tested} current={step===3} onSelect={()=>goTo(3)} disabled={maxReachable<3}/>
          <ProgressStep number="4" label="Activate" complete={active} current={step===4} onSelect={()=>goTo(4)} disabled={maxReachable<4}/>
        </ol>

        {step===1?(
          <section className="sso-step-section" aria-labelledby="sso-provider-title">
            <StepHeader number="01" eyebrow="Identity provider" title="Create the SAML application" id="sso-provider-title"
              copy="Choose your provider, then enter these StrivePay values in a new SAML 2.0 application." complete={configured||step>1}/>
            <div className="sso-step-body">
              <label className="sso-field">
                <span>Identity provider</span>
                <select value={providerType} onChange={event=>setProviderType(event.target.value)} disabled={Boolean(busy)||!manage}>
                  {providerOptions.map(item=><option key={item.code} value={item.code}>{item.displayName}</option>)}
                </select>
              </label>
              <div className="sso-detail-list" role="list">
                <CopyRow label="Single sign-on URL / ACS URL" value={serviceProvider.assertionConsumerUrl} onCopy={()=>copy("ACS URL",serviceProvider.assertionConsumerUrl)}/>
                <CopyRow label="Audience URI / Entity ID" value={serviceProvider.entityId} onCopy={()=>copy("Entity ID",serviceProvider.entityId)}/>
                <CopyRow label="SP metadata URL" value={serviceProvider.metadataUrl} onCopy={()=>copy("SP metadata URL",serviceProvider.metadataUrl)}/>
              </div>
              <div className="sso-protocol-notes" aria-label="Required SAML settings">
                <span><b>Binding</b> HTTP POST</span>
                <span><b>Name ID</b> Email address</span>
                <span><b>Assertions</b> Signed</span>
              </div>
              <div className="sso-nav">
                <span className="sso-nav-hint">Create the app in your IdP, then continue.</span>
                <button type="button" className="compliance-primary" onClick={()=>goTo(2)}>
                  Next <IconArrowRight size={16}/>
                </button>
              </div>
            </div>
          </section>
        ):null}

        {step===2?(
          <section className="sso-step-section" aria-labelledby="sso-import-title">
            <StepHeader number="02" eyebrow="Provider connection" title="Import identity-provider metadata" id="sso-import-title"
              copy={selectedPreset?.metadataInstructions||"Import standards-compliant metadata after creating the application in your provider."} complete={configured}/>
            <div className="sso-step-body">
              {manage?<form className="sso-setup-form" onSubmit={onImport}>
                <div className="sso-policy-grid">
                  <label className="sso-field">
                    <span>Allowed company email domain</span>
                    <input value={allowedEmailDomain} onChange={event=>setAllowedEmailDomain(event.target.value)} placeholder="acme.com" disabled={Boolean(busy)} autoComplete="off"/>
                    <small>Recommended. Restricts assertions and email discovery to your company domain.</small>
                  </label>
                  <label className="sso-check sso-policy-check">
                    <input type="checkbox" checked={jitProvisioning} onChange={event=>setJitProvisioning(event.target.checked)} disabled={Boolean(busy)}/>
                    <span><b>Just-in-time provisioning</b><small>Recommended with SSO. Assigned company users join on first sign-in as viewers — no StrivePay password. Turn off only if you invite every member manually.</small></span>
                  </label>
                </div>
                <div className="sso-metadata-choice">
                  <label className="sso-field">
                    <span>Metadata URL (HTTPS)</span>
                    <input value={metadataUrl} onChange={event=>setMetadataUrl(event.target.value)} placeholder="https://idp.example.com/…/metadata" disabled={Boolean(busy)||Boolean(metadataXml.trim())} autoComplete="off"/>
                  </label>
                  <span className="sso-choice-divider">or</span>
                  <label className="sso-field">
                    <span>Identity-provider metadata XML</span>
                    <textarea rows={7} value={metadataXml} onChange={event=>setMetadataXml(event.target.value)} disabled={Boolean(busy)||Boolean(metadataUrl.trim())} placeholder="<EntityDescriptor …>"/>
                  </label>
                </div>
                {config?<div className="sso-connection-summary"><IconCheck size={17}/><span><b>{providerLabel(config.providerType)} metadata connected</b><small>Issuer {config.issuer} · Certificate {config.certificateSha256}</small></span></div>:null}
                <div className="sso-nav">
                  <button type="button" className="compliance-secondary" onClick={()=>goTo(1)} disabled={Boolean(busy)}>
                    <IconArrowLeft size={16}/> Back
                  </button>
                  <div className="sso-nav-actions">
                    <button className="compliance-primary" type="submit" disabled={Boolean(busy)}>
                      {busy==="import"?<IconLoader2 className="spin" size={16}/>:<IconKey size={16}/>}
                      {configured?"Update & continue":"Save & continue"}
                    </button>
                    {configured?(
                      <button type="button" className="compliance-secondary" onClick={()=>goTo(3)} disabled={Boolean(busy)}>
                        Next <IconArrowRight size={16}/>
                      </button>
                    ):null}
                  </div>
                </div>
              </form>:<p className="sso-readonly-note">Only a company owner or administrator can configure SSO.</p>}
            </div>
          </section>
        ):null}

        {step===3?(
          <section className="sso-step-section" aria-labelledby="sso-test-title">
            <StepHeader number="03" eyebrow="Connection test" title="Verify administrator sign-in" id="sso-test-title"
              copy={`Sign in at your identity provider as ${customer.email}. This must pass before activation.`} complete={tested}/>
            <div className="sso-step-body">
              {!configured?<p className="sso-locked-note">Complete steps 1 and 2 before testing the SAML assertion.</p>:active?(
                <div className="sso-connection-summary"><IconCheck size={17}/><span><b>Administrator assertion verified</b><small>SSO is active. Update the provider connection first if you need to run a new test.</small></span></div>
              ):manage?(
                <>
                  <div className="sso-activation-row">
                    <div>
                      <strong>Test with your identity provider</strong>
                      <p>Opens Okta (or your IdP). Sign in as <b>{customer.email}</b>. You’ll return here when the assertion is accepted — no base64 copy/paste.</p>
                    </div>
                    <button type="button" className="compliance-primary" disabled={Boolean(busy)} onClick={()=>void onStartIdpTest()}>
                      {busy==="testidp"?<IconLoader2 className="spin" size={16}/>:<IconExternalLink size={16}/>}
                      Sign in to verify
                    </button>
                  </div>
                  <button type="button" className="compliance-secondary" onClick={()=>setShowManualTest(value=>!value)}>
                    {showManualTest?"Hide manual paste":"Advanced: paste SAMLResponse"}
                  </button>
                  {showManualTest?(
                    <form className="sso-setup-form" onSubmit={onTest}>
                      <label className="sso-field">
                        <span>Signed SAMLResponse (base64)</span>
                        <textarea rows={6} value={samlResponse} onChange={event=>setSamlResponse(event.target.value)} disabled={Boolean(busy)} placeholder="Paste the base64 SAMLResponse returned by your provider’s test tool"/>
                        <small>Only needed if the one-click IdP test is unavailable.</small>
                      </label>
                      <div className="sso-nav-actions">
                        <button className="compliance-primary" type="submit" disabled={Boolean(busy)}>
                          {busy==="test"?<IconLoader2 className="spin" size={16}/>:<IconShieldCheck size={16}/>}
                          {tested?"Run test again":"Verify pasted response"}
                        </button>
                      </div>
                    </form>
                  ):null}
                  <div className="sso-nav">
                    <button type="button" className="compliance-secondary" onClick={()=>goTo(2)} disabled={Boolean(busy)}>
                      <IconArrowLeft size={16}/> Back
                    </button>
                    {tested?(
                      <button type="button" className="compliance-secondary" onClick={()=>goTo(4)} disabled={Boolean(busy)}>
                        Next <IconArrowRight size={16}/>
                      </button>
                    ):null}
                  </div>
                </>
              ):<p className="sso-readonly-note">An owner or administrator must run the connection test.</p>}
              {!manage||!configured?null:active?(
                <div className="sso-nav">
                  <button type="button" className="compliance-secondary" onClick={()=>goTo(2)}><IconArrowLeft size={16}/> Back</button>
                  <button type="button" className="compliance-primary" onClick={()=>goTo(4)}>Next <IconArrowRight size={16}/></button>
                </div>
              ):null}
            </div>
          </section>
        ):null}

        {step===4?(
          <section className="sso-step-section" aria-labelledby="sso-activate-title">
            <StepHeader number="04" eyebrow="Member access" title="Activate company sign-in" id="sso-activate-title"
              copy="After activation, assigned company users sign in with SSO only — no StrivePay password. With a company domain set, just-in-time provisioning turns on automatically." complete={active}/>
            <div className="sso-step-body">
              {!tested?<p className="sso-locked-note">Pass the administrator sign-in test to unlock activation.</p>:active?(
                <>
                  <div className="sso-active-panel">
                    <IconShieldCheck size={24}/>
                    <div><strong>Company SSO is active</strong><p>Assigned users sign in via <Link href="/auth/sso">Sign in with SSO</Link>{config?.allowedEmailDomain?` (@${config.allowedEmailDomain})`:""} — no StrivePay password required.</p></div>
                  </div>
                  {loginUrl?<div className="sso-detail-list" role="list"><CopyRow label="Direct company sign-in URL" value={loginUrl} onCopy={()=>copy("Company sign-in URL",loginUrl)}/></div>:null}
                  {manage?<div className="sso-actions"><button type="button" className="compliance-secondary" disabled={Boolean(busy)} onClick={()=>void onDisable()}>{busy==="disable"?<IconLoader2 className="spin" size={16}/>:null}Disable SSO</button></div>:null}
                </>
              ):manage?(
                <div className="sso-activation-row">
                  <div><strong>Test passed</strong><p>The signed assertion was accepted. Activate when IdP assignments are ready — members join on first company sign-in without creating a StrivePay password.</p></div>
                  <button type="button" className="compliance-primary" disabled={Boolean(busy)} onClick={()=>void onActivate()}>{busy==="activate"?<IconLoader2 className="spin" size={16}/>:<IconShieldCheck size={16}/>}Activate SSO</button>
                </div>
              ):<p className="sso-readonly-note">An owner or administrator must activate SSO.</p>}
              <div className="sso-nav">
                <button type="button" className="compliance-secondary" onClick={()=>goTo(tested?3:2)} disabled={Boolean(busy)}>
                  <IconArrowLeft size={16}/> Back
                </button>
              </div>
            </div>
          </section>
        ):null}
      </>
    )}
  </section>;
}

function ProgressStep({number,label,complete,current,onSelect,disabled=false}:{number:string;label:string;complete:boolean;current:boolean;onSelect:()=>void;disabled?:boolean}){
  return <li className={complete?"complete":current?"current":disabled?"disabled":""}>
    <button type="button" onClick={onSelect} disabled={disabled} aria-current={current?"step":undefined}>
      <span>{complete?<IconCheck size={14}/>:number}</span>
      <strong>{label}</strong>
    </button>
  </li>;
}

function StepHeader({number,eyebrow,title,id,copy,complete}:{number:string;eyebrow:string;title:string;id:string;copy:string;complete:boolean}){
  return <header className="sso-step-header">
    <span className={`sso-step-number${complete?" complete":""}`}>{complete?<IconCheck size={17}/>:number}</span>
    <div><span className="overview-kicker">{eyebrow}</span><h2 id={id}>{title}</h2><p>{copy}</p></div>
    <b className={complete?"complete":""}>{complete?"Complete":"Required"}</b>
  </header>;
}

function CopyRow({label,value,onCopy}:{label:string;value:string;onCopy:()=>void}){
  return <div className="account-profile-row" role="listitem">
    <dt>{label}</dt>
    <dd className="sso-copy-row">
      <code>{value}</code>
      <button type="button" className="team-remove sso-copy-btn" onClick={onCopy} aria-label={`Copy ${label}`}>
        <IconCopy size={15}/>
      </button>
    </dd>
  </div>;
}
