import { Project } from "@/types/project";
import { StatusBadge } from "./StatusBadge";
import { ProgressBar } from "./ProgressBar";
import { ProjectWorkflow } from "./ProjectWorkflow";
import { useTasks } from "@/hooks/useTasks";
import { Calendar, Users } from "lucide-react";

interface ProjectCardProps { project: Project; showFeedbackActions?: boolean; }
export function ProjectCard({ project }: ProjectCardProps) {
  const { data: tasks = [] } = useTasks();
  const members = new Set(tasks.filter(task => task.project_id === project.id && task.assigned_to).map(task => task.assigned_to));
  return <div className="flex h-full flex-col justify-between rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
    <div><div className="mb-1.5 flex items-center justify-between gap-2"><h3 className="truncate text-base font-semibold text-foreground">{project.name}</h3><StatusBadge status={project.status} type="project" /></div><p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{project.description}</p></div>
    <div className="space-y-4"><div><div className="mb-1.5 flex items-center justify-between text-sm"><span className="font-medium text-muted-foreground">Approved task progress</span><span className="font-semibold">{project.progress}%</span></div><ProgressBar value={project.progress} showLabel={false} size="sm" /></div>
      <div className="flex items-center justify-between text-sm text-muted-foreground"><span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{members.size} assigned</span><span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{new Date(project.dueDate).toLocaleDateString("en-US", {month:"short",day:"numeric"})}</span></div>
      <span className="inline-block rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{project.leadName || "Unassigned"}</span>
      <ProjectWorkflow projectId={project.id} />
    </div>
  </div>;
}
