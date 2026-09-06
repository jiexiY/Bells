import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { BarChart3, CalendarDays, Calendar as CalendarIcon, CheckCircle2, ChevronDown, ChevronRight, ClipboardList, FolderCheck, FolderOpen, ListTodo, Pencil, Plus, RotateCcw, Search, Target, TrendingUp, Users } from "lucide-react";
import { DemoSidebar } from "@/components/demo/DemoSidebar";
import { DemoSupportPanels } from "@/components/demo/DemoSupportPanels";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ProgressBar } from "@/components/dashboard/ProgressBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ProjectStatus, TaskStatus as BadgeTaskStatus } from "@/types/project";

const TASK_STATUSES = ["To do", "In progress", "In review", "Need revision", "Approved"] as const;
const DEPARTMENTS = ["tech", "marketing", "research"] as const;
const PROJECT_STATUSES: { key: ProjectStatus | "all"; label: string; color: string }[] = [
  { key: "all", label: "All", color: "bg-primary" },
  { key: "assigned", label: "Assigned", color: "bg-amber-500" },
  { key: "in_progress", label: "In Progress", color: "bg-blue-500" },
  { key: "pending_approval", label: "Pending Approval", color: "bg-orange-500" },
  { key: "need_revision", label: "Need Revision", color: "bg-purple-500" },
  { key: "complete", label: "Completed", color: "bg-emerald-500" },
];
type DemoView = "dashboard" | "messages" | "announcements" | "documents" | "members" | "settings";
type DemoRole = "project_lead" | "team_lead" | "member";
type Department = typeof DEPARTMENTS[number];
type TaskStatus = typeof TASK_STATUSES[number];
type DemoTask = { id: string; title: string; description: string; status: TaskStatus; owner: string; tag: string; projectId: string; dueDate: string; reviewNote: string };
type DemoProject = { id: string; name: string; description: string; status: ProjectStatus; department: Department; leadId: string; dueDate: string; reviewNote: string };
type DemoState = { version: 2; projects: DemoProject[]; tasks: DemoTask[]; activity: string[] };
interface GuestDemoPageProps {
  organizationName?: string;
  storageKey?: string;
  panelStorageKey?: string;
  initialRole?: DemoRole;
  initialDepartment?: Department;
  seedSampleData?: boolean;
  onSwitchOrganization?: () => void;
}
type TaskForm = { id?: string; title: string; description: string; owner: string; projectId: string; dueDate: string };
type ProjectForm = { id?: string; name: string; description: string; department: Department; leadId: string; dueDate: string };
const TEAM = [
  { id: "maya", name: "Employee X", initials: "X", role: "Project Manager", department: "research" },
  { id: "alex", name: "Employee Y", initials: "Y", role: "Team Lead", department: "tech" },
  { id: "jordan", name: "Employee Z", initials: "Z", role: "Team Lead", department: "marketing" },
  { id: "you", name: "You", initials: "You", role: "Contributor", department: "tech" },
] as const;
const SELECT_STYLE = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
const TASK_BADGE: Record<TaskStatus, BadgeTaskStatus> = { "To do": "incomplete", "In progress": "in_progress", "In review": "pending_approval", "Need revision": "need_revision", Approved: "approved" };
const ROLE_HEADINGS: Record<DemoRole, { title: string; subtitle: string }> = {
  project_lead: { title: "Project Manager Dashboard", subtitle: "Track projects, assess performance, and manage your organization" },
  team_lead: { title: "Team Lead Dashboard", subtitle: "Manage your department's projects and coordinate your team" },
  member: { title: "My Tasks", subtitle: "Track your assignments, update progress, and submit work for review" },
};
const PANEL_HEADINGS: Record<Exclude<DemoView, "dashboard">, { title: string; subtitle: string }> = {
  messages: { title: "Messages", subtitle: "Keep conversations connected to your team's work" },
  announcements: { title: "Announcements", subtitle: "Share updates with your organization" },
  documents: { title: "Documents", subtitle: "Organize documents and review submissions" },
  members: { title: "Members", subtitle: "View the people and roles in your organization" },
  settings: { title: "Settings", subtitle: "Manage your demo workspace preferences" },
};

