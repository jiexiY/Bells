import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NotificationRow {
  id: string;
  user_id: string;
  company_id: string | null;
  type: string;
  title: string;
  message: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as NotificationRow[];
    },
  });
}

export function useUnreadCountByCompany() {
  const { data: notifications = [] } = useNotifications();
  const counts: Record<string, number> = {};
  notifications.filter(n => !n.is_read && n.company_id).forEach(n => {
    counts[n.company_id!] = (counts[n.company_id!] || 0) + 1;
  });
  return counts;
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
