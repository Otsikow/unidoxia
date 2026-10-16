import type { SupabaseClient } from "@supabase/supabase-js";

/** The callback route owns URL consumption; the SDK must not consume it too. */
export async function completeAuthCallback(auth: SupabaseClient["auth"], url: URL) {
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const param = (key: string) => url.searchParams.get(key) ?? hash.get(key);
  const providerError = param("error_description") ?? param("error");
  const code = param("code");
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");

  if (providerError) throw new Error(providerError);

  const result = code
    ? await auth.exchangeCodeForSession(code)
    : accessToken && refreshToken
      ? await auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      : await auth.getSession();

  if (result.error) {
    // A previously consumed email/PKCE code must not break a valid local session.
    if (code) {
      const existing = await auth.getSession();
      if (!existing.error && existing.data.session) return existing.data.session;
    }
    throw result.error;
  }
  if (!result.data.session) {
    throw new Error("No sign-in session was returned. Please try signing in again.");
  }

  return result.data.session;
}
