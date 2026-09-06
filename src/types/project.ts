// Project Management Types

export type ProjectStatus = "assigned" | "in_progress" | "pending_approval" | "need_revision" | "complete";
export type TaskStatus = "incomplete" | "in_progress" | "pending_approval" | "need_revision" | "completed" | "declined" | "approved" | "unchecked";
export type FeedbackType = "declined" | "approved";

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  leadId: string;
  leadName: string;
  department: "tech" | "marketing" | "research";
  createdAt: string;
  dueDate: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  projectId: string;
  assignedTo: string;
  assignedBy: string;
  assigneeName: string;
  dueDate: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "project_lead" | "team_lead" | "member";
  department?: "tech" | "marketing" | "research";
  avatar?: string;
}

export interface ProjectFeedback {
  id: string;
  projectId: string;
  feedback: FeedbackType;
  comment: string;
  createdAt: string;
  createdBy: string;
}
