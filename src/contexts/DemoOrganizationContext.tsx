import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type DemoOrganization = {
  id: string;
  name: string;
  role: "project_lead" | "team_lead" | "member";
  department: "tech" | "marketing" | "research" | null;
  isSample: boolean;
};

type CreateOrganizationInput = Pick<DemoOrganization, "name" | "role" | "department">;
type Department = NonNullable<DemoOrganization["department"]>;
type OrganizationState = { version: 1; organizations: DemoOrganization[]; activeId: string | null };
type DemoOrganizationContextValue = {
  organizations: DemoOrganization[];
  activeOrganization: DemoOrganization | null;
  selectOrganization: (id: string | null) => void;
  createOrganization: (input: CreateOrganizationInput) => DemoOrganization;
  removeOrganization: (id: string) => void;
  joinSampleOrganization: (department: Department) => DemoOrganization;
  storageWarning: boolean;
};

const STORAGE_KEY = "bells-demo-organizations-v1";
const ORGANIZATION_LIMIT = 20;
const ROLES = ["project_lead", "team_lead", "member"] as const;
const DEPARTMENTS = ["tech", "marketing", "research"] as const;
const DemoOrganizationContext = createContext<DemoOrganizationContextValue | undefined>(undefined);

function initialState(): OrganizationState {
  return {
    version: 1,
    organizations: [{ id: "sample", name: "Bells Demo Organization", role: "project_lead", department: null, isSample: true }],
    activeId: null,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isOrganization(value: unknown): value is DemoOrganization {
  if (!isObject(value) || typeof value.id !== "string" || !/^(sample|local-[a-z0-9-]{1,70})$/.test(value.id)
    || typeof value.name !== "string" || !value.name.trim() || value.name.length > 80
    || !ROLES.includes(value.role as DemoOrganization["role"]) || typeof value.isSample !== "boolean"
    || value.isSample !== (value.id === "sample")) return false;
  return value.role === "project_lead" ? value.department === null : DEPARTMENTS.includes(value.department as Department);
}

function readSaved(): OrganizationState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || raw.length > 20000) return initialState();
    const data: unknown = JSON.parse(raw);
    if (!isObject(data) || data.version !== 1 || !Array.isArray(data.organizations) || data.organizations.length < 1
      || data.organizations.length > ORGANIZATION_LIMIT || !data.organizations.every(isOrganization)
      || new Set(data.organizations.map(organization => organization.id)).size !== data.organizations.length
      || data.organizations.filter(organization => organization.isSample).length !== 1) return initialState();
    return {
      version: 1,
      organizations: data.organizations.map(organization => ({
        id: organization.id,
        name: organization.name.trim(),
        role: organization.role,
        department: organization.department,
        isSample: organization.isSample,
      })),
      activeId: typeof data.activeId === "string" && data.organizations.some(organization => organization.id === data.activeId) ? data.activeId : null,
    };
  } catch {
    return initialState();
  }
}

export function DemoOrganizationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OrganizationState>(readSaved);
  const stateRef = useRef(state);
  const [storageWarning, setStorageWarning] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateRef.current));
      setStorageWarning(false);
    } catch { setStorageWarning(true); }
  }, []);

  const commit = useCallback((next: OrganizationState, deletionFailed = false) => {
    stateRef.current = next;
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setStorageWarning(deletionFailed);
    } catch { setStorageWarning(true); }
  }, []);

  const selectOrganization = useCallback((id: string | null) => {
    const current = stateRef.current;
    if (id !== null && !current.organizations.some(organization => organization.id === id)) throw new Error("Choose an organization from this demo.");
    commit({ ...current, activeId: id });
  }, [commit]);

  const createOrganization = useCallback((input: CreateOrganizationInput) => {
    const name = input.name.trim();
    if (!name || name.length > 80) throw new Error("Enter an organization name between 1 and 80 characters.");
    if (!ROLES.includes(input.role)) throw new Error("Choose your role.");
    if (input.role !== "project_lead" && !DEPARTMENTS.includes(input.department as Department)) throw new Error("Please select a department.");
    const current = stateRef.current;
    if (current.organizations.length >= ORGANIZATION_LIMIT) throw new Error("This demo supports up to 20 organizations. Delete a local organization to make room.");
    let id: string;
    do { id = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`; }
    while (current.organizations.some(organization => organization.id === id));
    const organization: DemoOrganization = {
      id, name, role: input.role, department: input.role === "project_lead" ? null : input.department, isSample: false,
    };
    commit({ ...current, organizations: [...current.organizations, organization] });
    return organization;
  }, [commit]);

  const removeOrganization = useCallback((id: string) => {
    const current = stateRef.current;
    const organization = current.organizations.find(item => item.id === id);
    if (!organization) throw new Error("This demo organization is no longer available.");
    if (organization.isSample) throw new Error("The sample organization is kept for exploring Bells.");
    let deletionFailed = false;
    for (const key of [`bells-demo-workspace-${id}`, `bells-demo-panels-${id}`]) {
      try { localStorage.removeItem(key); } catch { deletionFailed = true; }
    }
    commit({ ...current, organizations: current.organizations.filter(item => item.id !== id), activeId: current.activeId === id ? null : current.activeId }, deletionFailed);
  }, [commit]);

  const joinSampleOrganization = useCallback((department: Department) => {
    if (!DEPARTMENTS.includes(department)) throw new Error("Please select a department.");
    const current = stateRef.current;
    const sample = current.organizations.find(organization => organization.isSample)!;
    const joined: DemoOrganization = { ...sample, role: "member", department };
    commit({ ...current, organizations: current.organizations.map(organization => organization.id === sample.id ? joined : organization), activeId: sample.id });
    return joined;
  }, [commit]);

  const value = useMemo<DemoOrganizationContextValue>(() => ({
    organizations: state.organizations,
    activeOrganization: state.organizations.find(organization => organization.id === state.activeId) ?? null,
    selectOrganization, createOrganization, removeOrganization, joinSampleOrganization, storageWarning,
  }), [state, selectOrganization, createOrganization, removeOrganization, joinSampleOrganization, storageWarning]);

  return <DemoOrganizationContext.Provider value={value}>{children}</DemoOrganizationContext.Provider>;
}

export function useDemoOrganizations() {
  const context = useContext(DemoOrganizationContext);
  if (!context) throw new Error("useDemoOrganizations must be used within DemoOrganizationProvider");
  return context;
}
