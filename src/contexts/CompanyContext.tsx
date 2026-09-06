import { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from "react";
import { useCompanyMemberships } from "@/hooks/useCompanies";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "project_lead" | "team_lead" | "member";
type Department = "tech" | "marketing" | "research";

interface CompanyContextType {
  activeCompanyId: string | null;
  setActiveCompanyId: (id: string | null) => void;
  activeRole: AppRole | null;
  activeDepartment: Department | null;
  membershipLoading?: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(() =>
    localStorage.getItem("bells-active-company")
  );
  const { data: memberships = [], isLoading: membershipLoading } = useCompanyMemberships();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!activeCompanyId || !user) return;
    const refresh = () => {
      for (const key of ["projects", "tasks", "members", "company-members", "company_memberships", "invitations", "work_reviews", "task_submissions"]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    };
    const channel = supabase.channel(`workspace:${activeCompanyId}:${user.id}`);
    for (const table of ["projects", "tasks", "company_memberships", "invitations", "work_reviews"]) {
      channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `company_id=eq.${activeCompanyId}` }, refresh);
    }
    channel.subscribe();
    const fallback = window.setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 10000);
    return () => { window.clearInterval(fallback); void supabase.removeChannel(channel); };
  }, [activeCompanyId, user?.id, queryClient]);

  const setActiveCompanyId = useCallback((id: string | null) => {
    setActiveCompanyIdState(id);
    if (id) {
      localStorage.setItem("bells-active-company", id);
    } else {
      localStorage.removeItem("bells-active-company");
    }
  }, []);

  const activeMembership = useMemo(() => {
    if (!activeCompanyId) return null;
    return memberships.find(m => m.company_id === activeCompanyId && m.user_id === user?.id && m.is_active) || null;
  }, [activeCompanyId, memberships, user?.id]);

  const activeRole = (activeMembership?.role as AppRole) || null;
  const activeDepartment = (activeMembership?.department as Department) || null;

  return (
    <CompanyContext.Provider value={{ activeCompanyId, setActiveCompanyId, activeRole, activeDepartment, membershipLoading }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) throw new Error("useCompany must be used within CompanyProvider");
  return context;
}
