import { useState, useRef, useEffect } from "react";
import { useConversations, useConversationMessages, useSendMessage, useMarkMessagesRead } from "@/hooks/useMessages";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Send, Plus, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

function useCompanyMembers(companyId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["company-members", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data: memberships, error } = await supabase
        .from("company_memberships")
        .select("user_id")
        .eq("company_id", companyId!)
        .eq("is_active", true);
      if (error) throw error;

      const userIds = memberships.map((m) => m.user_id).filter((id) => id !== user?.id);
      if (userIds.length === 0) return [];

      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", userIds);
      if (pErr) throw pErr;
      return profiles || [];
    },
  });
}

export function MessagesPanel() {
  const { activeCompanyId } = useCompany();
  const { user } = useAuth();
  const { data: conversations = [] } = useConversations(activeCompanyId || undefined);
  const [activePartner, setActivePartner] = useState<string | null>(null);
  const [newMsgDialogOpen, setNewMsgDialogOpen] = useState(false);

  const activeConv = conversations.find((c) => c.partner_id === activePartner);

  if (activePartner) {
    return (
      <ActiveConversation
        companyId={activeCompanyId!}
        partnerId={activePartner}
        partnerName={activeConv?.partner_name || ""}
        onBack={() => setActivePartner(null)}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <MessageSquare className="h-4 w-4" /> Messages
        </h3>
        <NewMessageDialog
          companyId={activeCompanyId || undefined}
          open={newMsgDialogOpen}
          onOpenChange={setNewMsgDialogOpen}
          onSelect={(id) => {
            setActivePartner(id);
            setNewMsgDialogOpen(false);
          }}
        />
      </div>

      <ScrollArea className="h-[300px]">
        <div className="space-y-1 pr-2">
          {conversations.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No messages yet</p>
          )}
          {conversations.map((conv) => (
            <button
              key={conv.partner_id}
              onClick={() => setActivePartner(conv.partner_id)}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent text-left transition-colors"
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{conv.partner_name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{conv.partner_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{conv.last_message}</p>
              </div>
              {conv.unread_count > 0 && (
                <Badge variant="destructive" className="text-xs h-5 min-w-5 flex items-center justify-center">
                  {conv.unread_count}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function ActiveConversation({
  companyId,
  partnerId,
  partnerName,
  onBack,
}: {
  companyId: string;
  partnerId: string;
  partnerName: string;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const { data: messages = [] } = useConversationMessages(companyId, partnerId);
  const sendMessage = useSendMessage();
  const markRead = useMarkMessagesRead(companyId, partnerId);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mark as read on open and when new messages arrive
  useEffect(() => {
    markRead.mutate();
  }, [messages.length]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = () => {
    if (!text.trim() || !user) return;
    sendMessage.mutate({
      company_id: companyId,
      sender_id: user.id,
      receiver_id: partnerId,
      content: text.trim(),
    });
    setText("");
  };

  return (
    <div className="flex flex-col h-[360px]">
      <div className="flex items-center gap-2 pb-2 border-b">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-xs">{partnerName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">{partnerName}</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto py-2 space-y-2">
        {messages.map((m) => {
          const isMine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-3 py-1.5 text-sm",
                  isMine ? "bg-primary text-primary-foreground" : "bg-muted"
                )}
              >
                <p>{m.content}</p>
                <p className={cn("text-[10px] mt-0.5", isMine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 pt-2 border-t">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="h-8 text-sm"
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
        />
        <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleSend} disabled={!text.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function NewMessageDialog({
  companyId,
  open,
  onOpenChange,
  onSelect,
}: {
  companyId: string | undefined;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (userId: string) => void;
}) {
  const { data: members = [] } = useCompanyMembers(companyId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost"><Plus className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-xs">
        <DialogHeader><DialogTitle>New Message</DialogTitle></DialogHeader>
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-1">
            {members.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No teammates found</p>}
            {members.map((m) => (
              <button
                key={m.user_id}
                onClick={() => onSelect(m.user_id)}
                className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent text-left transition-colors"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">{m.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
