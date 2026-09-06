import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export interface InvitationRow {
  id: string;
  company_id: string;
  email: string;
  role: "project_lead" | "team_lead" | "member";
  department: "tech" | "marketing" | "research" | null;
  invited_by: string;
  status: string;
  created_at: string;
  responded_at: string | null;
  team_lead_id?: string | null;
}

/** Invitations sent for the active company (visible to leads) */
export function useCompanyInvitations() {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ["invitations", "company", activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("company_id", activeCompanyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as InvitationRow[];
    },
  });
}

/** Pending invitations for the logged-in user */
export function useMyInvitations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["invitations", "mine", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user?.email) return [];
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("email", user.email.trim().toLowerCase())
        .eq("status", "pending");
      if (error) throw error;
      return data as InvitationRow[];
    },
  });
}

export function useRespondInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invitation,
      accept,
    }: {
      invitation: InvitationRow;
      accept: boolean;
    }) => {
      const { data, error } = await supabase.rpc("respond_work_invitation", { _invitation_id: invitation.id, _accept: accept });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitations"] });
      qc.invalidateQueries({ queryKey: ["companies"] });
      qc.invalidateQueries({ queryKey: ["company_memberships"] });
      qc.invalidateQueries({ queryKey: ["user_roles"] });
    },
  });
}

export function useCreateInvitations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  return useMutation({
    mutationFn: async (people: { email: string; role: "team_lead" | "member"; department: "tech" | "marketing" | "research"; team_lead_id: string | null }[]) => {
      if (!user || !activeCompanyId) throw new Error("Choose a workspace first.");
      const { data, error } = await supabase.from("invitations").insert(people.map(person => ({ ...person, email: person.email.trim().toLowerCase(), company_id: activeCompanyId, invited_by: user.id }))).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations"] }),
  });
}
