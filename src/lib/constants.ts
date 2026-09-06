// Department sub-team mapping based on organizational hierarchy
// Project Manager → Tech Lead, Marketing Lead, Research Lead → Sub-team Contributors

export const DEPARTMENT_SUB_TEAMS: Record<string, string[]> = {
  tech: ["Frontend", "Backend", "UX/UI"],
  marketing: ["Social Media", "Community", "Public Relations"],
  research: ["Innovation", "Training"],
};

export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  project_lead: "Project Manager",
  team_lead: "Team Lead",
  member: "Contributor",
};

export function getRoleDisplayName(role: string): string {
  return ROLE_DISPLAY_NAMES[role] || role.replace("_", " ");
}

export function getDepartmentSubTeams(department: string): string[] {
  return DEPARTMENT_SUB_TEAMS[department] || [];
}
