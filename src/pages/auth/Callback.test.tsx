import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthCallback from "./Callback";

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  setSession: vi.fn(),
  exchangeCodeForSession: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

const session = { user: { id: "google-user" } };
const renderCallback = (path: string) => {
  window.history.replaceState({}, "", path);
  return render(<StrictMode><MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/auth/callback" element={<AuthCallback />} />
    <Route path="/dashboard" element={<p>Dashboard reached</p>} />
    <Route path="/student/profile" element={<p>Profile reached</p>} />
    <Route path="/auth/reset-password" element={<p>Reset password reached</p>} />
  </Routes></MemoryRouter></StrictMode>);
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  auth.setSession.mockResolvedValue({ data: { session }, error: null });
  auth.exchangeCodeForSession.mockResolvedValue({ data: { session }, error: null });
});

describe("AuthCallback", () => {
  it("persists Google credentials once across effect replays and honors next", async () => {
    renderCallback("/auth/callback?next=%2Fstudent%2Fprofile#access_token=access&refresh_token=refresh");
    await screen.findByText("Profile reached");
    expect(auth.setSession).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe("");
    expect(window.location.search).toBe("");
  });

  it("exchanges a one-time code only once in StrictMode", async () => {
    renderCallback("/auth/callback?code=one-time-code");
    await screen.findByText("Dashboard reached");
    expect(auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
  });

  it("preserves password recovery routing", async () => {
    renderCallback("/auth/callback#access_token=access&refresh_token=refresh&type=recovery");
    await screen.findByText("Reset password reached");
  });

  it("shows the SDK failure and removes credentials from the address bar", async () => {
    auth.setSession.mockResolvedValue({ data: { session: null }, error: new Error("Unable to validate Google session") });
    renderCallback("/auth/callback#access_token=access&refresh_token=refresh");
    await screen.findByText(/Unable to validate Google session/);
    await waitFor(() => expect(window.location.hash).toBe(""));
    expect(screen.getByText("Back to login")).toBeInTheDocument();
  });
});
