import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompanies, useCompanyMemberships, useCreateCompany, useDeleteCompany } from "@/hooks/useCompanies";
import { useUnreadCountByCompany } from "@/hooks/useNotifications";
import { useMyInvitations, useRespondInvitation } from "@/hooks/useInvitations";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Building2, Plus, ArrowRight, Mail, Check, X, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function CompanyPortal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: companies = [], isLoading } = useCompanies();
  const { data: memberships = [] } = useCompanyMemberships();
  const unreadCounts = useUnreadCountByCompany();
  const createCompany = useCreateCompany();
  const deleteCompany = useDeleteCompany();
  const { data: pendingInvites = [] } = useMyInvitations();
  const respondInvite = useRespondInvitation();
  const { activeCompanyId, setActiveCompanyId } = useCompany();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joinDepartment, setJoinDepartment] = useState<string>("");
  const [joining, setJoining] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"project_lead" | "team_lead" | "member">("project_lead");
  const [newDepartment, setNewDepartment] = useState<string>("");
  const [deleteCompanyId, setDeleteCompanyId] = useState<string | null>(null);

  const handleJoinWorkspace = async () => {
    if (!inviteCode.trim()) return;
    setJoining(true);
    try {
      const { data: joined, error } = await supabase.rpc("join_workplace", { _invite_code: inviteCode.trim() });
      const data = joined as { company_id: string; company_name: string; role: string; error?: string };
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(`Joined "${data.company_name}"!`);
        await queryClient.invalidateQueries({ queryKey: ["company_memberships"] });
        await queryClient.invalidateQueries({ queryKey: ["companies"] });
        setInviteCode("");
        setJoinDepartment("");
        // Set the active company and navigate to role-specific dashboard
        if (data.company_id) {
          setActiveCompanyId(data.company_id);
          const role = data.role || "member";
          const roleRouteMap: Record<string, string> = {
            project_lead: "/project-lead",
            team_lead: "/team-lead",
            member: "/member",
          };
          navigate(roleRouteMap[role] || "/workspace");
        } else {
          window.location.reload();
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to join organization");
    } finally {
      setJoining(false);
    }
  };

  const myCompanies = companies.filter(c =>
    memberships.some(m => m.company_id === c.id && m.is_active)
  );

  const handleEnter = (companyId: string) => {
    setActiveCompanyId(companyId);
    navigate("/workspace");
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    createCompany.mutate({
      name: newName,
      role: "project_lead",
    }, {
      onSuccess: (company) => {
        setActiveCompanyId(company.id);
        navigate("/workspace");
        setNewName("");
        setNewRole("project_lead");
        setNewDepartment("");
        setDialogOpen(false);
      },
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <Building2 className="h-10 w-10 text-primary mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-foreground">Your Organizations</h1>
          <p className="text-muted-foreground mt-1">Select a company to enter its dashboard</p>
        </div>

        <div className="grid gap-4">
          {isLoading && <p className="text-center text-muted-foreground">Loading...</p>}
          {myCompanies.map(company => {
            const membership = memberships.find(m => m.company_id === company.id);
            const unread = unreadCounts[company.id] || 0;
            return (
              <Card
                key={company.id}
                className="cursor-pointer hover:shadow-md transition-shadow group"
                onClick={() => handleEnter(company.id)}
              >
                <CardContent className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      {unread > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                          {unread > 9 ? "9+" : unread}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{company.name}</h3>
                      <p className="text-sm text-muted-foreground capitalize">
                        {membership?.role === "project_lead" ? "Project Manager" : membership?.role === "member" ? "Contributor" : membership?.role?.replace("_", " ")} {membership?.department ? `· ${membership.department}` : ""}
                      </p>
                      {membership?.role === "project_lead" && company.invite_code && (
                        <p className="text-xs text-primary font-mono mt-0.5">
                          Invite: <span className="font-semibold tracking-wider">{company.invite_code}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {membership?.role === "project_lead" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteCompanyId(company.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {!isLoading && myCompanies.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">You haven't joined any organization yet.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Pending Invitations */}
        {pendingInvites.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" /> Pending Invitations
            </h2>
            <div className="grid gap-3">
              {pendingInvites.map(inv => (
                <Card key={inv.id} className="border-primary/20">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium text-foreground text-sm">You've been invited</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        Role: {inv.role.replace("_", " ")}{inv.department ? ` · ${inv.department}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        disabled={respondInvite.isPending}
                        onClick={() =>
                          respondInvite.mutate(
                            { invitation: inv, accept: false },
                            {
                              onSuccess: () => toast.info("Invitation declined"),
                              onError: (err: any) => toast.error(err?.message || "Failed to decline invitation"),
                            }
                          )}
                      >
                        <X className="h-3.5 w-3.5" /> Decline
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1"
                        disabled={respondInvite.isPending}
                        onClick={() =>
                          respondInvite.mutate(
                            { invitation: inv, accept: true },
                            {
                              onSuccess: () => toast.success("Invitation accepted!"),
                              onError: (err: any) => toast.error(err?.message || "Failed to accept invitation"),
                            }
                          )}
                      >
                        <Check className="h-3.5 w-3.5" /> Accept
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Join with Invite Code */}
        <div className="mt-6 space-y-3">
          <h2 className="text-sm font-semibold text-foreground text-center">Join with Invite Code</h2>
          <div className="flex flex-col sm:flex-row items-stretch gap-2 max-w-lg mx-auto">
            <Input
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Enter invite code (e.g. A1B2C3D4)"
              className="font-mono tracking-wider"
              onKeyDown={e => e.key === "Enter" && handleJoinWorkspace()}
            />
          </div>
          {inviteCode.trim() && <div className="space-y-2"><p className="text-xs text-muted-foreground">Use the email your manager or lead invited. Your invitation sets your role and team.</p><Button onClick={handleJoinWorkspace} disabled={joining}>{joining ? "Joining..." : "Join workplace"}</Button></div>}
        </div>

        <div className="mt-4 flex justify-center gap-3">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" /> Create Organization
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Organization</DialogTitle>
                <DialogDescription>
                  Create your workplace, then invite team leads and contributors.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Organization Name</Label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Acme Corp" />
                </div>
                <p className="text-sm text-muted-foreground">You will manage this workplace. Invite team leads after creating it.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createCompany.isPending}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Delete Organization Confirmation */}
      <AlertDialog open={!!deleteCompanyId} onOpenChange={(open) => { if (!open) setDeleteCompanyId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organization</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this organization? This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteCompanyId) {
                  deleteCompany.mutate(deleteCompanyId, {
                    onSuccess: () => {
                      toast.success("Organization deleted");
                      if (activeCompanyId === deleteCompanyId) {
                        setActiveCompanyId(null);
                      }
                      setDeleteCompanyId(null);
                    },
                    onError: () => toast.error("Failed to delete organization"),
                  });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
