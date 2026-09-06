import { useState } from "react";
import { useDocuments, useDocumentAnnotations, useUpdateDocumentStatus, useCreateAnnotation, useUploadDocument } from "@/hooks/useDocuments";
import { useProjects } from "@/hooks/useProjects";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileCheck, Upload, MessageSquare, CheckCircle, AlertCircle, Clock, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { DocumentRow } from "@/hooks/useDocuments";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: Clock },
  in_review: { label: "In Review", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", icon: AlertCircle },
  revision_needed: { label: "Revision Needed", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: AlertCircle },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckCircle },
};

function DocumentDetail({ doc, onClose }: { doc: DocumentRow; onClose: () => void }) {
  const { activeRole } = useCompany();
  const { data: annotations = [] } = useDocumentAnnotations(doc.id);
  const updateStatus = useUpdateDocumentStatus();
  const createAnnotation = useCreateAnnotation();
  const [note, setNote] = useState("");
  const [highlightText, setHighlightText] = useState("");

  const isLead = activeRole === "project_lead" || activeRole === "team_lead";

  const handleAddNote = () => {
    if (!note.trim()) return;
    createAnnotation.mutate({
      document_id: doc.id,
      content: note,
      page_number: null,
      position_x: null,
      position_y: null,
      highlight_text: highlightText || null,
    }, { onSuccess: () => { setNote(""); setHighlightText(""); } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg">{doc.title}</h3>
          <p className="text-sm text-muted-foreground">
            by {doc.submitted_by_name} · {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
          </p>
        </div>
        <Badge className={cn("text-xs", statusConfig[doc.status]?.color)}>
          {statusConfig[doc.status]?.label}
        </Badge>
      </div>

      {doc.description && <p className="text-sm text-muted-foreground">{doc.description}</p>}

      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
        View File: {doc.file_name}
      </a>

      {isLead && doc.status !== "completed" && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: doc.id, status: "in_review" })}>
            Mark In Review
          </Button>
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => updateStatus.mutate({ id: doc.id, status: "revision_needed" })}>
            Request Revision
          </Button>
          <Button size="sm" onClick={() => updateStatus.mutate({ id: doc.id, status: "completed" })}>
            <CheckCircle className="h-4 w-4 mr-1" /> Mark Completed
          </Button>
        </div>
      )}

      <Separator />

      <div>
        <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> Annotations ({annotations.length})
        </h4>
        <ScrollArea className="h-[200px] mb-3">
          <div className="space-y-2 pr-2">
            {annotations.map(a => (
              <Card key={a.id}>
                <CardContent className="p-3 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{a.user_name}</span>
                    <span>{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                  </div>
                  {a.highlight_text && (
                    <p className="text-xs italic border-l-2 border-primary pl-2 text-muted-foreground">"{a.highlight_text}"</p>
                  )}
                  <p className="text-sm">{a.content}</p>
                </CardContent>
              </Card>
            ))}
            {annotations.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No annotations yet</p>}
          </div>
        </ScrollArea>

        <div className="space-y-2">
          <Input placeholder="Quote/highlight text (optional)" value={highlightText} onChange={e => setHighlightText(e.target.value)} className="text-sm" />
          <div className="flex gap-2">
            <Textarea placeholder="Add a note..." value={note} onChange={e => setNote(e.target.value)} rows={2} className="text-sm flex-1" />
            <Button size="sm" onClick={handleAddNote} disabled={!note.trim()} className="self-end">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DocumentSubmissionPanel() {
  const { activeCompanyId } = useCompany();
  const { data: documents = [] } = useDocuments(activeCompanyId || undefined);
  const { data: projects = [] } = useProjects();
  const uploadDoc = useUploadDocument();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRow | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSubmit = () => {
    if (!selectedFile || !title.trim() || !activeCompanyId) return;
    uploadDoc.mutate({
      file: selectedFile,
      companyId: activeCompanyId,
      projectId: projectId || undefined,
      title,
      description,
    }, {
      onSuccess: () => {
        setTitle("");
        setDescription("");
        setProjectId("");
        setSelectedFile(null);
        setUploadOpen(false);
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <FileCheck className="h-4 w-4" /> Document Review
        </h3>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost"><Upload className="h-4 w-4" /></Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit Document for Review</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} /></div>
              <div className="space-y-2">
                <Label>Project (optional)</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>File</Label><Input type="file" onChange={e => setSelectedFile(e.target.files?.[0] || null)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={uploadDoc.isPending}>{uploadDoc.isPending ? "Submitting..." : "Submit"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {selectedDoc ? (
        <div>
          <Button variant="ghost" size="sm" className="mb-2" onClick={() => setSelectedDoc(null)}>← Back</Button>
          <DocumentDetail doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
        </div>
      ) : (
        <ScrollArea className="h-[300px]">
          <div className="space-y-2 pr-2">
            {documents.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No documents submitted yet</p>}
            {documents.map(doc => {
              const StatusIcon = statusConfig[doc.status]?.icon || Clock;
              return (
                <Card key={doc.id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setSelectedDoc(doc)}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <StatusIcon className={cn("h-5 w-5 shrink-0",
                      doc.status === "completed" ? "text-emerald-500" :
                      doc.status === "revision_needed" ? "text-red-500" :
                      doc.status === "in_review" ? "text-amber-500" : "text-blue-500"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{doc.submitted_by_name} · {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}</p>
                    </div>
                    <Badge className={cn("text-[10px] shrink-0", statusConfig[doc.status]?.color)}>
                      {statusConfig[doc.status]?.label}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
