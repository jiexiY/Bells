import { useState } from "react";
import { useProjects, useUpdateProject } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProgressBar } from "./ProgressBar";
import { StatusBadge } from "./StatusBadge";
import { WorkReviewHistory } from "./WorkReviewHistory";
import { toast } from "sonner";

export function ProjectWorkflow({ projectId }: { projectId: string }) {
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { activeRole } = useCompany();
  const { user } = useAuth();
  const update = useUpdateProject();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const project = projects.find(item => item.id === projectId);
  if (!project) return null;
  const projectTasks = tasks.filter(task => task.project_id === projectId);
  const approved = projectTasks.filter(task => ["completed", "approved"].includes(task.status)).length;
  const ready = projectTasks.length > 0 && approved === projectTasks.length;
  const canSubmit = activeRole === "team_lead" && project.lead_id === user?.id && !["pending_approval", "complete"].includes(project.status);
  const canReview = activeRole === "project_lead" && project.status === "pending_approval";
  async function transition(status: "pending_approval" | "need_revision" | "complete") {
    try {
      await update.mutateAsync({ id: projectId, status, ...(status === "pending_approval" ? { submission_comment: comment.trim() } : { review_feedback: comment.trim() }) });
      toast.success(status === "pending_approval" ? "Project submitted to the manager" : status === "complete" ? "Project approved" : "Revision requested with feedback");
      setOpen(false); setComment("");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to update project"); }
  }
  return <><Button size="sm" variant="outline" className="w-full" onClick={() => { setComment(""); setOpen(true); }}>{canReview ? "Review project" : canSubmit && ready ? project.status === "need_revision" ? "Revise & resubmit project" : "Submit project" : "View project"}</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
      <DialogHeader><DialogTitle>{project.name}</DialogTitle><DialogDescription>Team lead: {project.lead_name || "Unassigned"}</DialogDescription></DialogHeader>
      <div className="space-y-4">
        <div><h3 className="mb-1 text-sm font-semibold">Goals & requirements</h3><p className="whitespace-pre-wrap text-sm text-muted-foreground">{project.description || "No requirements added."}</p></div>
        <div><div className="mb-2 flex justify-between text-sm"><span>Approved tasks · {approved}/{projectTasks.length}</span><strong>{project.progress}%</strong></div><ProgressBar value={project.progress} showLabel={false} /></div>
        {project.submission_comment && <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm"><strong>Lead's submission</strong><p className="mt-1 whitespace-pre-wrap">{project.submission_comment}</p></div>}
        {project.review_feedback && <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-sm text-purple-950 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-100"><strong>Manager feedback</strong><p className="mt-1 whitespace-pre-wrap">{project.review_feedback}</p></div>}
        <div className="space-y-2">{projectTasks.map(task => <div key={task.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"><div><p className="font-medium">{task.title}</p><p className="text-xs text-muted-foreground">{task.assignee_name || "Unassigned"}</p></div><StatusBadge status={task.status as any} type="task" /></div>)}</div>
        <WorkReviewHistory projectId={projectId} />
        {(canSubmit || canReview) && <div className="space-y-2"><Label htmlFor={`project-feedback-${projectId}`}>{canReview ? "Review feedback (required for revision)" : "Submission summary"}</Label><Textarea id={`project-feedback-${projectId}`} rows={3} maxLength={4000} value={comment} onChange={event => setComment(event.target.value)} placeholder={canReview ? "Explain what needs to change..." : "Summarize the completed work or how you addressed feedback..."} /></div>}
        {canSubmit && !ready && <p className="text-sm text-muted-foreground">All project tasks need approval before you submit to the manager.</p>}
        <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Close</Button>{canSubmit && <Button disabled={!ready || update.isPending} onClick={() => transition("pending_approval")}>{project.status === "need_revision" ? "Resubmit to manager" : "Submit to manager"}</Button>}{canReview && <><Button variant="outline" disabled={!comment.trim() || update.isPending} onClick={() => transition("need_revision")}>Request revision</Button><Button disabled={!ready || update.isPending} onClick={() => transition("complete")}>Approve project</Button></>}</div>
      </div>
    </DialogContent></Dialog>
  </>;
}
