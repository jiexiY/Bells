import { WorkspaceProgress } from "@/components/dashboard/WorkspaceProgress";
import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { TaskAssignmentSection } from "@/components/dashboard/TaskAssignmentSection";
import { CreateProjectSection } from "@/components/dashboard/CreateProjectSection";

import { ReviewTaskDialog } from "@/components/dashboard/ReviewTaskDialog";
import { useProjects, useUpdateProject } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import type { TaskRow } from "@/hooks/useTasks";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanies } from "@/hooks/useCompanies";
import { useMembers } from "@/hooks/useMembers";
import { FolderCheck, Clock, CheckCircle2, BarChart3, Search, CalendarDays, Copy, Check as CheckIcon, TrendingUp, Users, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export default function ProjectLeadDashboard() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: tasks = [] } = useTasks();
  const updateProject = useUpdateProject();
  const [activeTab, setActiveTab] = useState("all");
  const [showCards, setShowCards] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [codeCopied, setCodeCopied] = useState(false);
  const [reviewTask, setReviewTask] = useState<TaskRow | null>(null);
  const { activeCompanyId } = useCompany();
  const { data: companies = [] } = useCompanies();
  const activeCompany = companies.find(c => c.id === activeCompanyId);
  const { data: allMembers = [] } = useMembers();
  const teamLeadsAndMembers = allMembers.filter(m => m.role === "team_lead" || m.role === "member");

  const handleCopyInviteCode = () => {
    if (activeCompany?.invite_code) {
      navigator.clipboard.writeText(activeCompany.invite_code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const assignedProjects = projects.filter((p) => p.status === "assigned");
  const inProgressProjects = projects.filter((p) => p.status === "in_progress");
  const pendingApprovalProjects = projects.filter((p) => p.status === "pending_approval");
  const needRevisionProjects = projects.filter((p) => p.status === "need_revision");
  const completeProjects = projects.filter((p) => p.status === "complete");
  const avgProgress = tasks.length ? Math.round(tasks.filter(t => ["completed", "approved"].includes(t.status)).length / tasks.length * 100) : 0;
  const completionRate = projects.length ? Math.round((completeProjects.length / projects.length) * 100) : 0;

  const toProject = (p: typeof projects[0]) => ({
    id: p.id,
    name: p.name,
    description: p.description || "",
    status: p.status as any,
    progress: p.progress,
    leadId: p.lead_id || "",
    leadName: p.lead_name || "",
    department: p.department,
    createdAt: p.created_at,
    dueDate: p.due_date,
  });

  const tabs = [
    { key: "all", label: "All", count: projects.length },
    { key: "assigned", label: "Assigned", count: assignedProjects.length },
    { key: "in_progress", label: "In Progress", count: inProgressProjects.length },
    { key: "pending_approval", label: "Pending Approval", count: pendingApprovalProjects.length },
    { key: "need_revision", label: "Need Revision", count: needRevisionProjects.length },
    { key: "complete", label: "Completed", count: completeProjects.length },
  ];

  const getActiveList = () => {
    switch (activeTab) {
      case "assigned": return assignedProjects;
      case "in_progress": return inProgressProjects;
      case "pending_approval": return pendingApprovalProjects;
      case "need_revision": return needRevisionProjects;
      case "complete": return completeProjects;
      default: return projects;
    }
  };

  const filteredList = getActiveList().filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Loading...">
        <p className="text-muted-foreground">Loading projects...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Project Manager Dashboard" subtitle="Track projects, assess performance, and manage your organization">
      <WorkspaceProgress tasks={tasks} projects={projects} />
      {/* Invite Code Banner */}
      {activeCompany?.invite_code && (
        <div className="mb-6 flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 w-fit">
          <span className="text-sm font-medium text-foreground">Workspace Invite Code:</span>
          <code className="text-sm font-mono bg-card px-3 py-1.5 rounded border border-border tracking-widest font-semibold text-primary">
            {activeCompany.invite_code}
          </code>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleCopyInviteCode}>
            {codeCopied ? <CheckIcon className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
          </Button>
        </div>
      )}

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
        <StatsCard title="Total Projects" value={projects.length} icon={FolderCheck} description={`${assignedProjects.length} assigned`} />
        <StatsCard title="Completed" value={completeProjects.length} icon={CheckCircle2} description={`${completionRate}% completion rate`} />
        <StatsCard title="Avg. Progress" value={`${avgProgress}%`} icon={BarChart3} />
      </div>

      {/* Performance Assessment Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Performance Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Department Performance */}
            {["tech", "marketing", "research"].map(dept => {
              const deptProjects = projects.filter(p => p.department === dept);
              const deptTasks = tasks.filter(t => deptProjects.some(p => p.id === t.project_id));
              const deptCompleted = deptTasks.filter(t => ["completed", "approved"].includes(t.status)).length;
              const deptTotal = deptTasks.length;
              const deptRate = deptTotal > 0 ? Math.round((deptCompleted / deptTotal) * 100) : 0;
              const deptAvgProgress = deptProjects.length > 0
                ? Math.round(deptProjects.reduce((s, p) => s + p.progress, 0) / deptProjects.length)
                : 0;

              return (
                <div key={dept} className="p-4 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-primary" />
                    <h4 className="font-semibold capitalize text-sm">{dept} Department</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Projects</span>
                      <span className="font-medium">{deptProjects.length}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Task Completion</span>
                      <span className="font-medium">{deptCompleted}/{deptTotal} ({deptRate}%)</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Avg Progress</span>
                      <span className="font-medium">{deptAvgProgress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mt-1">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{ width: `${deptAvgProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Team Performance Overview */}
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Top Contributors
            </h4>
            <div className="space-y-2">
              {(() => {
                // Calculate per-member performance
                const memberStats = teamLeadsAndMembers.map(m => {
                  const memberTasks = tasks.filter(t => t.assigned_to === m.user_id);
                  const completed = memberTasks.filter(t => ["completed", "approved"].includes(t.status)).length;
                  const total = memberTasks.length;
                  const score = total > 0 ? Math.round((completed / total) * 100) : 0;
                  return { ...m, completed, total, score };
                })
                .filter(m => m.total > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 5);

                return memberStats.length > 0 ? memberStats.map(m => (
                  <div key={m.user_id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{m.role === "member" ? "Contributor" : m.role.replace("_", " ")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{m.score}%</p>
                      <p className="text-xs text-muted-foreground">{m.completed}/{m.total} tasks</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">No task data available yet</p>
                );
              })()}
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Project Cards Grid */}
      {showCards && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          {filteredList.map((p) => (
            <ProjectCard
              key={p.id}
              project={toProject(p)}
              showFeedbackActions={p.status === "pending_approval"}
             
            />
          ))}
          {filteredList.length === 0 && (
            <p className="text-muted-foreground col-span-full text-center py-12">No projects found</p>
          )}
        </div>
      )}

      {/* Projects Section */}
      <CreateProjectSection title="Projects" description="Manage your organization's projects" statusFilter={activeTab} />

      {/* Task Assignment Section */}
      <TaskAssignmentSection
        projects={projects.map(p => ({ id: p.id, name: p.name }))}
        assignees={teamLeadsAndMembers.map(m => ({ user_id: m.user_id, name: m.name, role: m.role }))}
        title="Individual Tasks"
        description="Create and assign tasks to team leads and members"
        onTaskClick={(task) => setReviewTask(task)}
        showAllTasks
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
                const dueDateProjects = projects.filter(p => {
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

      {/* Review Dialog */}
      {reviewTask && (
        <ReviewTaskDialog
          open={!!reviewTask}
          onOpenChange={(open) => { if (!open) setReviewTask(null); }}
          task={reviewTask}
        />
      )}
    </DashboardLayout>
  );
}
