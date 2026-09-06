import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRemoveMember, useAddMember } from "@/hooks/useManageMembers";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserMinus, UserPlus, Settings, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoleTransferDialog } from "./RoleTransferDialog";

interface MemberInfo {
  user_id: string;
  name: string;
  role: string;
  department: string | null;
  is_active: boolean;
  reports_to: string | null;
}

export function MembersPanel() {
  const { activeCompanyId, activeRole: myRole } = useCompany();
  const { user } = useAuth();
  const removeMember = useRemoveMember();
  const addMember = useAddMember();

  const [confirmAction, setConfirmAction] = useState<{
    type: "remove" | "add";
    member: MemberInfo;
  } | null>(null);
  
  const [roleTransferOpen, setRoleTransferOpen] = useState(false);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["company-members", activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data: memberships, error } = await supabase
        .from("company_memberships")
        .select("user_id, role, department, is_active, reports_to")
        .eq("company_id", activeCompanyId!);
      if (error) throw error;

      const userIds = memberships.map((m) => m.user_id);
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", userIds);
      if (pErr) throw pErr;

      return memberships.map((m): MemberInfo => {
        const profile = profiles?.find((p) => p.user_id === m.user_id);
        return {
          user_id: m.user_id,
          name: profile?.name || "Unknown",
          role: m.role,
          department: m.department,
          is_active: m.is_active,
          reports_to: m.reports_to,
        };
      });
    },
  });

  const activeMembers = members.filter((m) => m.is_active);
  const inactiveMembers = members.filter((m) => !m.is_active);

  const canRemove = (target: MemberInfo) => {
    if (target.user_id === user?.id) return false;
    if (myRole === "project_lead" && ["team_lead", "member"].includes(target.role)) return true;
    if (myRole === "team_lead" && target.role === "member" && target.reports_to === user?.id) return true;
    return false;
  };

  const canReactivate = (target: MemberInfo) => {
    if (myRole === "project_lead" && (target.role === "team_lead" || target.role === "member")) return true;
    if (myRole === "team_lead" && target.role === "member" && target.reports_to === user?.id) return true;
    return false;
  };

  const handleConfirm = () => {
    if (!confirmAction || !activeCompanyId) return;
    const { type, member } = confirmAction;

    if (type === "remove") {
      removeMember.mutate(
        { companyId: activeCompanyId, targetUserId: member.user_id },
        {
          onSuccess: () => {
            toast.success(`${member.name} has been removed`);
            setConfirmAction(null);
          },
          onError: (err: any) => {
            toast.error(err.message);
            setConfirmAction(null);
          },
        }
      );
    } else {
      addMember.mutate(
        {
          companyId: activeCompanyId,
          targetUserId: member.user_id,
          targetRole: member.role as any,
          targetDepartment: member.department as any,
        },
        {
          onSuccess: () => {
            toast.success(`${member.name} has been re-added`);
            setConfirmAction(null);
          },
          onError: (err: any) => {
            toast.error(err.message);
            setConfirmAction(null);
          },
        }
      );
    }
  };

  if (isLoading) {
    return <p className="text-xs text-muted-foreground px-2 py-1">Loading…</p>;
  }

  if (members.length === 0) {
    return <p className="text-xs text-muted-foreground px-2 py-1">No members yet</p>;
  }

  const renderMember = (m: MemberInfo) => (
    <div
      key={m.user_id}
      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
    >
      <div className="relative">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
            {m.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card",
            m.is_active ? "bg-green-500" : "bg-muted-foreground/40"
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{m.name}</p>
        <p className="text-[10px] text-muted-foreground capitalize">
          {m.role.replace("_", " ")}
          {m.department ? ` · ${m.department}` : ""}
        </p>
      </div>

      {m.is_active && canRemove(m) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setConfirmAction({ type: "remove", member: m })}
        >
          <UserMinus className="h-3.5 w-3.5" />
        </Button>
      )}

      {!m.is_active && canReactivate(m) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-primary hover:text-primary hover:bg-primary/10"
          onClick={() => setConfirmAction({ type: "add", member: m })}
        >
          <UserPlus className="h-3.5 w-3.5" />
        </Button>
      )}

      {m.is_active && !canRemove(m) && m.user_id === user?.id && (myRole === "project_lead" || myRole === "team_lead") && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setRoleTransferOpen(true)}>
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Manage Role
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {m.is_active && !canRemove(m) && m.user_id !== user?.id && (
        <span
          className={cn(
            "text-[10px] font-medium shrink-0",
            m.is_active ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
          )}
        >
          Active
        </span>
      )}
    </div>
  );

  return (
    <>
      <div className="space-y-1">
        {activeMembers.map(renderMember)}

        {inactiveMembers.length > 0 && (myRole === "project_lead" || myRole === "team_lead") && (
          <>
            <p className="text-[10px] font-semibold text-muted-foreground pt-2 px-2">
              Inactive Members
            </p>
            {inactiveMembers.map(renderMember)}
          </>
        )}
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "remove" ? "Remove Member" : "Re-add Member"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "remove"
                ? `Are you sure you want to remove ${confirmAction?.member.name} from this workspace? They will no longer have access.`
                : `Are you sure you want to re-add ${confirmAction?.member.name} to this workspace?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={confirmAction?.type === "remove" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {confirmAction?.type === "remove" ? "Remove" : "Re-add"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RoleTransferDialog 
        open={roleTransferOpen} 
        onOpenChange={setRoleTransferOpen}
        members={members}
      />
    </>
  );
}
