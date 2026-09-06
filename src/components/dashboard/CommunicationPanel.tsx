import { useState } from "react";
import { useAnnouncements, useAnnouncementReads, useCreateAnnouncement, useMarkAnnouncementRead } from "@/hooks/useAnnouncements";
import { useTotalUnreadCount } from "@/hooks/useMessages";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Megaphone, Plus, Check, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { MessagesPanel } from "./MessagesPanel";

export function CommunicationPanel() {
  const { activeCompanyId, activeRole } = useCompany();
  const { user } = useAuth();
  const { data: announcements = [] } = useAnnouncements(activeCompanyId || undefined);
  const announcementIds = announcements.map(a => a.id);
  const { data: reads = [] } = useAnnouncementReads(announcementIds);
  const createAnnouncement = useCreateAnnouncement();
  const markRead = useMarkAnnouncementRead();
  const { data: unreadMsgCount = 0 } = useTotalUnreadCount(activeCompanyId || undefined);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const isLead = activeRole === "project_lead" || activeRole === "team_lead";

  const myReads = reads.filter(r => r.user_id === user?.id);
  const unreadAnnouncements = announcements.filter(a =>
    a.created_by !== user?.id && !myReads.some(r => r.announcement_id === a.id)
  );

  const handleCreate = () => {
    if (!title.trim() || !content.trim() || !activeCompanyId) return;
    createAnnouncement.mutate({
      company_id: activeCompanyId,
      project_id: null,
      title,
      content,
      target_role: null,
    }, {
      onSuccess: () => {
        setTitle("");
        setContent("");
        setDialogOpen(false);
      },
    });
  };

  const handleMarkRead = (announcementId: string) => {
    markRead.mutate(announcementId);
  };

  return (
    <Tabs defaultValue="announcements" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="announcements" className="flex-1 gap-1">
          Announcements
          {unreadAnnouncements.length > 0 && (
            <Badge variant="destructive" className="text-[10px] h-4 min-w-4 px-1">{unreadAnnouncements.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="messages" className="flex-1 gap-1">
          Messages
          {unreadMsgCount > 0 && (
            <Badge variant="destructive" className="text-[10px] h-4 min-w-4 px-1">{unreadMsgCount}</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="announcements">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Megaphone className="h-4 w-4" /> Announcements
            </h3>
            {isLead && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost"><Plus className="h-4 w-4" /></Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title" />
                    </div>
                    <div className="space-y-2">
                      <Label>Content</Label>
                      <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write your announcement..." rows={4} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreate}>Post</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <ScrollArea className="h-[300px]">
            <div className="space-y-3 pr-2">
              {announcements.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No announcements yet</p>
              )}
              {announcements.map(a => {
                const isRead = a.created_by === user?.id || myReads.some(r => r.announcement_id === a.id);
                const readCount = reads.filter(r => r.announcement_id === a.id).length;
                const isAuthor = a.created_by === user?.id;

                return (
                  <Card key={a.id} className={cn("transition-colors", !isRead && "border-primary/50 bg-primary/5")}>
                    <CardContent className="p-3 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-medium">{a.title}</h4>
                        {!isRead && (
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => handleMarkRead(a.id)}>
                            <Check className="h-3 w-3 mr-1" /> Read
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{a.content}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                        {isAuthor && (
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" /> {readCount} read
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </TabsContent>

      <TabsContent value="messages">
        <MessagesPanel />
      </TabsContent>
    </Tabs>
  );
}
