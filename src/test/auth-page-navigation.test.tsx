import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AuthPage from "@/pages/AuthPage";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ signIn: vi.fn(), signUp: vi.fn(), authError: null }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {} } }));
vi.mock("@/integrations/lovable/index", () => ({ isOAuthProviderEnabled: vi.fn(), lovable: { auth: {} } }));

afterEach(cleanup);

describe("authentication navigation", () => {
  it("opens the signup form from its public signup URL", () => {
    render(<MemoryRouter initialEntries={["/auth?mode=signup"]}><AuthPage /></MemoryRouter>);

    expect(screen.getByRole("tab", { name: "Sign Up" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autoComplete", "new-password");
  });

  it("opens demo organizations without submitting the login form", async () => {
    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/demo" element={<h1>Your Organizations</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("link", { name: "Try the demo" }));
    expect(await screen.findByRole("heading", { name: "Your Organizations" })).toBeInTheDocument();
  });

  it("opens organization selection after a successful account login", async () => {
    render(<MemoryRouter initialEntries={["/auth"]}><Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/companies" element={<h1>Your Organizations</h1>} />
    </Routes></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "demo@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "local-test-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Log In" }));
    expect(await screen.findByRole("heading", { name: "Your Organizations" })).toBeInTheDocument();
  });
});
