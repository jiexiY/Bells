import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";

export interface MemberRow {
  user_id: string;
  name: string;
  email: string;
  department: "tech" | "marketing" | "research" | null;
  role: "project_lead" | "team_lead" | "member";
  reports_to?: string | null;
}

export function useMembers(department?: string) {
  const { activeCompanyId, activeRole } = useCompany();
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["members", activeCompanyId, department, user?.id, activeRole],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      // Get active company members
      const { data: memberships, error: membershipsError } = await supabase
        .from("company_memberships")
        .select("user_id, role, department, reports_to")
        .eq("company_id", activeCompanyId)
        .eq("is_active", true);

      if (membershipsError) throw membershipsError;

      if (!memberships.length) return [];

      // Get profiles for these users
      const userIds = memberships.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      const memberRows: MemberRow[] = memberships.map((m) => {
        const profile = profiles?.find(p => p.user_id === m.user_id);
        return {
          user_id: m.user_id,
          name: profile?.name || "",
          email: profile?.email || "",
          department: m.department as MemberRow["department"],
          role: m.role as MemberRow["role"],
          reports_to: m.reports_to,
        };
      });

      if (department) {
        return memberRows.filter((m) => m.role === "member" && m.department === department && (activeRole !== "team_lead" || m.reports_to === user?.id));
      }
      return memberRows;
    },
    enabled: !!activeCompanyId,
  });
}