function dateAfter(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function displayDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function personName(id: string) { return TEAM.find(person => person.id === id)?.name || "Unassigned"; }
function makeId(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
function sampleState(): DemoState {
  return {
    version: 2,
    projects: [
      { id: "demo-platform", name: "Website Launch", description: "Build the homepage and onboarding experience for the demo team.", status: "in_progress", department: "tech", leadId: "alex", dueDate: dateAfter(7), reviewNote: "" },
      { id: "demo-outreach", name: "Community Outreach", description: "Prepare launch communications and coordinate the team handoff.", status: "pending_approval", department: "marketing", leadId: "jordan", dueDate: dateAfter(4), reviewNote: "" },
      { id: "demo-research", name: "User Research", description: "Define the audience, project requirements, and launch brief.", status: "complete", department: "research", leadId: "maya", dueDate: dateAfter(0), reviewNote: "Research brief approved for the sample launch." },
    ],
    tasks: [
      { id: "sample-brief", title: "Define the launch brief", description: "Document the target audience, deliverables, and acceptance criteria for the launch.", status: "Approved", owner: "maya", tag: "Strategy", projectId: "demo-research", dueDate: dateAfter(0), reviewNote: "Launch requirements approved." },
      { id: "sample-homepage", title: "Design the homepage", description: "Prepare the homepage layout, product overview, and primary action for team review.", status: "In progress", owner: "alex", tag: "Design", projectId: "demo-platform", dueDate: dateAfter(3), reviewNote: "" },
      { id: "sample-welcome", title: "Review the welcome message", description: "Review the sample onboarding message for clarity, tone, and consistency with the launch brief.", status: "In review", owner: "jordan", tag: "Content", projectId: "demo-outreach", dueDate: dateAfter(2), reviewNote: "" },
      { id: "sample-checklist", title: "Build the onboarding checklist", description: "List the steps for joining a workspace, finding assigned tasks, and submitting work for review.", status: "To do", owner: "you", tag: "Experience", projectId: "demo-platform", dueDate: dateAfter(5), reviewNote: "" },
      { id: "sample-handoff", title: "Prepare the team handoff", description: "Collect the launch brief, final designs, and welcome copy. Assign owners to the remaining follow-up items.", status: "To do", owner: "maya", tag: "Planning", projectId: "demo-outreach", dueDate: dateAfter(4), reviewNote: "" },
    ],
    activity: ["Sample organization created. All names and project data are fictional."],
  };
}
function validText(value: unknown, max: number, required = false): value is string {
  return typeof value === "string" && value.length <= max && (!required || value.trim().length > 0);
}
function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime());
}
function validLegacyTask(task: DemoTask) {
  return task && validText(task.id, 120, true) && validText(task.title, 90, true) && validText(task.description, 600)
    && TASK_STATUSES.includes(task.status) && TEAM.some(person => person.id === task.owner) && validText(task.tag, 30);
}
function initialDemoState(seedSampleData: boolean): DemoState {
  return seedSampleData ? sampleState() : { version: 2, projects: [], tasks: [], activity: [] };
}
function loadDemo(storageKey: string, seedSampleData: boolean): DemoState {
  const initialState = () => initialDemoState(seedSampleData);
  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey) || "null");
    if (!stored || !Array.isArray(stored.tasks) || stored.tasks.length > 100
      || !stored.tasks.every(validLegacyTask) || new Set(stored.tasks.map((task: DemoTask) => task.id)).size !== stored.tasks.length) return initialState();
    const activity = Array.isArray(stored.activity) ? stored.activity.filter((item: unknown) => typeof item === "string").slice(0, 5).map((item: string) => item.slice(0, 200)) : [];
    if (stored.version === 1) {
      if (!seedSampleData || stored.tasks.length === 0) return initialState();
      const initial = sampleState();
      return { ...initial, tasks: stored.tasks.map((task: DemoTask) => {
        const original = initial.tasks.find(item => item.id === task.id);
        return { ...task, projectId: original?.projectId || "demo-platform", dueDate: original?.dueDate || dateAfter(7), reviewNote: "" };
      }), activity };
    }
    if (stored.version !== 2 || !Array.isArray(stored.projects) || stored.projects.length > 30) return initialState();
    const projectsValid = stored.projects.every((project: DemoProject) => project && validText(project.id, 120, true) && validText(project.name, 90, true)
      && validText(project.description, 600) && PROJECT_STATUSES.some(status => status.key !== "all" && status.key === project.status)
      && DEPARTMENTS.includes(project.department) && TEAM.some(person => person.id === project.leadId) && validDate(project.dueDate) && validText(project.reviewNote, 600));
    if (!projectsValid || new Set(stored.projects.map((project: DemoProject) => project.id)).size !== stored.projects.length) return initialState();
    if (!stored.tasks.every((task: DemoTask) => stored.projects.some((project: DemoProject) => project.id === task.projectId) && validDate(task.dueDate) && validText(task.reviewNote, 600))) return initialState();
    return { version: 2, projects: stored.projects, tasks: stored.tasks, activity };
  } catch { return initialState(); }
}
function Modal({ title, description, children, onClose }: { title: string; description: string; children: ReactNode; onClose: () => void }) {
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-lg sm:max-w-lg">
    <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>{children}
  </DialogContent></Dialog>;
}

