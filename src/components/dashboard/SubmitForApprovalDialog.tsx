import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Link2, CheckCircle, Loader2, Clock, FileText, ExternalLink, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUpdateTask } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useTaskSubmissions } from "@/hooks/useTaskSubmissions";
import { ScrollArea } from "@/components/ui/scroll-area";

type SubmissionMode = "file" | "link" | "none";

interface SubmitForApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
}

export function SubmitForApprovalDialog({ open, onOpenChange, taskId, taskTitle }: SubmitForApprovalDialogProps) {
  const [mode, setMode] = useState<SubmissionMode | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const updateTask = useUpdateTask();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const { data: submissions = [] } = useTaskSubmissions(taskId);

  const attemptNumber = submissions.length + 1;

  const reset = () => {
    setMode(null);
    setLinkUrl("");
    setFile(null);
    setComment("");
    setUploading(false);
    setShowHistory(false);
  };

  const handleClose = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  const handleSubmit = async () => {
    if (!mode || !user || !activeCompanyId) return;

    try {
      setUploading(true);
      let submissionFileUrl: string | null = null;
      let submissionUrl: string | null = null;

      if (mode === "file" && file) {
        const filePath = `${activeCompanyId}/submissions/${taskId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("project-files")
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        submissionFileUrl = filePath;
      } else if (mode === "link") {
        submissionUrl = linkUrl;
      }

      // Submission history, attempt number, and status commit in one transaction.
      await updateTask.mutateAsync({
        id: taskId, status: "pending_approval", submission_type: mode,
        submission_url: submissionUrl, submission_file_url: submissionFileUrl, comment: comment.trim(),
      });
      toast.success("Work submitted for review");
      handleClose(false);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const canSubmit = mode === "none" || (mode === "link" && /^https?:\/\/\S+$/i.test(linkUrl.trim())) || (mode === "file" && file);

  const options: { key: SubmissionMode; label: string; description: string; icon: React.ReactNode }[] = [
    { key: "file", label: "Upload a File", description: "Attach a document, image, or other file", icon: <Upload className="w-5 h-5" /> },
    { key: "link", label: "Share a Link", description: "Provide a URL to your work", icon: <Link2 className="w-5 h-5" /> },
    { key: "none", label: "Submit Without Attachment", description: "Send your work for review with a note", icon: <CheckCircle className="w-5 h-5" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit for Approval</DialogTitle>
          <DialogDescription className="line-clamp-1">{taskTitle}</DialogDescription>
          {submissions.length > 0 && (
            <p className="text-xs text-muted-foreground pt-1">
              Attempt #{attemptNumber} · 
              <button onClick={() => setShowHistory(!showHistory)} className="text-primary hover:underline ml-1">
                {showHistory ? "Hide" : "View"} submission history ({submissions.length})
              </button>
            </p>
          )}
        </DialogHeader>

        {/* Submission History */}
        {showHistory && submissions.length > 0 && (
          <ScrollArea className="max-h-48 rounded-lg border border-border">
            <div className="p-3 space-y-3">
              {submissions.map((s) => (
                <div key={s.id} className="flex gap-2 text-xs">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium">
                    {s.attempt_number}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      {s.submission_type === "file" && <FileText className="w-3 h-3 text-blue-500" />}
                      {s.submission_type === "link" && <ExternalLink className="w-3 h-3 text-emerald-500" />}
                      {s.submission_type === "none" && <CheckCircle className="w-3 h-3 text-muted-foreground" />}
                      <span className="capitalize text-foreground font-medium">{s.submission_type === "none" ? "No attachment" : s.submission_type}</span>
                      <span className="text-muted-foreground ml-auto">{new Date(s.created_at).toLocaleDateString()}</span>
                    </div>
                    {s.submission_url && (
                      <a href={s.submission_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block">{s.submission_url}</a>
                    )}
                    {s.submission_file_url && (
                      <a href={s.submission_file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block">View file</a>
                    )}
                    {s.comment && (
                      <p className="text-muted-foreground flex items-start gap-1"><MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />{s.comment}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Submission Options */}
        <div className="space-y-3 py-2">
          {options.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setMode(opt.key)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
                mode === opt.key
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:border-primary/40 hover:bg-muted/50 text-foreground"
              )}
            >
              <div className={cn(
                "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                mode === opt.key ? "bg-primary/10" : "bg-muted"
              )}>
                {opt.icon}
              </div>
              <div>
                <p className="font-medium text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </div>
            </button>
          ))}
        </div>

        {mode === "file" && (
          <div className="space-y-2">
            <Label>Choose File</Label>
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="cursor-pointer"
            />
            {file && <p className="text-xs text-muted-foreground">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
          </div>
        )}

        {mode === "link" && (
          <div className="space-y-2">
            <Label>URL</Label>
            <Input
              type="url"
              placeholder="https://..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
          </div>
        )}

        {/* Comment field (always visible when a mode is selected) */}
        {mode && (
          <div className="space-y-2">
            <Label>Comment <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea
              placeholder="Add a note about your submission..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || uploading || updateTask.isPending}>
            {uploading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Uploading...</> : `Submit (#${attemptNumber})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
