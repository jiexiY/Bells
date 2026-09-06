import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CompanyProvider, useCompany } from "@/contexts/CompanyContext";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import CompanyPortal from "./pages/CompanyPortal";
import ProjectLeadDashboard from "./pages/ProjectLeadDashboard";
import TeamLeadDashboard from "./pages/TeamLeadDashboard";
import TeamMemberDashboard from "./pages/TeamMemberDashboard";
import NotFound from "./pages/NotFound";
import SettingsPage from "./pages/SettingsPage";

function LoadingScreen() {
  return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading...</div>;
}

function AuthRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/companies" replace />;
  return <AuthPage />;
}

function WorkspaceAccess() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  return <CompanyProvider><Outlet /></CompanyProvider>;
}

function RoleRouter() {
  const { activeCompanyId, activeRole, membershipLoading } = useCompany();
  if (membershipLoading) return <LoadingScreen />;
  if (!activeCompanyId) return <Navigate to="/companies" replace />;

  switch (activeRole) {
    case "project_lead": return <ProjectLeadDashboard />;
    case "team_lead": return <TeamLeadDashboard />;
    case "member": return <TeamMemberDashboard />;
    default:
      return (
        <div className="min-h-screen grid place-items-center p-6">
          <p className="text-muted-foreground">No role assigned for this organization. Please contact an administrator.</p>
        </div>
      );
  }
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { activeCompanyId, activeRole, membershipLoading } = useCompany();
  if (membershipLoading) return <LoadingScreen />;
  if (!activeCompanyId) return <Navigate to="/companies" replace />;
  if (!activeRole || !allowedRoles.includes(activeRole)) return <Navigate to="/workspace" replace />;
  return <>{children}</>;
}

export default function AuthenticatedRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/auth" element={<AuthRoute />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<WorkspaceAccess />}>
          <Route path="/companies" element={<CompanyPortal />} />
          <Route path="/workspace" element={<RoleRouter />} />
          <Route path="/project-lead" element={<ProtectedRoute allowedRoles={["project_lead"]}><ProjectLeadDashboard /></ProtectedRoute>} />
          <Route path="/team-lead" element={<ProtectedRoute allowedRoles={["team_lead"]}><TeamLeadDashboard /></ProtectedRoute>} />
          <Route path="/member" element={<ProtectedRoute allowedRoles={["member"]}><TeamMemberDashboard /></ProtectedRoute>} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}