export default function GuestDemoPage({
  organizationName = "Bells Demo Organization",
  storageKey = "bells-demo-v1",
  panelStorageKey = "bells-demo-panels-v1",
  initialRole = "project_lead",
  initialDepartment = "tech",
  seedSampleData = true,
  onSwitchOrganization,
}: GuestDemoPageProps = {}) {
  const [demo, setDemo] = useState(() => loadDemo(storageKey, seedSampleData));
  const [view, setView] = useState<DemoView>("dashboard");
  const [role, setRole] = useState<DemoRole>(initialRole);
  const [resetVersion, setResetVersion] = useState(0);
  const [resetOpen, setResetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ProjectStatus | "all">("all");
  const [showCards, setShowCards] = useState(true);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [taskForm, setTaskForm] = useState<TaskForm | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectForm | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [reviewProjectId, setReviewProjectId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [storageWarning, setStorageWarning] = useState(false);
  const heading = view === "dashboard" ? ROLE_HEADINGS[role] : PANEL_HEADINGS[view];
  const scopedProjects = demo.projects.filter(project => role === "project_lead" || (role === "team_lead" ? project.department === initialDepartment : demo.tasks.some(task => task.projectId === project.id && task.owner === "you")));
  const scopedTasks = demo.tasks.filter(task => scopedProjects.some(project => project.id === task.projectId) && (role !== "member" || task.owner === "you"));
  const query = searchQuery.trim().toLowerCase();
  const filteredProjects = scopedProjects.filter(project => (activeTab === "all" || project.status === activeTab)
    && (!query || `${project.name} ${project.description}`.toLowerCase().includes(query) || scopedTasks.some(task => task.projectId === project.id && `${task.title} ${task.description}`.toLowerCase().includes(query))));
  const visibleTasks = scopedTasks.filter(task => (!query || `${task.title} ${task.description} ${demo.projects.find(project => project.id === task.projectId)?.name} ${personName(task.owner)}`.toLowerCase().includes(query))
    && (activeTab === "all" || demo.projects.find(project => project.id === task.projectId)?.status === activeTab));
  const completedProjects = scopedProjects.filter(project => project.status === "complete").length;
  const approvedTasks = scopedTasks.filter(task => task.status === "Approved").length;
  const selectedTask = demo.tasks.find(task => task.id === selectedTaskId);
  const reviewProject = demo.projects.find(project => project.id === reviewProjectId);
  const progressFor = (project: DemoProject) => {
    if (project.status === "complete") return 100;
    const tasks = demo.tasks.filter(task => task.projectId === project.id);
    return tasks.length ? Math.round(tasks.filter(task => task.status === "Approved").length / tasks.length * 100) : 0;
  };
  const averageProgress = scopedProjects.length ? Math.round(scopedProjects.reduce((sum, project) => sum + progressFor(project), 0) / scopedProjects.length) : 0;
  const organizationTeam = seedSampleData ? TEAM : TEAM.filter(person => person.id === "you");
  const memberOptions = role === "member" ? organizationTeam.filter(person => person.id === "you") : role === "team_lead" ? organizationTeam.filter(person => person.id === "you" || person.department === initialDepartment) : organizationTeam;
  const projectLeadOptions = seedSampleData ? TEAM.filter(person => person.id !== "you") : organizationTeam;
  const departmentLabel = initialDepartment.charAt(0).toUpperCase() + initialDepartment.slice(1);
  const taskStatusOptions = (current: TaskStatus) => TASK_STATUSES.filter(status => role !== "member" || status === current || ["To do", "In progress", "In review"].includes(status));

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify(demo)); setStorageWarning(false); }
    catch { setStorageWarning(true); }
  }, [demo, storageKey]);
  useEffect(() => {
    const previous = document.title;
    document.title = "Bells — Demo Workspace";
    return () => { document.title = previous; };
  }, []);

  function changeRole(nextRole: DemoRole) {
    setRole(nextRole); setView("dashboard"); setSearchQuery(""); setActiveTab("all"); setShowCards(true); setExpandedProjectId(null);
  }
  function updateTaskStatus(task: DemoTask, status: TaskStatus, note = task.reviewNote) {
    if (role === "member" && (task.owner !== "you" || ["Approved", "Need revision"].includes(status))) return;
    const message = status === "Approved" ? `Approved “${task.title}”.` : `Moved “${task.title}” to ${status.toLowerCase()}.`;
    setDemo(current => ({ ...current, tasks: current.tasks.map(item => item.id === task.id ? { ...item, status, reviewNote: note.slice(0, 600) } : item),
      projects: current.projects.map(project => project.id === task.projectId && project.status === "complete" && status !== "Approved" ? { ...project, status: "in_progress" } : project),
      activity: [message, ...current.activity].slice(0, 5) }));
    setNotice(message);
  }
  function updateProjectStatus(project: DemoProject, status: ProjectStatus, note = project.reviewNote) {
    if (role === "member") return;
    const message = `Updated “${project.name}” to ${PROJECT_STATUSES.find(item => item.key === status)?.label.toLowerCase()}.`;
    setDemo(current => ({ ...current, projects: current.projects.map(item => item.id === project.id ? { ...item, status, reviewNote: note.slice(0, 600) } : item),
      tasks: status === "complete" ? current.tasks.map(task => task.projectId === project.id ? { ...task, status: "Approved" } : task) : current.tasks,
      activity: [message, ...current.activity].slice(0, 5) }));
    setNotice(message);
  }
  function openTaskForm(projectId?: string, task?: DemoTask) {
    setFormError(""); setSelectedTaskId(null);
    const selectedProjectId = task?.projectId || projectId || scopedProjects[0]?.id;
    if (!selectedProjectId) { setNotice("Create a project first, then add a task."); return; }
    setTaskForm(task ? { id: task.id, title: task.title, description: task.description, owner: task.owner, projectId: task.projectId, dueDate: task.dueDate }
      : { title: "", description: "", owner: "you", projectId: selectedProjectId, dueDate: dateAfter(7) });
  }
  function saveTask(event: FormEvent) {
    event.preventDefault();
    if (!taskForm) return;
    if (!taskForm.title.trim()) { setFormError("Give your task a title."); return; }
    if (!validDate(taskForm.dueDate)) { setFormError("Choose a valid due date."); return; }
    if (!demo.projects.some(project => project.id === taskForm.projectId) || !TEAM.some(person => person.id === taskForm.owner)) { setFormError("Choose a project and assignee."); return; }
    if (!taskForm.id && demo.tasks.length >= 100) { setFormError("This demo holds up to 100 tasks. Reset it to start again."); return; }
    const existing = demo.tasks.find(task => task.id === taskForm.id);
    const task: DemoTask = { id: existing?.id || makeId("guest-task"), title: taskForm.title.trim().slice(0, 90), description: taskForm.description.trim().slice(0, 600), status: existing?.status || "To do", owner: taskForm.owner,
      tag: existing?.tag || "Your task", projectId: taskForm.projectId, dueDate: taskForm.dueDate, reviewNote: existing?.reviewNote || "" };
    const message = `${existing ? "Updated" : "Created"} “${task.title}”.`;
    setDemo(current => ({ ...current, tasks: existing ? current.tasks.map(item => item.id === task.id ? task : item) : [...current.tasks, task],
      projects: current.projects.map(project => project.id === task.projectId && project.status === "complete" && task.status !== "Approved" ? { ...project, status: "in_progress" } : project),
      activity: [message, ...current.activity].slice(0, 5) }));
    setTaskForm(null); setSearchQuery(""); setActiveTab("all"); setView("dashboard"); setNotice(message);
  }
  function openProjectForm(project?: DemoProject) {
    setFormError("");
    setProjectForm(project ? { id: project.id, name: project.name, description: project.description, department: project.department, leadId: project.leadId, dueDate: project.dueDate }
      : { name: "", description: "", department: initialDepartment, leadId: seedSampleData ? (TEAM.find(person => person.id !== "you" && person.department === initialDepartment)?.id || "alex") : "you", dueDate: dateAfter(14) });
  }
  function saveProject(event: FormEvent) {
    event.preventDefault();
    if (!projectForm) return;
    if (!projectForm.name.trim()) { setFormError("Give your project a name."); return; }
    if (!validDate(projectForm.dueDate)) { setFormError("Choose a valid due date."); return; }
    if (!projectForm.id && demo.projects.length >= 30) { setFormError("This demo holds up to 30 projects. Reset it to start again."); return; }
    const existing = demo.projects.find(project => project.id === projectForm.id);
    const project: DemoProject = { id: existing?.id || makeId("guest-project"), name: projectForm.name.trim().slice(0, 90), description: projectForm.description.trim().slice(0, 600), department: projectForm.department,
      leadId: projectForm.leadId, dueDate: projectForm.dueDate, status: existing?.status || "assigned", reviewNote: existing?.reviewNote || "" };
    const message = `${existing ? "Updated" : "Created"} project “${project.name}”.`;
    setDemo(current => ({ ...current, projects: existing ? current.projects.map(item => item.id === project.id ? project : item) : [...current.projects, project], activity: [message, ...current.activity].slice(0, 5) }));
    setProjectForm(null); setSearchQuery(""); setActiveTab("all"); setShowCards(true); setExpandedProjectId(project.id); setNotice(message);
  }
  function openTask(task: DemoTask) { setSelectedTaskId(task.id); setReviewNote(task.reviewNote); }
  function openProjectReview(project: DemoProject) { setReviewProjectId(project.id); setReviewNote(project.reviewNote); }
  function resetDemo() {
    try { window.localStorage.removeItem(panelStorageKey); } catch { /* The demo also works without browser storage. */ }
    setDemo(initialDemoState(seedSampleData)); setResetVersion(value => value + 1); setResetOpen(false); setTaskForm(null); setProjectForm(null); setSelectedTaskId(null); setReviewProjectId(null);
    setView("dashboard"); setRole(initialRole); setSearchQuery(""); setActiveTab("all"); setShowCards(true); setExpandedProjectId(null); setNotice(seedSampleData ? "Demo reset. Your original sample projects and tasks are back." : "Demo reset. This organization is empty again.");
  }
  function taskRow(task: DemoTask, compact = false) {
    const project = demo.projects.find(item => item.id === task.projectId);
    return <div key={task.id} className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
      <button className="min-w-0 flex-1 space-y-1 text-left hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded" onClick={() => openTask(task)} aria-label={`${compact ? "Open project task" : "Open task"}: ${task.title}`}>
        <span className="flex flex-wrap items-center gap-2"><span className={cn("text-sm font-medium", task.status === "Approved" && "text-muted-foreground line-through")}>{task.title}</span><StatusBadge status={TASK_BADGE[task.status]} type="task" /></span>
        <span className="block text-xs text-muted-foreground">{personName(task.owner)} · {project?.name} · Due {displayDate(task.dueDate)}</span>
      </button>
      {!compact && <select className={cn(SELECT_STYLE, "h-9 w-full sm:w-36 shrink-0 text-xs")} value={task.status} aria-label={`Status for ${task.title}`} onChange={event => updateTaskStatus(task, event.target.value as TaskStatus)}>
        {taskStatusOptions(task.status).map(status => <option key={status}>{status}</option>)}
      </select>}
    </div>;
  }

  return <div className="min-h-screen flex bg-background">
    <a href="#demo-main" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-20 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2">Skip to workspace</a>
    <DemoSidebar view={view} onViewChange={setView} role={role} onRoleChange={changeRole} organizationName={organizationName} onSwitchOrganization={onSwitchOrganization} />
    <main id="demo-main" className="min-w-0 flex-1 lg:ml-0">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 pl-12 lg:mb-8 lg:pl-0"><h1 className="text-2xl font-bold text-foreground sm:text-3xl">{heading.title}</h1><p className="mt-1 text-muted-foreground">{heading.subtitle}</p></div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-sm text-foreground"><strong>Demo workspace</strong><span className="text-muted-foreground"> · Fictional data. Changes stay in this browser.</span></p>
          <Button size="sm" variant="outline" onClick={() => setResetOpen(true)}><RotateCcw className="h-4 w-4" />Reset demo</Button>
        </div>
        {storageWarning && <p className="mb-4 text-sm text-destructive" role="status">Browser storage is unavailable. Changes will last for this visit only.</p>}
        {view !== "dashboard" ? <DemoSupportPanels view={view} resetVersion={resetVersion} storageKey={panelStorageKey} seedSampleData={seedSampleData} /> : <>
          {role !== "project_lead" && <p className="mb-4 text-sm text-muted-foreground">{role === "team_lead" ? `Viewing the ${departmentLabel} department.` : "Viewing tasks assigned to You."} Switch roles from the sidebar to explore the other dashboards.</p>}
          <div className="mb-6"><div className="relative w-full max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search projects and tasks" placeholder={role === "member" ? "Search tasks..." : "Search projects..."} value={searchQuery} onChange={event => setSearchQuery(event.target.value)} className="border-border bg-card pl-9" /></div></div>
          <section className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4" aria-label="Workspace progress">
            <StatsCard title={role === "member" ? "My Tasks" : "Total Projects"} value={role === "member" ? scopedTasks.length : scopedProjects.length} icon={FolderCheck} description={role === "member" ? `${scopedTasks.filter(task => task.status === "To do").length} to do` : `${scopedProjects.filter(project => project.status === "assigned").length} assigned`} />
            <StatsCard title="Completed" value={role === "member" ? approvedTasks : completedProjects} icon={CheckCircle2} description={`${role === "member" ? (scopedTasks.length ? Math.round(approvedTasks / scopedTasks.length * 100) : 0) : (scopedProjects.length ? Math.round(completedProjects / scopedProjects.length * 100) : 0)}% completion rate`} />
            <StatsCard title={role === "member" ? "Pending Review" : "Avg. Progress"} value={role === "member" ? scopedTasks.filter(task => task.status === "In review").length : `${averageProgress}%`} icon={BarChart3} />
          </section>

          {role !== "member" && <Card className="mb-8"><CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Performance Assessment</CardTitle><CardDescription>Progress calculated from this demo's projects and tasks.</CardDescription></CardHeader><CardContent>
            <div className={cn("grid grid-cols-1 gap-4", role === "project_lead" && "sm:grid-cols-3")}>
              {DEPARTMENTS.filter(department => role === "project_lead" || department === initialDepartment).map(department => {
                const projects = scopedProjects.filter(project => project.department === department);
                const tasks = scopedTasks.filter(task => projects.some(project => project.id === task.projectId));
                const complete = tasks.filter(task => task.status === "Approved").length;
                const progress = projects.length ? Math.round(projects.reduce((sum, project) => sum + progressFor(project), 0) / projects.length) : 0;
                return <div key={department} className="rounded-lg border border-border bg-muted/30 p-4"><div className="mb-3 flex items-center gap-2"><Target className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold capitalize">{department} Department</h2></div><div className="space-y-2 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">Projects</span><span className="font-medium">{projects.length}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Task Completion</span><span className="font-medium">{complete}/{tasks.length} ({tasks.length ? Math.round(complete / tasks.length * 100) : 0}%)</span></div><div className="flex justify-between"><span className="text-muted-foreground">Avg Progress</span><span className="font-medium">{progress}%</span></div><ProgressBar value={progress} showLabel={false} /></div></div>;
              })}
            </div>
            <div className="mt-6"><h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-primary" />Top Contributors</h2><div className="space-y-2">
              {organizationTeam.map(person => { const tasks = scopedTasks.filter(task => task.owner === person.id); const complete = tasks.filter(task => task.status === "Approved").length; return { person, count: tasks.length, complete, score: tasks.length ? Math.round(complete / tasks.length * 100) : 0 }; }).filter(item => item.count).sort((a, b) => b.score - a.score).map(({ person, count, complete, score }) => <div key={person.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{person.initials}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{person.name}</p><p className="text-xs text-muted-foreground">{person.role}</p></div><div className="text-right"><p className="text-sm font-bold text-primary">{score}%</p><p className="text-xs text-muted-foreground">{complete}/{count} tasks</p></div></div>)}
            </div></div>
          </CardContent></Card>}

          {role !== "member" && <>
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="Filter projects by status">
              {PROJECT_STATUSES.map(tab => <button key={tab.key} type="button" aria-pressed={activeTab === tab.key} onClick={() => { if (activeTab === tab.key) setShowCards(value => !value); else { setActiveTab(tab.key); setShowCards(true); } }} className={cn("flex items-center gap-2 rounded-lg border p-2 transition-colors", activeTab === tab.key ? "border-primary/40 bg-muted shadow-sm" : "border-border bg-muted/50 hover:bg-muted/80")}><span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", tab.color)} /><span className="min-w-0 text-left"><span className="block truncate text-xs text-muted-foreground">{tab.label}</span><span className="block text-sm font-semibold text-foreground">{tab.key === "all" ? scopedProjects.length : scopedProjects.filter(project => project.status === tab.key).length}</span></span></button>)}
            </div>
            {showCards && <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Projects overview">
              {filteredProjects.map(project => { const progress = progressFor(project); const members = new Set(demo.tasks.filter(task => task.projectId === project.id).map(task => task.owner)); members.add(project.leadId); return <article key={project.id} className="flex h-full flex-col justify-between rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"><div><div className="mb-1.5 flex items-center justify-between gap-2"><h2 className="truncate text-base font-semibold text-foreground" title={project.name}>{project.name}</h2><StatusBadge status={project.status} /></div><p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{project.description || "No description added."}</p></div><div className="space-y-4"><div><div className="mb-1.5 flex items-center justify-between text-sm"><span className="font-medium text-muted-foreground">Progress</span><span className="font-semibold">{progress}%</span></div><ProgressBar value={progress} showLabel={false} size="sm" /></div><div className="flex items-center justify-between text-sm text-muted-foreground"><span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{members.size} {members.size === 1 ? "member" : "members"}</span><span className="flex items-center gap-1.5"><CalendarIcon className="h-4 w-4" />{displayDate(project.dueDate)}</span></div><span className="inline-block rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{personName(project.leadId)}</span><div className="flex flex-wrap gap-2 border-t border-border pt-3"><Button variant="outline" size="sm" onClick={() => openProjectForm(project)} aria-label={`Edit project: ${project.name}`}><Pencil className="h-3.5 w-3.5" />Edit</Button><Button variant="outline" size="sm" onClick={() => openProjectReview(project)} aria-label={`Review project: ${project.name}`}>{project.status === "pending_approval" ? "Review" : "Update status"}</Button></div></div></article>; })}
              {!filteredProjects.length && (scopedProjects.length ? <p className="col-span-full py-8 text-center text-sm text-muted-foreground">No projects match this search or status.</p> : <div className="col-span-full rounded-xl border border-border bg-card p-8 text-center"><FolderOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" /><h2 className="mb-2 font-semibold">No projects yet</h2><p className="mb-4 text-sm text-muted-foreground">Create a project to organize work, assign tasks, and track progress.</p><Button variant="outline" onClick={() => openProjectForm()}><Plus className="h-4 w-4" />Create your first project</Button></div>)}
            </section>}
            <Card className="mb-8"><CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3"><div className="space-y-1"><CardTitle className="flex items-center gap-2"><FolderOpen className="h-5 w-5 text-primary" />Projects</CardTitle><CardDescription>Manage your organization's projects</CardDescription></div><Button size="sm" onClick={() => openProjectForm()}><Plus className="h-4 w-4" />New Project</Button></CardHeader><CardContent><div className="space-y-2">
              {filteredProjects.map(project => { const tasks = scopedTasks.filter(task => task.projectId === project.id); const expanded = expandedProjectId === project.id; return <div key={project.id} className="overflow-hidden rounded-lg border border-border bg-muted/30"><button className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/60 sm:p-4" onClick={() => setExpandedProjectId(expanded ? null : project.id)} aria-expanded={expanded} aria-controls={`tasks-${project.id}`}><span className="shrink-0 text-muted-foreground">{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{project.name}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{project.description}</span></span><span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex"><ListTodo className="h-3 w-3" />{tasks.length}</span><StatusBadge status={project.status} /></button>{expanded && <div id={`tasks-${project.id}`} className="border-t border-border bg-background/50 px-3 pb-3 sm:px-4 sm:pb-4"><div className="flex items-center justify-between gap-2 pb-2 pt-3"><span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tasks ({tasks.length})</span><Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openTaskForm(project.id)}><Plus className="h-3 w-3" />Assign Task</Button></div><div className="space-y-2">{tasks.map(task => taskRow(task, true))}{!tasks.length && <p className="py-4 text-center text-sm text-muted-foreground">No tasks assigned yet.</p>}</div></div>}</div>; })}
              {!filteredProjects.length && <p className="py-4 text-center text-sm text-muted-foreground">{scopedProjects.length ? "No projects found. Clear the filter or create a project." : "Use New Project to create your first project."}</p>}
            </div></CardContent></Card>
          </>}

          <Card className="mb-8"><CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3"><div className="space-y-1"><CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" />{role === "member" ? "My Assignments" : "Individual Tasks"}</CardTitle><CardDescription>{role === "member" ? "Update your task status and submit work for review" : "Create and assign tasks to team leads and members"}</CardDescription></div><Button size="sm" onClick={() => openTaskForm()} disabled={!scopedProjects.length}><Plus className="h-4 w-4" />New task</Button></CardHeader><CardContent><div className="space-y-2">{visibleTasks.map(task => taskRow(task))}{!visibleTasks.length && <div className="space-y-3 py-8 text-center"><p className="text-sm text-muted-foreground">{!scopedProjects.length ? (role === "member" && demo.projects.length ? "No tasks are assigned to You yet." : "Create a project first, then add a task.") : query || activeTab !== "all" ? "No tasks match this view." : "No tasks yet. Use New task to create and assign work."}</p>{role === "member" && !scopedProjects.length && <Button variant="outline" size="sm" onClick={() => changeRole("project_lead")}>Switch to Project Manager</Button>}</div>}</div></CardContent></Card>

          <Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" />Project Calendar</CardTitle></CardHeader><CardContent><div className="flex flex-col gap-6 md:flex-row"><Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="w-fit max-w-full rounded-lg border border-border" /><div className="min-w-0 flex-1"><h2 className="mb-3 font-semibold">{selectedDate?.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) || "Select a date"}</h2>{(() => {
            const sameDay = (date: string) => selectedDate && new Date(`${date}T12:00:00`).toDateString() === selectedDate.toDateString();
            const projects = scopedProjects.filter(project => sameDay(project.dueDate));
            const tasks = scopedTasks.filter(task => sameDay(task.dueDate));
            return projects.length || tasks.length ? <div className="space-y-2">{projects.map(project => <button key={project.id} onClick={() => openProjectReview(project)} className="flex w-full items-center gap-3 rounded-lg bg-muted/50 p-3 text-left hover:bg-muted"><span className="h-2 w-2 shrink-0 rounded-full bg-primary" /><span className="min-w-0 flex-1 break-words text-sm font-medium">{project.name}</span><span className="text-xs text-muted-foreground">Project</span></button>)}{tasks.map(task => <button key={task.id} onClick={() => openTask(task)} className="flex w-full items-center gap-3 rounded-lg bg-muted/50 p-3 text-left hover:bg-muted"><span className="h-2 w-2 shrink-0 rounded-full bg-accent" /><span className="min-w-0 flex-1 break-words text-sm font-medium">{task.title}</span><span className="text-xs text-muted-foreground">Task</span></button>)}</div> : <p className="text-sm text-muted-foreground">No events on this date</p>;
          })()}</div></div></CardContent></Card>
        </>}
        <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{organizationName} · {seedSampleData ? "Fictional sample data" : "Browser-only demo organization"}</span><Link to="/auth" className="font-medium text-primary hover:underline">Sign in to your workspace</Link></footer>
        <p className="sr-only" role="status" aria-live="polite">{notice}</p>
      </div>
    </main>

    {taskForm && <Modal title={taskForm.id ? "Edit task" : "Create task"} description="Add the task details, select a project, and assign a teammate." onClose={() => setTaskForm(null)}><form onSubmit={saveTask} className="space-y-4" noValidate>
      <div className="space-y-2"><Label htmlFor="demo-task-title">Task title</Label><Input id="demo-task-title" value={taskForm.title} maxLength={90} onChange={event => { setTaskForm({ ...taskForm, title: event.target.value }); setFormError(""); }} autoFocus aria-invalid={Boolean(formError)} aria-describedby={formError ? "demo-form-error" : undefined} /></div>
      <div className="space-y-2"><Label htmlFor="demo-task-description">Description (optional)</Label><Textarea id="demo-task-description" value={taskForm.description} maxLength={600} rows={3} onChange={event => setTaskForm({ ...taskForm, description: event.target.value })} /></div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="demo-task-project">Project</Label><select id="demo-task-project" className={SELECT_STYLE} value={taskForm.projectId} onChange={event => setTaskForm({ ...taskForm, projectId: event.target.value })}>{scopedProjects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor="demo-task-assignee">Assign to</Label><select id="demo-task-assignee" className={SELECT_STYLE} value={taskForm.owner} onChange={event => setTaskForm({ ...taskForm, owner: event.target.value })}>{memberOptions.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></div></div>
      <div className="space-y-2"><Label htmlFor="demo-task-due">Due date</Label><Input id="demo-task-due" type="date" value={taskForm.dueDate} onChange={event => setTaskForm({ ...taskForm, dueDate: event.target.value })} /></div>
      {formError && <p className="text-sm text-destructive" id="demo-form-error" role="alert">{formError}</p>}<DialogFooter className="gap-2"><Button type="button" variant="outline" onClick={() => setTaskForm(null)}>Cancel</Button><Button type="submit">{taskForm.id ? "Save task" : "Create task"}</Button></DialogFooter>
    </form></Modal>}

    {projectForm && <Modal title={projectForm.id ? "Edit Project" : "Create Project"} description="Define a project and assign a department and lead." onClose={() => setProjectForm(null)}><form onSubmit={saveProject} className="space-y-4" noValidate>
      <div className="space-y-2"><Label htmlFor="demo-project-name">Project name</Label><Input id="demo-project-name" value={projectForm.name} maxLength={90} onChange={event => { setProjectForm({ ...projectForm, name: event.target.value }); setFormError(""); }} autoFocus /></div>
      <div className="space-y-2"><Label htmlFor="demo-project-description">Description</Label><Textarea id="demo-project-description" value={projectForm.description} maxLength={600} rows={3} onChange={event => setProjectForm({ ...projectForm, description: event.target.value })} /></div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="demo-project-department">Department</Label><select id="demo-project-department" className={SELECT_STYLE} value={projectForm.department} onChange={event => setProjectForm({ ...projectForm, department: event.target.value as Department })}>{DEPARTMENTS.filter(department => role === "project_lead" || department === initialDepartment).map(department => <option key={department} value={department}>{department.charAt(0).toUpperCase() + department.slice(1)}</option>)}</select></div><div className="space-y-2"><Label htmlFor="demo-project-lead">Project lead</Label><select id="demo-project-lead" className={SELECT_STYLE} value={projectForm.leadId} onChange={event => setProjectForm({ ...projectForm, leadId: event.target.value })}>{projectLeadOptions.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></div></div>
      <div className="space-y-2"><Label htmlFor="demo-project-due">Due date</Label><Input id="demo-project-due" type="date" value={projectForm.dueDate} onChange={event => setProjectForm({ ...projectForm, dueDate: event.target.value })} /></div>
      {formError && <p className="text-sm text-destructive" role="alert">{formError}</p>}<DialogFooter className="gap-2"><Button type="button" variant="outline" onClick={() => setProjectForm(null)}>Cancel</Button><Button type="submit">{projectForm.id ? "Save Project" : "Create Project"}</Button></DialogFooter>
    </form></Modal>}

    {selectedTask && <Modal title={selectedTask.title} description={`${personName(selectedTask.owner)} · ${demo.projects.find(project => project.id === selectedTask.projectId)?.name} · Due ${displayDate(selectedTask.dueDate)}`} onClose={() => setSelectedTaskId(null)}>
      <p className="whitespace-pre-wrap break-words text-sm text-foreground">{selectedTask.description || "No description added."}</p>
      <div className="space-y-2"><Label htmlFor="demo-detail-status">Task status</Label><select id="demo-detail-status" className={SELECT_STYLE} value={selectedTask.status} onChange={event => updateTaskStatus(selectedTask, event.target.value as TaskStatus)}>{taskStatusOptions(selectedTask.status).map(status => <option key={status}>{status}</option>)}</select></div>
      {selectedTask.reviewNote && <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm"><p className="mb-1 font-medium">Review feedback</p><p className="whitespace-pre-wrap break-words text-muted-foreground">{selectedTask.reviewNote}</p></div>}
      {role !== "member" && <div className="space-y-2"><Label htmlFor="demo-task-review">Review comment</Label><Textarea id="demo-task-review" maxLength={600} value={reviewNote} onChange={event => setReviewNote(event.target.value)} placeholder="Add feedback for the assignee..." /></div>}
      {selectedTask.status === "Approved" && <p className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" />Task approved.</p>}
      <DialogFooter className="flex-wrap gap-2 sm:justify-start"><Button variant="outline" onClick={() => openTaskForm(undefined, selectedTask)}><Pencil className="h-4 w-4" />Edit task</Button>{selectedTask.status !== "Approved" && <>{selectedTask.status !== "In review" && <Button onClick={() => updateTaskStatus(selectedTask, "In review")} variant="outline">Send for review</Button>}{role !== "member" && <><Button variant="outline" onClick={() => updateTaskStatus(selectedTask, "Need revision", reviewNote)}>Request revision</Button><Button onClick={() => updateTaskStatus(selectedTask, "Approved", reviewNote)}>Approve task</Button></>}</>}</DialogFooter>
    </Modal>}

    {reviewProject && <Modal title={reviewProject.name} description="Review project status and record feedback for the team." onClose={() => setReviewProjectId(null)}>
      <p className="whitespace-pre-wrap break-words text-sm">{reviewProject.description}</p><ProgressBar value={progressFor(reviewProject)} />
      <div className="space-y-2"><Label htmlFor="demo-project-status">Project status</Label><select id="demo-project-status" className={SELECT_STYLE} value={reviewProject.status} disabled={role === "member"} onChange={event => updateProjectStatus(reviewProject, event.target.value as ProjectStatus)}>{PROJECT_STATUSES.filter(status => status.key !== "all").map(status => <option key={status.key} value={status.key}>{status.label}</option>)}</select></div>
      {role !== "member" && <div className="space-y-2"><Label htmlFor="demo-project-review">Review comment</Label><Textarea id="demo-project-review" value={reviewNote} maxLength={600} onChange={event => setReviewNote(event.target.value)} placeholder="Add feedback for the project lead..." /></div>}
      {reviewProject.reviewNote && <p className="whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">{reviewProject.reviewNote}</p>}
      <p className="text-xs text-muted-foreground">Approving a demo project also marks its tasks approved.</p><DialogFooter className="flex-wrap gap-2"><Button variant="outline" onClick={() => setReviewProjectId(null)}>Close</Button>{role !== "member" && <><Button variant="outline" onClick={() => updateProjectStatus(reviewProject, "need_revision", reviewNote)}>Request revision</Button><Button onClick={() => updateProjectStatus(reviewProject, "complete", reviewNote)}>Approve project</Button></>}</DialogFooter>
    </Modal>}

    {resetOpen && <Modal title="Reset demo?" description={seedSampleData ? "This clears this organization's demo edits, messages, and files and restores the original fictional projects and tasks." : "This clears this organization's demo projects, tasks, messages, and files in this browser. The organization will start empty again."} onClose={() => setResetOpen(false)}><DialogFooter className="gap-2"><Button variant="outline" onClick={() => setResetOpen(false)}>Keep exploring</Button><Button onClick={resetDemo}>Reset demo</Button></DialogFooter></Modal>}
  </div>;
}
