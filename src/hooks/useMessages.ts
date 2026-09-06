import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export interface Message {
  id: string;
  company_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  partner_id: string;
  partner_name: string;
  partner_email: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export function useConversations(companyId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["conversations", companyId],
    enabled: !!companyId && !!user,
    queryFn: async () => {
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .eq("company_id", companyId!)
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch profiles for partner names
      const partnerIds = new Set<string>();
      (messages as Message[]).forEach((m) => {
        partnerIds.add(m.sender_id === user!.id ? m.receiver_id : m.sender_id);
      });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", Array.from(partnerIds));

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      // Group by partner
      const convMap = new Map<string, Conversation>();
      (messages as Message[]).forEach((m) => {
        const partnerId = m.sender_id === user!.id ? m.receiver_id : m.sender_id;
        if (!convMap.has(partnerId)) {
          const profile = profileMap.get(partnerId);
          convMap.set(partnerId, {
            partner_id: partnerId,
            partner_name: profile?.name || "Unknown",
            partner_email: profile?.email || "",
            last_message: m.content,
            last_message_at: m.created_at,
            unread_count: 0,
          });
        }
        if (m.receiver_id === user!.id && !m.is_read) {
          const conv = convMap.get(partnerId)!;
          conv.unread_count++;
        }
      });

      return Array.from(convMap.values()).sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!companyId || !user) return;
    const channel = supabase
      .channel(`messages-${companyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `company_id=eq.${companyId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["conversations", companyId] });
          queryClient.invalidateQueries({ queryKey: ["conversation-messages", companyId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [companyId, user, queryClient]);

  return query;
}

export function useConversationMessages(companyId: string | undefined, partnerId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["conversation-messages", companyId, partnerId],
    enabled: !!companyId && !!partnerId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("company_id", companyId!)
        .or(
          `and(sender_id.eq.${user!.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user!.id})`
        )
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (msg: { company_id: string; sender_id: string; receiver_id: string; content: string }) => {
      const { error } = await supabase.from("messages").insert(msg);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversation-messages"] });
    },
  });
}

export function useMarkMessagesRead(companyId: string | undefined, partnerId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!companyId || !partnerId || !user) return;
      const { error } = await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("company_id", companyId)
        .eq("sender_id", partnerId)
        .eq("receiver_id", user.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations", companyId] });
    },
  });
}

export function useTotalUnreadCount(companyId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["unread-messages-count", companyId],
    enabled: !!companyId && !!user,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId!)
        .eq("receiver_id", user!.id)
        .eq("is_read", false);
      if (error) throw error;
      return count || 0;
    },
  });
}
