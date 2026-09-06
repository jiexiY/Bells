import { useId, useState } from "react";
import { Copy, Plus, Trash2, UserPlus } from "lucide-react";
import { useCompanyInvitations, useCreateInvitations } from "@/hooks/useInvitations";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanies } from "@/hooks/useCompanies";
import { useMembers } from "@/hooks/useMembers";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type Department = "tech" | "marketing" | "research";
type Person = { email: string; department: Department; teamLead: string };
const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
export function InviteMemberPanel() {
  const uid = useId();
  const { user } = useAuth();
  const { activeRole, activeDepartment, activeCompanyId } = useCompany();
  const { data: companies = [] } = useCompanies();
  const { data: members = [] } = useMembers();
  const { data: invitations = [] } = useCompanyInvitations();
  const create = useCreateInvitations();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<"team_lead" | "member">(activeRole === "project_lead" ? "team_lead" : "member");
  const emptyPerson = (): Person => ({ email: "", department: activeDepartment || "tech", teamLead: "" });
  const [people, setPeople] = useState<Person[]>([emptyPerson()]);
  const company = companies.find(item => item.id === activeCompanyId);
  const leads = members.filter(member => member.role === "team_lead");
  const pending = invitations.filter(invite => invite.status === "pending");
  const selectedRole = activeRole === "project_lead" ? role : "member";
  const update = (index: number, change: Partial<Person>) => setPeople(current => current.map((item,i) => i===index ? {...item,...change} : item));
  async function invite(event: React.FormEvent) {
    event.preventDefault();
    try {
      await create.mutateAsync(people.map(person => {
        const leadId = activeRole === "team_lead" ? user!.id : person.teamLead;
        if (selectedRole === "member" && !leadId) throw new Error("Choose a team lead for each contributor.");
        return { email: person.email, role: selectedRole, department: person.department, team_lead_id: selectedRole === "member" ? leadId : null };
      }));
      toast.success(`${people.length} invitation${people.length === 1 ? "" : "s"} created`, { description: "Share the workplace code. Each person joins with their invited email." });
      setOpen(false); setPeople([emptyPerson()]);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to create invitations"); }
  }
  return <div className="space-y-3">
    <Button size="sm" className="w-full gap-2" onClick={() => setOpen(true)}><UserPlus className="h-4 w-4" />Invite people</Button>
    {pending.length > 0 && <p className="text-xs text-muted-foreground">{pending.length} pending invitation{pending.length === 1 ? "" : "s"}</p>}
    {pending.slice(0, 5).map(invite => <div key={invite.id} className="rounded border border-border p-2 text-xs"><p className="truncate font-medium">{invite.email}</p><p className="mt-1 text-muted-foreground">{invite.role === "team_lead" ? "Team Lead" : "Contributor"} · {invite.department}</p></div>)}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>{activeRole === "project_lead" ? "Build your team" : "Invite your contributors"}</DialogTitle><DialogDescription>Select the people and roles. Share the workplace code after creating their invitations.</DialogDescription></DialogHeader>
      <form onSubmit={invite} className="space-y-5">
        {activeRole === "project_lead" && <div className="space-y-2"><Label htmlFor={`${uid}-role`}>Invite as</Label><select id={`${uid}-role`} className={selectClass} value={role} onChange={event => setRole(event.target.value as "team_lead" | "member")}><option value="team_lead">Team Leads</option><option value="member">Contributors</option></select></div>}
        <p className="text-sm font-semibold">{people.length} {selectedRole === "team_lead" ? "team lead" : "contributor"}{people.length === 1 ? "" : "s"} selected</p>
        <div className="space-y-3">{people.map((person, index) => <div key={index} className="grid gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-[1fr_170px_34px]">
          <div className="space-y-1.5"><Label htmlFor={`${uid}-email-${index}`}>Email {index + 1}</Label><Input id={`${uid}-email-${index}`} type="email" autoComplete="off" required maxLength={254} value={person.email} onChange={event => update(index,{email:event.target.value})} placeholder="colleague@company.com" /></div>
          {selectedRole === "team_lead" ? <div className="space-y-1.5"><Label htmlFor={`${uid}-dept-${index}`}>Department</Label><select id={`${uid}-dept-${index}`} className={selectClass} value={person.department} onChange={event => update(index,{department:event.target.value as Department})}><option value="tech">Tech</option><option value="marketing">Marketing</option><option value="research">Research</option></select></div> : activeRole === "project_lead" ? <div className="space-y-1.5"><Label htmlFor={`${uid}-lead-${index}`}>Team lead</Label><select id={`${uid}-lead-${index}`} required className={selectClass} value={person.teamLead} onChange={event => update(index,{teamLead:event.target.value})}><option value="">Select lead</option>{leads.map(lead => <option key={lead.user_id} value={lead.user_id}>{lead.name}</option>)}</select></div> : <div className="self-end pb-3 text-sm text-muted-foreground">Your team · {activeDepartment}</div>}
          <Button type="button" variant="ghost" size="icon" className="self-end" disabled={people.length===1} aria-label={`Remove person ${index+1}`} onClick={() => setPeople(current => current.filter((_,i) => i!==index))}><Trash2 className="h-4 w-4" /></Button>
        </div>)}</div>
        <Button type="button" variant="outline" className="gap-2" disabled={people.length>=50} onClick={() => setPeople(current => [...current,emptyPerson()])}><Plus className="h-4 w-4" />Add another person</Button>
        {company && <div className="rounded-xl border border-primary/20 bg-primary/5 p-4"><p className="text-xs font-medium text-muted-foreground">Workplace code</p><div className="mt-1 flex items-center justify-between"><code className="text-lg font-bold tracking-widest text-primary">{company.invite_code}</code><Button type="button" variant="ghost" size="sm" className="gap-2" onClick={async () => { try { await navigator.clipboard.writeText(company.invite_code); toast.success("Code copied"); } catch { toast.error("Copy the displayed code manually."); } }}><Copy className="h-4 w-4" />Copy</Button></div><p className="mt-2 text-xs text-muted-foreground">The code uses each person's invitation to assign their role and team. Invitation emails are not sent.</p></div>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating invitations..." : `Create ${people.length} invitation${people.length===1 ? "" : "s"}`}</Button></div>
      </form>
    </DialogContent></Dialog>
  </div>;
}
