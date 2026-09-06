import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Building2, KeyRound, Plus, Trash2 } from "lucide-react";
import { useDemoOrganizations, type DemoOrganization } from "@/contexts/DemoOrganizationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type Department = NonNullable<DemoOrganization["department"]>;
const departments = [{ value: "tech", label: "Tech" }, { value: "marketing", label: "Marketing" }, { value: "research", label: "Research" }] as const;
const roles = [{ value: "project_lead", label: "Project Manager" }, { value: "team_lead", label: "Team Lead" }, { value: "member", label: "Contributor" }] as const;

export default function DemoOrganizationPortal() {
  const navigate = useNavigate();
  const { organizations, selectOrganization, createOrganization, removeOrganization, joinSampleOrganization, storageWarning } = useDemoOrganizations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<DemoOrganization["role"]>("project_lead");
  const [newDepartment, setNewDepartment] = useState<Department | "">("");
  const [inviteCode, setInviteCode] = useState("");
  const [joinDepartment, setJoinDepartment] = useState<Department | "">("");
  const [createError, setCreateError] = useState("");
  const [joinError, setJoinError] = useState("");
  const [notice, setNotice] = useState("");
  const [portalError, setPortalError] = useState("");
  const [deletingOrganization, setDeletingOrganization] = useState<DemoOrganization | null>(null);

  function enterOrganization(id: string) {
    try { selectOrganization(id); navigate("/demo/workspace"); }
    catch (error) { setPortalError(error instanceof Error ? error.message : "Unable to open this demo organization."); }
  }

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    try {
      const created = createOrganization({ name: newName, role: newRole, department: newRole === "project_lead" ? null : newDepartment || null });
      setNewName(""); setNewRole("project_lead"); setNewDepartment(""); setCreateError(""); setDialogOpen(false);
      setNotice(`Created “${created.name}”. Select it to open your blank demo workspace.`);
    } catch (error) { setCreateError(error instanceof Error ? error.message : "Unable to create a demo organization."); }
  }

  function handleJoin(event: FormEvent) {
    event.preventDefault();
    if (inviteCode.trim().toUpperCase() !== "BELLSDEMO") { setJoinError("Use the example invite code BELLSDEMO to explore joining a demo organization."); return; }
    if (!joinDepartment) { setJoinError("Please select a department."); return; }
    try { joinSampleOrganization(joinDepartment); navigate("/demo/workspace"); }
    catch (error) { setJoinError(error instanceof Error ? error.message : "Unable to join the sample organization."); }
  }

  function handleDelete() {
    if (!deletingOrganization) return;
    try {
      removeOrganization(deletingOrganization.id);
      setNotice(`Deleted “${deletingOrganization.name}” and its local demo content.`);
      setPortalError("");
    } catch (error) { setPortalError(error instanceof Error ? error.message : "Unable to delete this demo organization."); }
    setDeletingOrganization(null);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-primary" aria-hidden="true" />
          <h1 className="text-3xl font-bold text-foreground">Your Organizations</h1>
          <p className="mt-1 text-muted-foreground">Select a company to enter its dashboard</p>
          <p className="mt-3 text-xs text-muted-foreground">Guest demo · Organizations and changes stay in this browser.</p>
        </div>

        {storageWarning && <p role="status" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">Browser storage is unavailable. Local changes may not be saved or removed after you leave.</p>}
        {notice && <p role="status" className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">{notice}</p>}
        {portalError && <p role="alert" className="mb-4 text-sm text-destructive">{portalError}</p>}

        <div className="grid gap-4">
          {organizations.map(organization => (
            <Card key={organization.id} className="group relative transition-shadow hover:shadow-md">
              <CardContent className="p-0">
                <button
                  type="button"
                  onClick={() => enterOrganization(organization.id)}
                  className="flex w-full items-center gap-4 rounded-xl p-5 pr-24 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label={`Enter ${organization.name}`}
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10"><Building2 className="h-6 w-6 text-primary" aria-hidden="true" /></span>
                  <span className="min-w-0">
                    <span className="block break-words font-semibold text-foreground">{organization.name}</span>
                    <span className="block text-sm capitalize text-muted-foreground">{roles.find(role => role.value === organization.role)?.label}{organization.department ? ` · ${organization.department}` : ""}</span>
                    <span className="mt-0.5 block text-xs text-primary">{organization.isSample ? <span className="font-mono">Example invite: <span className="font-semibold tracking-wider">BELLSDEMO</span></span> : "Local demo workspace"}</span>
                  </span>
                  <ArrowRight className="absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
                </button>
                {!organization.isSample && <Button type="button" size="icon" variant="ghost" className="absolute right-12 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-destructive" aria-label={`Delete ${organization.name}`} onClick={() => setDeletingOrganization(organization)}><Trash2 className="h-4 w-4" /></Button>}
              </CardContent>
            </Card>
          ))}
        </div>

        <form onSubmit={handleJoin} className="mt-6 space-y-3" noValidate>
          <h2 className="text-center text-sm font-semibold text-foreground">Join with Invite Code</h2>
          <div className="mx-auto flex max-w-lg flex-col items-stretch gap-2 sm:flex-row">
            <Label htmlFor="demo-invite-code" className="sr-only">Invite code</Label>
            <Input id="demo-invite-code" value={inviteCode} onChange={event => { setInviteCode(event.target.value.toUpperCase()); setJoinError(""); }} placeholder="Enter invite code (e.g. BELLSDEMO)" maxLength={30} autoComplete="off" className="font-mono tracking-wider" aria-invalid={Boolean(joinError)} aria-describedby={joinError ? "demo-join-error demo-invite-example" : "demo-invite-example"} />
          </div>
          <p id="demo-invite-example" className="text-center text-xs text-muted-foreground">Example code: <span className="font-mono font-semibold">BELLSDEMO</span> · Join the fictional team as a contributor.</p>
          {inviteCode.trim() && <div className="mx-auto flex max-w-lg flex-col items-stretch gap-2 sm:flex-row">
            <div className="min-w-0 flex-1"><Label htmlFor="demo-join-department" className="sr-only">Department to join</Label><Select value={joinDepartment} onValueChange={value => { setJoinDepartment(value as Department); setJoinError(""); }}><SelectTrigger id="demo-join-department"><SelectValue placeholder="Select department" /></SelectTrigger><SelectContent>{departments.map(department => <SelectItem key={department.value} value={department.value}>{department.label}</SelectItem>)}</SelectContent></Select></div>
            <Button type="submit" className="shrink-0 gap-1.5"><KeyRound className="h-4 w-4" aria-hidden="true" />Join</Button>
          </div>}
          {joinError && <p id="demo-join-error" role="alert" className="mx-auto max-w-lg text-sm text-destructive">{joinError}</p>}
        </form>

        <div className="mt-4 flex justify-center gap-3">
          <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (open) setCreateError(""); }}>
            <DialogTrigger asChild><Button variant="outline" className="gap-2"><Plus className="h-4 w-4" aria-hidden="true" />Create Organization</Button></DialogTrigger>
            <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-lg sm:max-w-lg">
              <DialogHeader><DialogTitle>Create New Organization</DialogTitle><DialogDescription>Create a local Bells workspace and choose your starting role.</DialogDescription></DialogHeader>
              <form onSubmit={handleCreate} noValidate>
                <div className="space-y-4 py-4">
                  <div className="space-y-2"><Label htmlFor="demo-organization-name">Organization Name</Label><Input id="demo-organization-name" value={newName} onChange={event => { setNewName(event.target.value); setCreateError(""); }} maxLength={80} placeholder="Acme Corp" autoFocus aria-describedby={createError ? "demo-create-error" : undefined} /></div>
                  <div className="space-y-2"><Label htmlFor="demo-organization-role">Your Role</Label><Select value={newRole} onValueChange={value => { setNewRole(value as DemoOrganization["role"]); setCreateError(""); }}><SelectTrigger id="demo-organization-role"><SelectValue /></SelectTrigger><SelectContent>{roles.map(role => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}</SelectContent></Select></div>
                  {newRole !== "project_lead" && <div className="space-y-2"><Label htmlFor="demo-organization-department">Department</Label><Select value={newDepartment} onValueChange={value => { setNewDepartment(value as Department); setCreateError(""); }}><SelectTrigger id="demo-organization-department"><SelectValue placeholder="Select department" /></SelectTrigger><SelectContent>{departments.map(department => <SelectItem key={department.value} value={department.value}>{department.label}</SelectItem>)}</SelectContent></Select></div>}
                  {createError && <p id="demo-create-error" role="alert" className="text-sm text-destructive">{createError}</p>}
                </div>
                <DialogFooter className="gap-2"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit">Create</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="mt-6 text-center"><Link to="/auth" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to sign in</Link></div>
      </div>

      <AlertDialog open={deletingOrganization !== null} onOpenChange={open => { if (!open) setDeletingOrganization(null); }}>
        <AlertDialogContent className="w-[calc(100%_-_2rem)] rounded-lg sm:max-w-lg">
          <AlertDialogHeader><AlertDialogTitle>Delete Organization</AlertDialogTitle><AlertDialogDescription>Delete “{deletingOrganization?.name}” and its projects, tasks, and posts from this browser? This cannot be undone. Other demo organizations are kept.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
