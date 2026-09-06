import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, targetUserId }: { companyId: string; targetUserId: string }) => {
      const { error } = await supabase.rpc("remove_company_member", {
        _company_id: companyId,
        _target_user_id: targetUserId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-members"] });
      qc.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

export function useAddMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      companyId,
      targetUserId,
      targetRole,
      targetDepartment,
    }: {
      companyId: string;
      targetUserId: string;
      targetRole: "project_lead" | "team_lead" | "member";
      targetDepartment?: "tech" | "marketing" | "research" | null;
    }) => {
      const { error } = await supabase.rpc("add_company_member", {
        _company_id: companyId,
        _target_user_id: targetUserId,
        _target_role: targetRole,
        _target_department: targetDepartment || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-members"] });
      qc.invalidateQueries({ queryKey: ["members"] });
    },
  });
}
