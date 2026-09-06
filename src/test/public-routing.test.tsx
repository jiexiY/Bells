import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import App from "@/App";

const routeState = vi.hoisted(() => ({
  auth: { user: null as { id: string } | null, loading: false },
  company: { activeCompanyId: "company-1" as string | null, activeRole: "member" as string | null },
  authProvider: vi.fn(),
  companyProvider: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => { routeState.authProvider(); return <>{children}</>; },
  useAuth: () => routeState.auth,
}));
vi.mock("@/contexts/CompanyContext", () => ({
  CompanyProvider: ({ children }: { children: ReactNode }) => { routeState.companyProvider(); return <>{children}</>; },
  useCompany: () => routeState.company,
}));
vi.mock("@/pages/LandingPage", () => ({ default: () => <h1>Bells landing page</h1> }));
vi.mock("@/pages/DemoRoutes", () => ({ default: () => <h1>Public demo organizations</h1> }));
vi.mock("@/pages/AuthPage", () => ({ default: () => <h1>Sign-in screen</h1> }));
vi.mock("@/pages/ResetPasswordPage", () => ({ default: () => <h1>Reset password</h1> }));
vi.mock("@/pages/CompanyPortal", () => ({ default: () => <h1>Company portal</h1> }));
vi.mock("@/pages/ProjectLeadDashboard", () => ({ default: () => <h1>Manager workspace</h1> }));
vi.mock("@/pages/TeamLeadDashboard", () => ({ default: () => <h1>Team-lead workspace</h1> }));
vi.mock("@/pages/TeamMemberDashboard", () => ({ default: () => <h1>Contributor workspace</h1> }));
vi.mock("@/pages/SettingsPage", () => ({ default: () => <h1>Settings</h1> }));

describe("public and authenticated route boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeState.auth = { user: null, loading: false };
    routeState.company = { activeCompanyId: "company-1", activeRole: "member" };
  });
  afterEach(cleanup);

  it.each([["/", "Bells landing page"], ["/demo", "Public demo organizations"]])("renders %s without mounting auth or membership providers", async (path, heading) => {
    routeState.auth.loading = true;
    window.history.replaceState({}, "", path);
    render(<App />);

    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    expect(routeState.authProvider).not.toHaveBeenCalled();
    expect(routeState.companyProvider).not.toHaveBeenCalled();
  });

  it("keeps the landing page at the root for signed-in users", async () => {
    routeState.auth.user = { id: "user-1" };
    window.history.replaceState({}, "", "/");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Bells landing page" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/");
    expect(routeState.authProvider).not.toHaveBeenCalled();
    expect(routeState.companyProvider).not.toHaveBeenCalled();
    expect(screen.queryByText("Contributor workspace")).not.toBeInTheDocument();
  });

  it("requires authentication before mounting a real workspace", async () => {
    window.history.replaceState({}, "", "/workspace");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Sign-in screen" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/auth");
    expect(routeState.companyProvider).not.toHaveBeenCalled();
    expect(screen.queryByText("Contributor workspace")).not.toBeInTheDocument();
  });

  it.each([
    ["project_lead", "Manager workspace"],
    ["team_lead", "Team-lead workspace"],
    ["member", "Contributor workspace"],
  ])("opens the %s workspace at /workspace for an authenticated user", async (role, heading) => {
    routeState.auth.user = { id: "user-1" };
    routeState.company.activeRole = role;
    window.history.replaceState({}, "", "/workspace");
    render(<App />);

    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/workspace");
  });

  it("redirects a contributor away from the manager route to their own workspace", async () => {
    routeState.auth.user = { id: "user-1" };
    window.history.replaceState({}, "", "/project-lead");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Contributor workspace" })).toBeInTheDocument();
    expect(screen.queryByText("Manager workspace")).not.toBeInTheDocument();
    expect(window.location.pathname).toBe("/workspace");
  });

  it.each(["/workspace", "/project-lead"])("requires a selected company before opening the workspace at %s", async (path) => {
    routeState.auth.user = { id: "user-1" };
    routeState.company = { activeCompanyId: null, activeRole: null };
    window.history.replaceState({}, "", path);
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Company portal" })).toBeInTheDocument();
    expect(screen.queryByText("Manager workspace")).not.toBeInTheDocument();
  });
});
