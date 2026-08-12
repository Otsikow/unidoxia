import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const encoder = new TextEncoder();
const toHex = (bytes: Uint8Array) => Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const { token } = await request.json();
    if (typeof token !== "string" || token.length !== 64) return json({ error: "Invalid verification link" }, 400);
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ error: "Verification service is not configured" }, 503);
    const tokenHash = toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(token))));
    const admin = createClient(url, key, { auth: { persistSession: false } });
    const { data: claim } = await admin.from("university_claims").select("id,status,verification_expires_at").eq("verification_token_hash", tokenHash).maybeSingle();
    if (!claim || claim.status !== "awaiting_email_verification") return json({ error: "This verification link is invalid or has already been used" }, 400);
    if (!claim.verification_expires_at || new Date(claim.verification_expires_at) <= new Date()) return json({ error: "This verification link has expired" }, 410);
    const { error } = await admin.from("university_claims").update({ status: "awaiting_admin_review", email_verified_at: new Date().toISOString(), verification_token_hash: null, verification_expires_at: null, updated_at: new Date().toISOString() }).eq("id", claim.id);
    if (error) throw error;
    return json({ ok: true, message: "Email verified. UniDoxia will now review the claim." });
  } catch (error) {
    console.error("verify-university-claim error", error);
    return json({ error: "Unable to verify this claim" }, 500);
  }
});
