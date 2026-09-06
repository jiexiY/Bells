import { useState, useCallback } from "react";
import { Plus, FolderPlus, UserPlus, ChevronDown, ChevronRight, ListTodo, CalendarDays, User, FileText, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useProjects, useCreateProject } from "@/hooks/useProjects";
import { useTasks, useCreateTask, useDeleteTask } from "@/hooks/useTasks";
import { useMembers } from "@/hooks/useMembers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/types/project";
import { useCompany } from "@/contexts/CompanyContext";
import { ReviewTaskDialog } from "./ReviewTaskDialog";

interface CreateProjectSectionProps {
  title?: string;
  description?: string;
  statusFilter?: string;
}

export function CreateProjectSection({
  title = "Create Project",
  description = "Create a new project for your team",
  statusFilter,
}: CreateProjectSectionProps) {
  const { user, profileName } = useAuth();
  const { activeRole } = useCompany();
  const createProject = useCreateProject();
  const createTask = useCreateTask();
  const deleteTask = useDeleteTask();
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: allMembers = [] } = useMembers();
  const members = activeRole === "team_lead" ? allMembers.filter(member => member.role === "member" && member.reports_to === user?.id) : allMembers;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    department: "" as "tech" | "marketing" | "research" | "",
    dueDate: "",
    leadId: "",
  });

  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<typeof tasks[0] | null>(null);
  const [reviewTaskId, setReviewTaskId] = useState<string | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskProjectId, setTaskProjectId] = useState("");
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assignedTo: "",
    dueDate: "",
  });

  const handleCreate = () => {
    if (!form.name.trim() || !form.department || !form.dueDate || !form.leadId) return;
    const lead = members.find(member => member.user_id === form.leadId && member.role === "team_lead");
    if (!lead) { toast.error("Choose a team lead first"); return; }
    createProject.mutate(
      {
        name: form.name,
        description: form.description || null,
        department: lead.department as "tech" | "marketing" | "research",
        due_date: form.dueDate,
        status: "assigned",
        progress: 0,
        lead_id: lead.user_id,
        lead_name: lead.name,
      },
      {
        onSuccess: () => {
          toast.success("Project created successfully");
          setForm({ name: "", description: "", department: "", dueDate: "", leadId: "" });
          setDialogOpen(false);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleAssignTask = () => {
    if (!taskForm.title || !taskForm.dueDate) return;
    const member = members.find((m) => m.user_id === taskForm.assignedTo);
    createTask.mutate(
      {
        title: taskForm.title,
        description: taskForm.description || null,
        status: "incomplete",
        project_id: taskProjectId || null,
        assigned_to: taskForm.assignedTo || null,
        assigned_by: user?.id || null,
        assignee_name: member?.name || "",
        due_date: taskForm.dueDate,
      },
      {
        onSuccess: () => {
          toast.success("Task assigned successfully");
          setTaskForm({ title: "", description: "", assignedTo: "", dueDate: "" });
          setTaskDialogOpen(false);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const openTaskDialog = (projectId: string) => {
    setTaskProjectId(projectId);
    setTaskForm({ title: "", description: "", assignedTo: "", dueDate: "" });
    setTaskDialogOpen(true);
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjectId((prev) => (prev === projectId ? null : projectId));
  };

  const filteredProjects = statusFilter && statusFilter !== "all"
    ? projects.filter(p => p.status === statusFilter)
    : projects;
  const hasProjects = filteredProjects.length > 0;

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderPlus className="w-5 h-5 text-primary" />
            {title}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className={activeRole !== "project_lead" ? "hidden" : undefined}>
              <Plus className="w-4 h-4 mr-1" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
              <DialogDescription>Set up a new project for your organization</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Project Name</Label>
                <Input
                  placeholder="Enter project name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe the project..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select disabled value={form.department}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tech">Tech</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="research">Research</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-team-lead">Assign team lead</Label>
                <select id="project-team-lead" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.leadId} onChange={event => { const lead=members.find(member => member.user_id===event.target.value); setForm({...form,leadId:event.target.value,department:lead?.department || form.department}); }}>
                  <option value="">Select a team lead</option>{members.filter(member => member.role === "team_lead").map(member => <option key={member.user_id} value={member.user_id}>{member.name} · {member.department}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!form.name.trim() || !form.department || !form.dueDate || !form.leadId || createProject.isPending}>
                {createProject.isPending ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {!hasProjects ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Click "New Project" to create and assign a project to your team.
          </p>
        ) : (
          <div className="space-y-2">
            {filteredProjects.map((project) => {
              const projectTasks = tasks.filter((t) => t.project_id === project.id);
              const isExpanded = expandedProjectId === project.id;

              return (
                <div key={project.id} className="rounded-lg border border-border bg-muted/30 overflow-hidden transition-all">
                  {/* Project Row - Clickable */}
                  <button
                    onClick={() => toggleProject(project.id)}
                    className="w-full flex items-center gap-3 p-3 sm:p-4 text-left hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex-shrink-0 text-muted-foreground">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-foreground truncate">{project.name}</h4>
                      {project.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{project.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground hidden sm:inline-flex items-center gap-1">
                        <ListTodo className="w-3 h-3" />
                        {projectTasks.length}
                      </span>
                      <StatusBadge status={project.status as any} type="project" />
                    </div>
                  </button>

                  {/* Expanded Tasks Panel */}
                  {isExpanded && (
                    <div className="border-t border-border bg-background/50 px-3 sm:px-4 pb-3 sm:pb-4">
                      <div className="flex items-center justify-between pt-3 pb-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Tasks ({projectTasks.length})
                        </span>
                        <Button
                          disabled={["pending_approval", "complete"].includes(project.status)}
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTaskDialog(project.id);
                          }}
                        >
                          <UserPlus className="w-3 h-3 mr-1" />
                          Assign Task
                        </Button>
                      </div>

                      {projectTasks.length === 0 ? (
                        <div className="text-center py-6">
                          <ListTodo className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                          <p className="text-xs text-muted-foreground">No tasks assigned yet</p>
                        </div>
                      ) : (
                        <ScrollArea className="max-h-[280px]">
                          <div className="space-y-1.5">
                            {projectTasks.map((task) => (
                              <button
                                key={task.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (task.status === "pending_approval") setReviewTaskId(task.id);
                                  else setSelectedTask(task);
                                }}
                                className="w-full flex items-center gap-3 text-xs p-2.5 rounded-md bg-card border border-border/50 hover:border-primary/40 hover:bg-muted/50 transition-colors cursor-pointer text-left"
                              >
                                <div className="flex-1 min-w-0">
                                  <span className={cn(
                                    "block truncate",
                                    (task.status === "completed" || task.status === "approved")
                                      ? "text-muted-foreground line-through"
                                      : "text-foreground"
                                  )}>{task.title}</span>
                                  {task.assignee_name && (
                                    <span className="text-[10px] text-muted-foreground">{task.assignee_name}</span>
                                  )}
                                </div>
                                <span className="ml-auto shrink-0">
                                  <StatusBadge status={task.status as TaskStatus} type="task" />
                                </span>
                              </button>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Assign Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Task</DialogTitle>
            <DialogDescription>
              Create a task for {projects.find(p => p.id === taskProjectId)?.name || "this project"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Task Title</Label>
              <Input
                placeholder="Enter task title"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the task..."
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={taskForm.assignedTo} onValueChange={(v) => setTaskForm({ ...taskForm, assignedTo: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.name} ({m.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignTask} disabled={!taskForm.title || !taskForm.dueDate || createTask.isPending}>
              {createTask.isPending ? "Assigning..." : "Assign Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {reviewTaskId && tasks.find(task => task.id === reviewTaskId) && <ReviewTaskDialog open onOpenChange={open => { if (!open) setReviewTaskId(null); }} task={tasks.find(task => task.id === reviewTaskId)!} />}
      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => { if (!open) setSelectedTask(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {selectedTask?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <StatusBadge status={selectedTask.status as TaskStatus} type="task" />
              </div>
              {selectedTask.description && (
                <div className="space-y-1">
                  <span className="text-sm font-medium text-foreground">Description</span>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedTask.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground text-xs">Due Date</p>
                    <p className="font-medium text-foreground">{new Date(selectedTask.due_date).toLocaleDateString()}</p>
                  </div>
                </div>
                {selectedTask.assignee_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-xs">Assigned To</p>
                      <p className="font-medium text-foreground">{selectedTask.assignee_name}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground text-xs">Created</p>
                  <p className="font-medium text-foreground">{new Date(selectedTask.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 border-destructive/30"
              onClick={() => {
                if (selectedTask) setDeleteTaskId(selectedTask.id);
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedTask(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={(open) => { if (!open) setDeleteTaskId(null); }}>
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
                if (deleteTaskId) {
                  deleteTask.mutate(deleteTaskId, {
                    onSuccess: () => {
                      toast.success("Task deleted");
                      setSelectedTask(null);
                    },
                    onError: (err) => toast.error(err.message),
                  });
                }
                setDeleteTaskId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
