import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertTriangle, UserMinus, Users } from "lucide-react";

interface MemberInfo {
  user_id: string;
  name: string;
  role: string;
  department: string | null;
  is_active: boolean;
}

interface RoleTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: MemberInfo[];
}

type ActionType = "transfer" | "leave";

export function RoleTransferDialog({ open, onOpenChange, members }: RoleTransferDialogProps) {
  const { activeCompanyId } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [action, setAction] = useState<ActionType>("transfer");
  const [targetMember, setTargetMember] = useState<string>("");

  // Filter out current user and get eligible members for transfer
  const eligibleMembers = members.filter(m => 
    m.user_id !== user?.id && 
    m.is_active && 
    (m.role === "team_lead" || m.role === "member")
  );

  const transferRoleMutation = useMutation({
    mutationFn: async () => {
      if (!activeCompanyId || !targetMember) throw new Error("Missing required data");
      
      const { error } = await supabase.rpc("transfer_role_to_member", {
        _company_id: activeCompanyId,
        _target_user_id: targetMember,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role transferred successfully");
      queryClient.invalidateQueries({ queryKey: ["company-members"] });
      queryClient.invalidateQueries({ queryKey: ["user_roles"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to transfer role");
    },
  });

  const leaveWorkspaceMutation = useMutation({
    mutationFn: async () => {
      if (!activeCompanyId) throw new Error("Missing company ID");
      
      const { error } = await supabase.rpc("leave_workspace", {
        _company_id: activeCompanyId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Left workspace successfully");
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["company-members"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to leave workspace");
    },
  });

  const resetForm = () => {
    setAction("transfer");
    setTargetMember("");
  };

  const handleConfirm = () => {
    if (action === "leave") {
      leaveWorkspaceMutation.mutate();
    } else if (action === "transfer" && targetMember) {
      transferRoleMutation.mutate();
    }
  };

  const isLoading = transferRoleMutation.isPending || leaveWorkspaceMutation.isPending;
  const canSubmit = action === "leave" || (action === "transfer" && targetMember);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Your Role
          </DialogTitle>
          <DialogDescription>
            Choose how you'd like to proceed with your workspace membership.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="action">Action</Label>
            <Select value={action} onValueChange={(value: ActionType) => setAction(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transfer">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Transfer my role</div>
                      <div className="text-xs text-muted-foreground">
                        Pass leadership to another member
                      </div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="leave">
                  <div className="flex items-center gap-2">
                    <UserMinus className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Leave workspace</div>
                      <div className="text-xs text-muted-foreground">
                        Remove yourself from this workspace
                      </div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {action === "transfer" && (
            <div className="space-y-2">
              <Label htmlFor="target-member">Transfer to</Label>
              <Select value={targetMember} onValueChange={setTargetMember}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleMembers.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {member.role.replace("_", " ")}
                            {member.department && ` • ${member.department}`}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {eligibleMembers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No eligible members available for role transfer
                </p>
              )}
            </div>
          )}

          {action === "leave" && (
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Warning</p>
                <p className="text-muted-foreground">
                  You will lose access to this workspace. If you're the only project lead, 
                  you must transfer your role first.
                </p>
              </div>
            </div>
          )}

          {action === "transfer" && targetMember && (
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Users className="h-4 w-4 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Role Transfer</p>
                <p className="text-muted-foreground">
                  Your current role will be transferred to the selected member, 
                  and you'll become a regular member.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!canSubmit || isLoading}
            variant={action === "leave" ? "destructive" : "default"}
          >
            {isLoading ? "Processing..." : action === "leave" ? "Leave Workspace" : "Transfer Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}