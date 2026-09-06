import { ProgressBar } from "./ProgressBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WorkspaceProgress({ tasks, projects }: { tasks: { status: string }[]; projects: { status: string }[] }) {
  const taskCount = tasks.filter(task => ["completed", "approved"].includes(task.status)).length;
  const projectCount = projects.filter(project => project.status === "complete").length;
  const taskProgress = tasks.length ? Math.round(taskCount / tasks.length * 100) : 0;
  const projectProgress = projects.length ? Math.round(projectCount / projects.length * 100) : 0;
  return <Card className="mb-6 border-primary/20 bg-card"><CardHeader className="pb-3"><CardTitle className="text-base">Workplace progress</CardTitle><p className="text-xs text-muted-foreground">Submitted work counts after approval. Project completion requires the manager's final review.</p></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
    <div><div className="mb-2 flex justify-between text-sm"><span>Tasks approved · {taskCount}/{tasks.length}</span><strong>{taskProgress}%</strong></div><ProgressBar value={taskProgress} showLabel={false} /></div>
    <div><div className="mb-2 flex justify-between text-sm"><span>Projects approved · {projectCount}/{projects.length}</span><strong>{projectProgress}%</strong></div><ProgressBar value={projectProgress} showLabel={false} /></div>
  </CardContent></Card>;
}
