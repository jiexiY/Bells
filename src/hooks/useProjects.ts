import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  progress: number;
  lead_id: string | null;
  lead_name: string | null;
  department: "tech" | "marketing" | "research";
  created_at: string;
  due_date: string;
  company_id: string | null;
  review_feedback?: string | null;
  submission_comment?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
}

export function useProjects() {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ["projects", activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      let query = supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (activeCompanyId) {
        query = query.eq("company_id", activeCompanyId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as ProjectRow[];
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  const { activeCompanyId } = useCompany();
  return useMutation({
    mutationFn: async (project: Omit<ProjectRow, "id" | "created_at" | "company_id">) => {
      const { error } = await supabase
        .from("projects")
        .insert({ ...project, company_id: activeCompanyId } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", activeCompanyId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  const { activeCompanyId } = useCompany();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProjectRow> & { id: string }) => {
      const { data, error } = await supabase.rpc("update_project_workflow", { _project_id: id, _updates: updates });
      if (error) throw error;
      return data as ProjectRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", activeCompanyId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["work_reviews"] });
    },
  });
}
