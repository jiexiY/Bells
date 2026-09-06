import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AnnouncementRow {
  id: string;
  company_id: string;
  project_id: string | null;
  title: string;
  content: string;
  created_by: string;
  target_role: "project_lead" | "team_lead" | "member" | null;
  created_at: string;
}

export interface AnnouncementReadRow {
  id: string;
  announcement_id: string;
  user_id: string;
  read_at: string;
}

export function useAnnouncements(companyId?: string) {
  return useQuery({
    queryKey: ["announcements", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AnnouncementRow[];
    },
  });
}

export function useAnnouncementReads(announcementIds: string[]) {
  return useQuery({
    queryKey: ["announcement_reads", announcementIds],
    enabled: announcementIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcement_reads")
        .select("*")
        .in("announcement_id", announcementIds);
      if (error) throw error;
      return data as AnnouncementReadRow[];
    },
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (announcement: Omit<AnnouncementRow, "id" | "created_at" | "created_by">) => {
      const { error } = await supabase
        .from("announcements")
        .insert([{ ...announcement, created_by: user!.id }]);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}

export function useMarkAnnouncementRead() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (announcementId: string) => {
      const { error } = await supabase
        .from("announcement_reads")
        .upsert({ announcement_id: announcementId, user_id: user!.id }, { onConflict: "announcement_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcement_reads"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
