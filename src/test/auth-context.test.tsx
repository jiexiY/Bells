import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { AUTH_BOOTSTRAP_TIMEOUT_MS, AuthProvider, useAuth } from "@/contexts/AuthContext";

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
}));

const fromMock = vi.hoisted(() =>
  vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      })),
    })),
  })),
);

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: authMocks,
    from: fromMock,
  },
}));

const fakeUser = { id: "user-123", email: "test@example.com" } as any;
const fakeSession = { user: fakeUser, access_token: "token" } as any;

function AuthProbe() {
  const { user, loading, authError, signIn, signUp } = useAuth();
  const [signupNeedsConfirmation, setSignupNeedsConfirmation] = useState<string>("");
  const [signInFinished, setSignInFinished] = useState(false);

  return (
    <div>
      <span>{loading ? "loading" : "ready"}</span>
      <span data-testid="user-id">{user?.id || "none"}</span>
      <span data-testid="auth-error">{authError || ""}</span>
      <span data-testid="sign-in-finished">{String(signInFinished)}</span>
      <button type="button" onClick={async () => {
        await signIn("test@example.com", "password");
        setSignInFinished(true);
      }}>
        Sign in
      </button>
      <button
        type="button"
        onClick={async () => {
          const result = await signUp("test@example.com", "password", "Test User", "member", "tech");
          setSignupNeedsConfirmation(String(result.needsEmailConfirmation));
        }}
      >
        Sign up
      </button>
      <span data-testid="signup-confirmation">{signupNeedsConfirmation}</span>
    </div>
  );
}

describe("AuthProvider session timing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.getSession.mockResolvedValue({ data: { session: null } });
    authMocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    authMocks.signOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("stops loading when session refresh hangs without changing stored sessions", async () => {
    vi.useFakeTimers();
    authMocks.getSession.mockReturnValue(new Promise(() => undefined));
    const storageSpy = vi.spyOn(Storage.prototype, "removeItem");

    render(<AuthProvider><AuthProbe /></AuthProvider>);
    expect(screen.getByText("loading")).toBeInTheDocument();

    await act(async () => { await vi.advanceTimersByTimeAsync(AUTH_BOOTSTRAP_TIMEOUT_MS); });

    expect(screen.getByText("ready")).toBeInTheDocument();
    expect(screen.getByTestId("user-id")).toHaveTextContent("none");
    expect(screen.getByTestId("auth-error")).toHaveTextContent("could not connect to the sign-in service");
    expect(storageSpy).not.toHaveBeenCalled();
    storageSpy.mockRestore();
  });

  it("ignores late bootstrap results and initial-session events after timeout", async () => {
    vi.useFakeTimers();
    let completeSession!: (result: { data: { session: typeof fakeSession } }) => void;
    authMocks.getSession.mockReturnValue(new Promise(resolve => { completeSession = resolve; }));

    render(<AuthProvider><AuthProbe /></AuthProvider>);
    await act(async () => { await vi.advanceTimersByTimeAsync(AUTH_BOOTSTRAP_TIMEOUT_MS); });
    await act(async () => {
      completeSession({ data: { session: fakeSession } });
      authMocks.onAuthStateChange.mock.calls[0][0]("INITIAL_SESSION", fakeSession);
    });

    expect(screen.getByTestId("user-id")).toHaveTextContent("none");
    expect(screen.getByTestId("auth-error")).toHaveTextContent("could not connect");
  });

  it.each(["rejected request", "returned auth error"])("reports an unavailable service after a %s", async mode => {
    if (mode === "rejected request") {
      authMocks.getSession.mockRejectedValue(new Error("Failed to fetch"));
    } else {
      authMocks.getSession.mockResolvedValue({ data: { session: null }, error: new Error("Auth unavailable") });
    }

    render(<AuthProvider><AuthProbe /></AuthProvider>);
    await screen.findByText("ready");

    expect(screen.getByTestId("user-id")).toHaveTextContent("none");
    expect(screen.getByTestId("auth-error")).toHaveTextContent("could not connect");
  });

  it("recovers when a successful sign-in arrives after bootstrap timed out", async () => {
    vi.useFakeTimers();
    authMocks.getSession.mockReturnValue(new Promise(() => undefined));
    render(<AuthProvider><AuthProbe /></AuthProvider>);
    await act(async () => { await vi.advanceTimersByTimeAsync(AUTH_BOOTSTRAP_TIMEOUT_MS); });

    await act(async () => {
      authMocks.onAuthStateChange.mock.calls[0][0]("SIGNED_IN", fakeSession);
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByTestId("user-id")).toHaveTextContent("user-123");
    expect(screen.getByTestId("auth-error")).toBeEmptyDOMElement();
  });

  it("publishes the signed-in user before signIn resolves", async () => {
    authMocks.signInWithPassword.mockResolvedValue({
      data: { session: fakeSession, user: fakeUser },
      error: null,
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await screen.findByText("ready");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByTestId("user-id")).toHaveTextContent("user-123");
      expect(screen.getByTestId("sign-in-finished")).toHaveTextContent("true");
    });
  });

  it("publishes an immediate signup session and reports that confirmation is not needed", async () => {
    authMocks.signUp.mockResolvedValue({
      data: { session: fakeSession, user: fakeUser },
      error: null,
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await screen.findByText("ready");
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() => {
      expect(screen.getByTestId("user-id")).toHaveTextContent("user-123");
      expect(screen.getByTestId("signup-confirmation")).toHaveTextContent("false");
    });
  });
});
