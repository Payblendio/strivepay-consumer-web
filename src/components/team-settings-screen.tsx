"use client";
import {confirmAction} from "@/lib/swal";

import {FormEvent,useCallback,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {IconLoader2,IconTrash,IconUserPlus} from "@tabler/icons-react";
import {useDashboardCustomer} from "@/components/dashboard-customer";
import {Modal} from "@/components/ui/modal";
import {useToast} from "@/components/ui/toast";
import {
  INVITE_ROLES,
  inviteMember,
  listInvitations,
  listMembers,
  removeMember,
  revokeInvitation,
  roleLabel,
  updateMemberRole,
  type InviteRole,
  type TeamInvitation,
  type TeamMember,
} from "@/lib/team-api";

function canManage(role?:string|null){
  return role==="OWNER"||role==="ADMINISTRATOR";
}

export function TeamSettingsScreen(){
  const customer=useDashboardCustomer();
  const router=useRouter();
  const {show}=useToast();
  const manage=canManage(customer.membershipRole);
  const [loading,setLoading]=useState(true);
  const [members,setMembers]=useState<TeamMember[]>([]);
  const [invites,setInvites]=useState<TeamInvitation[]>([]);
  const [inviteOpen,setInviteOpen]=useState(false);
  const [email,setEmail]=useState("");
  const [role,setRole]=useState<InviteRole>("OPERATOR");
  const [busy,setBusy]=useState("");
  const [inviteLink,setInviteLink]=useState("");

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const nextMembers=await listMembers();
      setMembers(Array.isArray(nextMembers)?nextMembers:[]);
      if(manage){
        const nextInvites=await listInvitations();
        setInvites(Array.isArray(nextInvites)?nextInvites:[]);
      }else setInvites([]);
    }catch(problem){
      show({tone:"danger",title:"Team unavailable",message:problem instanceof Error?problem.message:"Team members could not be loaded."});
    }finally{
      setLoading(false);
    }
  },[manage,show]);

  useEffect(()=>{
    if(customer.accountType!=="BUSINESS"){router.replace("/dashboard/settings");return;}
    void load();
  },[customer.accountType,load,router]);

  const pending=useMemo(()=>invites.filter(item=>item.status==="PENDING"),[invites]);

  function openInvite(){
    setEmail("");
    setRole("OPERATOR");
    setInviteLink("");
    setInviteOpen(true);
  }

  function closeInvite(){
    if(busy==="invite")return;
    setInviteOpen(false);
  }

  async function onInvite(event:FormEvent){
    event.preventDefault();
    if(!manage||busy)return;
    setBusy("invite");
    try{
      const created=await inviteMember(email.trim(),role);
      setEmail("");
      setInviteLink(created.invitationToken?`${window.location.origin}/invite?token=${encodeURIComponent(created.invitationToken)}`:"");
      show({tone:"success",title:"Invitation sent",message:`${created.email} can join as ${roleLabel(created.role)}.`});
      await load();
    }catch(problem){
      show({tone:"danger",title:"Invite failed",message:problem instanceof Error?problem.message:"Could not send invitation."});
    }finally{
      setBusy("");
    }
  }

  async function onRole(personId:string,next:InviteRole){
    if(!manage||busy)return;
    setBusy(`role-${personId}`);
    try{
      await updateMemberRole(personId,next);
      show({tone:"success",title:"Role updated",message:`Member is now ${roleLabel(next)}.`});
      await load();
    }catch(problem){
      show({tone:"danger",title:"Role update failed",message:problem instanceof Error?problem.message:"Could not update role."});
    }finally{
      setBusy("");
    }
  }

  async function onRemove(personId:string,name:string){
    if(!manage||busy)return;
    if(!(await confirmAction({title:"Remove team member?",text:`${name} will lose access to the company team.`,confirmLabel:"Remove member",tone:"danger"})))return;
    setBusy(`remove-${personId}`);
    try{
      await removeMember(personId);
      show({tone:"success",title:"Member removed",message:`${name} no longer has access.`});
      await load();
    }catch(problem){
      show({tone:"danger",title:"Remove failed",message:problem instanceof Error?problem.message:"Could not remove member."});
    }finally{
      setBusy("");
    }
  }

  async function onRevoke(id:string,inviteEmail:string){
    if(!manage||busy)return;
    setBusy(`revoke-${id}`);
    try{
      await revokeInvitation(id);
      show({tone:"success",title:"Invitation revoked",message:`${inviteEmail} can no longer join with that invite.`});
      await load();
    }catch(problem){
      show({tone:"danger",title:"Revoke failed",message:problem instanceof Error?problem.message:"Could not revoke invitation."});
    }finally{
      setBusy("");
    }
  }

  return <section className="dashboard-canvas dashboard-route-page buy-workspace account-workspace" aria-labelledby="team-page-title">
    <header className="buy-toolbar">
      <p id="team-page-title">Invite colleagues and control who can manage {customer.organizationLegalName||"your business"}.</p>
    </header>

    <section className="buy-soft-section" aria-labelledby="team-members-title">
      <header className="buy-soft-head">
        <div>
          <span className="overview-kicker">People</span>
          <h2 id="team-members-title">Team members</h2>
          <p>Active access to this business account.</p>
        </div>
        {manage?<button type="button" className="compliance-primary" onClick={openInvite}>
          <IconUserPlus size={16}/>
          Invite member
        </button>:null}
      </header>
      {loading?<div className="compliance-loading"><IconLoader2 className="spin"/>Loading team…</div>
      :<div className="team-table" role="list">
        {members.map(member=>{
          const name=`${member.givenName} ${member.familyName}`.trim()||member.email;
          const self=member.email.toLowerCase()===customer.email.toLowerCase();
          const owner=member.role==="OWNER";
          return <article key={member.id} className="team-row" role="listitem">
            <div>
              <strong>{name}{self?" (you)":""}</strong>
              <small>{member.email}</small>
            </div>
            {manage&&!owner?<label className="team-role-select">
              <span className="sr-only">Role for {name}</span>
              <select value={member.role} disabled={Boolean(busy)} onChange={event=>void onRole(member.personId,event.target.value as InviteRole)}>
                {INVITE_ROLES.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>:<span className="team-role-badge">{roleLabel(member.role)}</span>}
            {manage&&!owner&&!self?<button type="button" className="team-remove" disabled={Boolean(busy)} aria-label={`Remove ${name}`} onClick={()=>void onRemove(member.personId,name)}>
              {busy===`remove-${member.personId}`?<IconLoader2 className="spin" size={15}/>:<IconTrash size={15}/>}
            </button>:null}
          </article>;
        })}
      </div>}
    </section>

    {manage?<section className="buy-soft-section" aria-labelledby="team-pending-title">
      <header className="buy-soft-head">
        <div>
          <span className="overview-kicker">Pending</span>
          <h2 id="team-pending-title">Invitations</h2>
          <p>Open invites expire after 72 hours.</p>
        </div>
      </header>
      {loading?null:pending.length===0?<p className="team-empty">No pending invitations.</p>
      :<div className="team-table" role="list">
        {pending.map(invite=><article key={invite.id} className="team-row" role="listitem">
          <div>
            <strong>{invite.email}</strong>
            <small>{roleLabel(invite.role)} · expires {new Date(invite.expiresAt).toLocaleString()}</small>
          </div>
          <button type="button" className="compliance-secondary" disabled={Boolean(busy)} onClick={()=>void onRevoke(invite.id,invite.email)}>
            {busy===`revoke-${invite.id}`?<IconLoader2 className="spin" size={15}/>:null}
            Revoke
          </button>
        </article>)}
      </div>}
    </section>:null}

    {manage?<Modal
      open={inviteOpen}
      onClose={closeInvite}
      title="Invite a member"
      description="They receive an email link, create a password, and sign in to this business."
      className="compliance-selector-dialog team-invite-dialog"
    >
      <form className="team-invite-form" onSubmit={event=>void onInvite(event)}>
        <div className="team-invite-fields">
          <label className="compliance-field">
            <span>Work email</span>
            <input type="email" required value={email} onChange={event=>setEmail(event.target.value)} placeholder="colleague@company.com" autoComplete="email" autoFocus/>
          </label>
          <label className="compliance-field">
            <span>Role</span>
            <select value={role} onChange={event=>setRole(event.target.value as InviteRole)}>
              {INVITE_ROLES.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <small className="team-invite-role-hint">{INVITE_ROLES.find(item=>item.value===role)?.hint}</small>
          </label>
        </div>
        {inviteLink?<p className="team-invite-link">Invite link (also emailed): <code>{inviteLink}</code></p>:null}
        <div className="team-invite-actions">
          <button className="compliance-secondary" type="button" disabled={busy==="invite"} onClick={closeInvite}>
            {inviteLink?"Done":"Cancel"}
          </button>
          {!inviteLink?<button className="compliance-primary" type="submit" disabled={Boolean(busy)}>
            {busy==="invite"?<IconLoader2 className="spin" size={16}/>:<IconUserPlus size={16}/>}
            Send invite
          </button>:null}
        </div>
      </form>
    </Modal>:null}
  </section>;
}
