import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "project_lead" | "team_lead" | "member";
type Department = "tech" | "marketing" | "research";

export const AUTH_BOOTSTRAP_TIMEOUT_MS = 10_000;
const AUTH_CONNECTION_ERROR = "Bells could not connect to the sign-in service. Check your connection or try again later.";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  department: Department | null;
  profileName: string | null;
  loading: boolean;
  authError: string | null;
  signUp: (email: string, password: string, name: string, role: AppRole, department?: Department) => Promise<{ needsEmailConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchUserMeta = async (userId: string) => {
    // Authorization comes from the active company membership, never signup metadata.
    setRole(null);
    setDepartment(null);

    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("user_id", userId)
      .maybeSingle();

    if (profile) {
      setProfileName(profile.name);
    }
  };

  useEffect(() => {
    let active = true;
    let bootstrapPending = true;
    let bootstrapFailed = false;

    const failBootstrap = () => {
      if (!active || !bootstrapPending) return;
      bootstrapPending = false;
      bootstrapFailed = true;
      clearTimeout(timeoutId);
      setSession(null);
      setUser(null);
      setRole(null);
      setDepartment(null);
      setProfileName(null);
      setAuthError(AUTH_CONNECTION_ERROR);
      setLoading(false);
    };

    const timeoutId = setTimeout(failBootstrap, AUTH_BOOTSTRAP_TIMEOUT_MS);

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active || !bootstrapPending) return;
      if (error) {
        failBootstrap();
        return;
      }
      bootstrapPending = false;
      clearTimeout(timeoutId);
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setAuthError(null);
      if (data.session?.user) {
        void fetchUserMeta(data.session.user.id).catch(() => undefined);
      }
      setLoading(false);
    }).catch(failBootstrap);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active || (bootstrapFailed && _event === "INITIAL_SESSION")) return;
      // A completed sign-in or refresh may recover after a bootstrap timeout.
      if (session && _event !== "INITIAL_SESSION") {
        bootstrapPending = false;
        bootstrapFailed = false;
        clearTimeout(timeoutId);
        setAuthError(null);
        setLoading(false);
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Keep database requests outside the auth callback's session lock.
        setTimeout(() => {
          if (active) void fetchUserMeta(session.user.id).catch(() => undefined);
        }, 0);
      } else {
        setRole(null);
        setDepartment(null);
        setProfileName(null);
      }
    });

    return () => {
      active = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, name: string, role: AppRole, dept?: Department) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role, department: dept || null } },
    });
    if (error) throw error;
    setAuthError(null);

    if (data.session) {
      setSession(data.session);
      setUser(data.user);
      if (data.user) {
        void fetchUserMeta(data.user.id).catch(() => undefined);
      }
    }

    setRole(role);
    setDepartment(dept || null);
    return { needsEmailConfirmation: !data.session };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setAuthError(null);

    setSession(data.session);
    setUser(data.user);
    setRole(null);
    setDepartment(null);
    if (data.user) {
      void fetchUserMeta(data.user.id).catch(() => undefined);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAuthError(null);
    setRole(null);
    setDepartment(null);
    setProfileName(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, department, profileName, loading, authError, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
