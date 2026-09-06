import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, ExternalLink, CheckCircle, XCircle, MessageSquare, Clock, Download, Loader2, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useDeleteTask } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";
import { useTaskSubmissions } from "@/hooks/useTaskSubmissions";
import { useUpdateTask } from "@/hooks/useTasks";
import { toast } from "sonner";
import type { TaskRow } from "@/hooks/useTasks";
import { WorkReviewHistory } from "./WorkReviewHistory";

interface ReviewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskRow;
}

export function ReviewTaskDialog({ open, onOpenChange, task }: ReviewTaskDialogProps) {
  const { data: submissions = [], isLoading } = useTaskSubmissions(task.id);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [feedback, setFeedback] = useState("");
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const latestSubmission = submissions[0];

  const handleAction = (type: "approve" | "reject") => {
    const newStatus = type === "approve" ? "completed" : "need_revision";
    updateTask.mutate(
      { id: task.id, status: newStatus, review_feedback: feedback.trim() },
      {
        onSuccess: () => {
          toast.success(type === "approve" ? "Task approved" : "Task sent back for revision");
          setFeedback("");
          setAction(null);
          onOpenChange(false);
        },
        onError: (err: any) => toast.error(err.message || "Failed to update task"),
      }
    );
  };

  const getSubmissionIcon = (type: string) => {
    if (type === "file") return <FileText className="w-4 h-4 text-blue-500" />;
    if (type === "link") return <ExternalLink className="w-4 h-4 text-emerald-500" />;
    return <CheckCircle className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto [&>*]:min-w-0" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Review Submission</DialogTitle>
          <DialogDescription>{task.title}</DialogDescription>
          <p className="text-xs text-muted-foreground pt-1">
            Submitted by {task.assignee_name || "Unknown"} · Due {new Date(task.due_date).toLocaleDateString()}
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Latest Submission */}
            {latestSubmission ? (
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getSubmissionIcon(latestSubmission.submission_type)}
                    <span className="text-sm font-medium text-foreground capitalize">
                      {latestSubmission.submission_type === "none" ? "No attachment" : latestSubmission.submission_type} submission
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Attempt #{latestSubmission.attempt_number} · {new Date(latestSubmission.created_at).toLocaleString()}
                  </span>
                </div>

                {/* File preview */}
                {latestSubmission.submission_file_url && (
                  <div className="flex items-center gap-3 p-3 rounded-md bg-background border border-border">
                    <FileText className="w-8 h-8 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">Submitted File</p>
                      <p className="text-xs text-muted-foreground">Protected attachment</p>
                    </div>
                    <a href={latestSubmission.submission_file_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="gap-1">
                        <Download className="w-3.5 h-3.5" />
                        View
                      </Button>
                    </a>
                  </div>
                )}

                {/* Link preview */}
                {latestSubmission.submission_url && (
                  <div className="flex items-center gap-3 p-3 rounded-md bg-background border border-border">
                    <ExternalLink className="w-8 h-8 text-emerald-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">Shared Link</p>
                      <a href={latestSubmission.submission_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline truncate block">
                        {latestSubmission.submission_url}
                      </a>
                    </div>
                    <a href={latestSubmission.submission_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="gap-1">
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open
                      </Button>
                    </a>
                  </div>
                )}

                {/* Comment */}
                {latestSubmission.comment && (
                  <div className="flex items-start gap-2 text-sm">
                    <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground">{latestSubmission.comment}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                <p className="text-sm text-muted-foreground">No submission details found</p>
                <p className="text-xs text-muted-foreground mt-1">The member submitted using the legacy method</p>
              </div>
            )}

            {/* Previous submissions */}
            {submissions.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Previous Submissions</p>
                <ScrollArea className="max-h-32">
                  <div className="space-y-2">
                    {submissions.slice(1).map((s) => (
                      <div key={s.id} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/20 border border-border/50">
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium text-[10px]">
                          {s.attempt_number}
                        </div>
                        {getSubmissionIcon(s.submission_type)}
                        <span className="text-muted-foreground capitalize">{s.submission_type}</span>
                        {s.comment && <span className="text-muted-foreground truncate flex-1">— {s.comment}</span>}
                        <span className="text-muted-foreground ml-auto">{new Date(s.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <WorkReviewHistory taskId={task.id} />
            {/* Feedback */}
            <div className="space-y-2">
              <Label>Feedback <span className="text-muted-foreground font-normal">(required for revision)</span></Label>
              <Textarea
                placeholder="Add feedback for the member..."
                value={feedback}
                maxLength={4000}
                onChange={(e) => setFeedback(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 border-destructive/30"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10 border-destructive/30"
                onClick={() => handleAction("reject")}
                disabled={updateTask.isPending || task.status !== "pending_approval" || !feedback.trim()}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Revision
              </Button>
              <Button
                size="sm"
                onClick={() => handleAction("approve")}
                disabled={updateTask.isPending || task.status !== "pending_approval"}
              >
                {updateTask.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                Approve
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                deleteTask.mutate(task.id, {
                  onSuccess: () => {
                    toast.success("Task deleted");
                    setShowDeleteConfirm(false);
                    onOpenChange(false);
                  },
                  onError: (err: any) => toast.error(err.message || "Failed to delete task"),
                });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
