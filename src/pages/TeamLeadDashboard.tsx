import { WorkspaceProgress } from "@/components/dashboard/WorkspaceProgress";
import { ProjectWorkflow } from "@/components/dashboard/ProjectWorkflow";
import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ProgressBar } from "@/components/dashboard/ProgressBar";
import { TaskAssignmentSection } from "@/components/dashboard/TaskAssignmentSection";
import { CreateProjectSection } from "@/components/dashboard/CreateProjectSection";
import { ProjectStatusTracker } from "@/components/dashboard/ProjectStatusTracker";
import { ReviewTaskDialog } from "@/components/dashboard/ReviewTaskDialog";
import { SubmitForApprovalDialog } from "@/components/dashboard/SubmitForApprovalDialog";
import { useProjects, useUpdateProject } from "@/hooks/useProjects";
import { useTasks, useUpdateTask } from "@/hooks/useTasks";
import type { TaskRow } from "@/hooks/useTasks";
import { useMembers } from "@/hooks/useMembers";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { FolderCheck, Clock, CheckCircle2, Users, Search, CalendarDays, BarChart3, ArrowUpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/types/project";

export default function TeamLeadDashboard() {
  const { user } = useAuth();
  const { activeDepartment } = useCompany();
  const dept = activeDepartment;
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const updateProject = useUpdateProject();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: members = [] } = useMembers(dept || undefined);
  const updateTask = useUpdateTask();

  const [activeTab, setActiveTab] = useState("all");
  const [showCards, setShowCards] = useState(true); // cards visible by default for "all"
  const [searchQuery, setSearchQuery] = useState("");
  const [reviewTask, setReviewTask] = useState<TaskRow | null>(null);
  const [submitDialogTask, setSubmitDialogTask] = useState<TaskRow | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const departmentProjects = projects;
  const departmentTasks = tasks.filter((t) => departmentProjects.some((p) => p.id === t.project_id));
  // Individual tasks = tasks NOT linked to any project (standalone tasks from Individual Tasks section)
  const individualTasks = tasks.filter((t) => !t.project_id);

  // Map task statuses to tab categories
  const getTaskTabKey = (status: string): string => {
    switch (status) {
      case "unchecked":
      case "incomplete": return "assigned";
      case "in_progress": return "in_progress";
      case "pending_approval": return "pending_approval";
      case "need_revision":
      case "declined": return "need_revision";
      case "completed":
      case "approved": return "complete";
      default: return "assigned";
    }
  };

  // Combined items (projects + individual tasks) as a unified type
  type StatusItem = { type: "project"; data: typeof departmentProjects[0] } | { type: "task"; data: TaskRow };
  const allItems: StatusItem[] = [
    ...departmentProjects.map(p => ({ type: "project" as const, data: p })),
    ...individualTasks.map(t => ({ type: "task" as const, data: t })),
  ];

  const getItemTabKey = (item: StatusItem) =>
    item.type === "project" ? item.data.status : getTaskTabKey(item.data.status);

  const assignedItems = allItems.filter(i => getItemTabKey(i) === "assigned");
  const inProgressItems = allItems.filter(i => getItemTabKey(i) === "in_progress");
  const pendingApprovalItems = allItems.filter(i => getItemTabKey(i) === "pending_approval");
  const needRevisionItems = allItems.filter(i => getItemTabKey(i) === "need_revision");
  const completeItems = allItems.filter(i => getItemTabKey(i) === "complete");

  const avgProgress = tasks.length ? Math.round(tasks.filter(t => ["completed", "approved"].includes(t.status)).length / tasks.length * 100) : 0;
  const tabs = [
    { key: "all", label: "All", count: allItems.length },
    { key: "assigned", label: "Assigned", count: assignedItems.length },
    { key: "in_progress", label: "In Progress", count: inProgressItems.length },
    { key: "pending_approval", label: "Pending Approval", count: pendingApprovalItems.length },
    { key: "need_revision", label: "Need Revision", count: needRevisionItems.length },
    { key: "complete", label: "Completed", count: completeItems.length },
  ];

  const getActiveItems = (): StatusItem[] => {
    switch (activeTab) {
      case "assigned": return assignedItems;
      case "in_progress": return inProgressItems;
      case "pending_approval": return pendingApprovalItems;
      case "need_revision": return needRevisionItems;
      case "complete": return completeItems;
      default: return allItems;
    }
  };

  const filteredItems = getActiveItems().filter(item => {
    const name = item.type === "project" ? item.data.name : item.data.title;
    const desc = item.type === "project" ? (item.data.description || "") : (item.data.description || "");
    return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      desc.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleTaskStatusChange = (taskId: string, status: string) => {
    updateTask.mutate({ id: taskId, status: status as any });
  };

  if (projectsLoading || tasksLoading) {
    return <DashboardLayout title="Team Lead Dashboard" subtitle="Loading..."><p className="text-muted-foreground">Loading...</p></DashboardLayout>;
  }

  return (
    <DashboardLayout title="Team Lead Dashboard" subtitle={`${(dept || "").charAt(0).toUpperCase() + (dept || "").slice(1)} Department — Manage projects, assign tasks, and report progress`}>
      <WorkspaceProgress tasks={tasks} projects={departmentProjects} />
      {tasks.some(task => task.status === "pending_approval" && task.assigned_to !== user?.id) && <Card className="mb-6 border-primary/25"><CardContent className="p-5"><h2 className="mb-3 font-semibold">Ready for your review</h2><div className="space-y-2">{tasks.filter(task => task.status === "pending_approval" && task.assigned_to !== user?.id).map(task => <div key={task.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"><div><p className="text-sm font-medium">{task.title}</p><p className="text-xs text-muted-foreground">{task.assignee_name}</p></div><Button size="sm" onClick={() => setReviewTask(task)}>Review {task.title}</Button></div>)}</div></CardContent></Card>}

      {/* Search bar */}
      <div className="mb-6">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
        <StatsCard title="Department Projects" value={departmentProjects.length} icon={FolderCheck} />
        <StatsCard title="Completed" value={completeItems.length} icon={CheckCircle2} description={`${allItems.length ? Math.round((completeItems.length / allItems.length) * 100) : 0}% completion rate`} />
        <StatsCard title="Avg. Progress" value={`${avgProgress}%`} icon={BarChart3} />
      </div>


      {/* Project Status Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {tabs.map((tab) => {
          const colorMap: Record<string, string> = {
            all: "bg-primary",
            assigned: "bg-amber-500",
            in_progress: "bg-blue-500",
            pending_approval: "bg-orange-500",
            need_revision: "bg-purple-500",
            complete: "bg-emerald-500",
          };
          return (
            <button
              key={tab.key}
              onClick={() => {
                if (activeTab === tab.key) {
                  setShowCards(!showCards);
                } else {
                  setActiveTab(tab.key);
                  setShowCards(true);
                }
              }}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg transition-colors border",
                activeTab === tab.key
                  ? "bg-muted border-primary/40 shadow-sm"
                  : "bg-muted/50 border-border hover:bg-muted/80"
              )}
            >
              <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", colorMap[tab.key] || "bg-primary")} />
              <div className="min-w-0 text-left">
                <p className="text-xs text-muted-foreground truncate">{tab.label}</p>
                <p className="text-sm font-semibold text-foreground">{tab.count}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Cards for projects and tasks - toggle visibility on tab click */}
      {showCards && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          {filteredItems.map((item) => {
            if (item.type === "project") {
              const p = item.data;
              const projectTasks = departmentTasks.filter(t => t.project_id === p.id);
              const completedTasks = projectTasks.filter(t => t.status === "completed" || t.status === "approved");
              const taskProgress = projectTasks.length ? Math.round((completedTasks.length / projectTasks.length) * 100) : 0;
              return (
                <Card key={`project-${p.id}`} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-foreground truncate text-base">{p.name}</h3>
                      <StatusBadge status={p.status as any} type="project" />
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-muted-foreground font-medium">Project Progress</span>
                        <span className="font-semibold text-foreground">{p.progress}%</span>
                      </div>
                      <ProgressBar value={p.progress} showLabel={false} size="sm" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-muted-foreground font-medium">Tasks ({completedTasks.length}/{projectTasks.length})</span>
                        <span className="font-semibold text-foreground">{taskProgress}%</span>
                      </div>
                      <ProgressBar value={taskProgress} showLabel={false} size="sm" />
                    </div>
                    {p.review_feedback && <p className="rounded-lg bg-purple-50 p-3 text-sm text-purple-900 dark:bg-purple-950 dark:text-purple-100">Manager feedback: {p.review_feedback}</p>}
                    <ProjectWorkflow projectId={p.id} />
                  </CardContent>
                </Card>
              );
            } else {
              const t = item.data;
              const isOwnTask = t.assigned_to === user?.id;
              const canSubmit = isOwnTask && ["in_progress", "need_revision", "incomplete", "unchecked"].includes(t.status);
              return (
                <Card
                  key={`task-${t.id}`}
                  className="hover:shadow-md transition-shadow border-l-4 border-l-accent cursor-pointer"
                  onClick={() => {
                    if (isOwnTask) {
                      // Own tasks: open submit dialog if submittable, otherwise just view
                      if (canSubmit) setSubmitDialogTask(t);
                    } else {
                      setReviewTask(t);
                    }
                  }}
                >
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                        <h3 className="font-semibold text-foreground truncate text-base">{t.title}</h3>
                      </div>
                      <StatusBadge status={t.status as any} type="task" />
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>
                    {t.assignee_name && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span>{t.assignee_name}{isOwnTask ? " (You)" : ""}</span>
                      </div>
                    )}
                    {t.due_date && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarDays className="w-3.5 h-3.5" />
                        <span>{new Date(t.due_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {canSubmit && (
                      <Button size="sm" variant="outline" className="mt-1 gap-1.5"
                        onClick={(e) => { e.stopPropagation(); setSubmitDialogTask(t); }}>
                        <ArrowUpCircle className="w-3.5 h-3.5" />
                        Submit for Approval
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            }
          })}
          {filteredItems.length === 0 && (
            <p className="text-muted-foreground col-span-full text-center py-12">No items found</p>
          )}
        </div>
      )}

      {/* Projects Section */}
      <CreateProjectSection title="Projects" description="Manage your department's projects" statusFilter={activeTab} />

      {/* Task Assignment Section */}
      <TaskAssignmentSection
        projects={departmentProjects.map(p => ({ id: p.id, name: p.name }))}
        assignees={members.map(m => ({ user_id: m.user_id, name: m.name, role: m.role }))}
        title="Individual Tasks"
        description="Create and assign tasks to your team members"
        onTaskClick={(task) => setReviewTask(task)}
      />

      {/* Project Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Project Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-lg border border-border"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-3">
                {selectedDate?.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </h3>
              {(() => {
                const dueDateProjects = departmentProjects.filter(p => {
                  const due = new Date(p.due_date);
                  return selectedDate && due.toDateString() === selectedDate.toDateString();
                });
                const dueDateTasks = tasks.filter(t => {
                  const due = new Date(t.due_date);
                  return selectedDate && due.toDateString() === selectedDate.toDateString();
                });
                return dueDateProjects.length > 0 || dueDateTasks.length > 0 ? (
                  <div className="space-y-2">
                    {dueDateProjects.map(p => (
                      <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-sm font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">Project</span>
                      </div>
                    ))}
                    {dueDateTasks.map(t => (
                      <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-2 h-2 rounded-full bg-accent" />
                        <span className="text-sm font-medium">{t.title}</span>
                        <span className="text-xs text-muted-foreground ml-auto">Task</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No events on this date</p>
                );
              })()}
            </div>
          </div>
        </CardContent>
      </Card>

       {/* Review Dialog (for tasks assigned to others) */}
       {reviewTask && (
         <ReviewTaskDialog
           open={!!reviewTask}
           onOpenChange={(open) => { if (!open) setReviewTask(null); }}
           task={reviewTask}
         />
       )}

       {/* Submit Dialog (for own tasks) */}
       {submitDialogTask && (
         <SubmitForApprovalDialog
           open={!!submitDialogTask}
           onOpenChange={(open) => { if (!open) setSubmitDialogTask(null); }}
           taskId={submitDialogTask.id}
           taskTitle={submitDialogTask.title}
         />
       )}
     </DashboardLayout>
   );
 }
