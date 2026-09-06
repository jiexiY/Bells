import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CompanyRow {
  id: string;
  name: string;
  logo_url: string | null;
  invite_code: string;
  created_at: string;
}

export interface CompanyMembershipRow {
  id: string;
  user_id: string;
  company_id: string;
  role: "project_lead" | "team_lead" | "member";
  department: "tech" | "marketing" | "research" | null;
  is_active: boolean;
  created_at: string;
}

export function useCompanies() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as CompanyRow[];
    },
  });
}

export function useCompanyMemberships() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["company_memberships", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_memberships")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_active", true);
      if (error) throw error;
      return data as CompanyMembershipRow[];
    },
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (companyId: string) => {
      const { data, error } = await supabase.functions.invoke("delete-workspace", {
        body: { company_id: companyId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      qc.invalidateQueries({ queryKey: ["company_memberships"] });
    },
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ name, role, department }: { name: string; role: "project_lead" | "team_lead" | "member"; department?: string }) => {
      if (!user) throw new Error("You must be signed in to create an organization.");
      const { data: company, error } = await supabase.rpc("create_company", {
        _name: name,
        _role: role,
        _department: department as "tech" | "marketing" | "research" | undefined,
      });
      if (error) throw error;
      return company;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      qc.invalidateQueries({ queryKey: ["company_memberships"] });
    },
  });
}
