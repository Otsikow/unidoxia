import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { completeAuthCallback } from "./completeAuthCallback";

const session = { user: { id: "google-user" } };
const makeAuth = () => ({
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
  setSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
  exchangeCodeForSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
});
const complete = (auth: ReturnType<typeof makeAuth>, path: string) =>
  completeAuthCallback(auth as unknown as SupabaseClient["auth"], new URL(path, "https://unidoxia.com"));

describe("completeAuthCallback", () => {
  it("establishes a Google session from returned fragment tokens", async () => {
    const auth = makeAuth();
    await expect(complete(auth, "/auth/callback#access_token=access&refresh_token=refresh&token_type=bearer")).resolves.toBe(session);
    expect(auth.setSession).toHaveBeenCalledWith({ access_token: "access", refresh_token: "refresh" });
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("exchanges a PKCE code instead of waiting for an absent session", async () => {
    const auth = makeAuth();
    await expect(complete(auth, "/auth/callback?code=one-time-code")).resolves.toBe(session);
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("one-time-code");
    expect(auth.setSession).not.toHaveBeenCalled();
  });

  it("accepts an existing session on a clean callback refresh", async () => {
    const auth = makeAuth();
    auth.getSession.mockResolvedValue({ data: { session }, error: null });
    await expect(complete(auth, "/auth/callback")).resolves.toBe(session);
  });

  it.each(["?error=access_denied&error_description=Google+access+denied", "#error=access_denied&error_description=Google+access+denied"])("preserves provider errors from %s", async (params) => {
    const auth = makeAuth();
    await expect(complete(auth, `/auth/callback${params}`)).rejects.toThrow("Google access denied");
    expect(auth.getSession).not.toHaveBeenCalled();
  });

  it("surfaces session exchange errors instead of reporting an expired email link", async () => {
    const auth = makeAuth();
    auth.exchangeCodeForSession.mockResolvedValue({ data: { session: null }, error: new Error("Code verifier missing") });
    await expect(complete(auth, "/auth/callback?code=code")).rejects.toThrow("Code verifier missing");
  });

  it("rejects a callback without a session or complete credentials", async () => {
    await expect(complete(makeAuth(), "/auth/callback#access_token=partial")).rejects.toThrow("No sign-in session");
  });

  it("keeps a valid session when a one-time code has already been consumed", async () => {
    const auth = makeAuth();
    auth.exchangeCodeForSession.mockResolvedValue({ data: { session: null }, error: new Error("Code already used") });
    auth.getSession.mockResolvedValue({ data: { session }, error: null });
    await expect(complete(auth, "/auth/callback?code=used")).resolves.toBe(session);
  });
});
