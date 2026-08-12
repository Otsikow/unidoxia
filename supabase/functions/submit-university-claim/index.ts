import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const publicDomains = new Set(["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com", "proton.me", "protonmail.com"]);
const encoder = new TextEncoder();
const toHex = (bytes: Uint8Array) => Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const siteUrl = (Deno.env.get("SITE_URL") || "https://unidoxia.com").replace(/\/$/, "");
    if (!supabaseUrl || !serviceRoleKey || !resendKey) return json({ error: "Claim email service is not configured" }, 503);

    const input = await request.json();
    const required = ["universityId", "firstName", "lastName", "jobTitle", "department", "institutionalEmail"];
    if (required.some((key) => typeof input[key] !== "string" || !input[key].trim())) {
      return json({ error: "Complete all required fields" }, 400);
    }

    const email = input.institutionalEmail.trim().toLowerCase();
    const emailDomain = email.split("@")[1];
    if (!emailDomain || publicDomains.has(emailDomain)) {
      return json({ error: "Use your official university email address" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: university, error: universityError } = await admin
      .from("universities")
      .select("id,name,website,listing_status")
      .eq("id", input.universityId)
      .eq("active", true)
      .single();
    if (universityError || !university) return json({ error: "University not found" }, 404);
    if (university.listing_status === "claimed") return json({ error: "This university has already been claimed" }, 409);

    let websiteDomain = "";
    try { websiteDomain = new URL(university.website || "").hostname.replace(/^www\./, ""); } catch { /* admin review remains mandatory */ }
    const domainMatches = websiteDomain && (emailDomain === websiteDomain || emailDomain.endsWith(`.${websiteDomain}`));
    if (!domainMatches) return json({ error: "The email domain does not match this university's official website" }, 400);

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin.from("university_claims").select("id", { count: "exact", head: true }).eq("institutional_email", email).gte("created_at", since);
    if ((count || 0) >= 3) return json({ error: "Too many recent attempts. Try again later." }, 429);

    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const token = toHex(tokenBytes);
    const tokenHash = toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(token))));
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { data: profile } = await admin.from("profiles").select("id").ilike("email", email).maybeSingle();
    const { error: insertError } = await admin.from("university_claims").insert({
      university_id: university.id,
      claimant_user_id: profile?.id || null,
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      job_title: input.jobTitle.trim(),
      department: input.department.trim(),
      institutional_email: email,
      phone: typeof input.phone === "string" && input.phone.trim() ? input.phone.trim() : null,
      verification_token_hash: tokenHash,
      verification_expires_at: expiresAt,
    });
    if (insertError) {
      if (insertError.code === "23505") return json({ error: "An active claim already exists for this email" }, 409);
      throw insertError;
    }

    const verificationUrl = `${siteUrl}/university-claims/verify?token=${encodeURIComponent(token)}`;
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "UniDoxia <info@unidoxia.com>",
        to: [email],
        subject: `Verify your ${university.name} profile claim`,
        html: `<p>Hello ${input.firstName.trim()},</p><p>Verify your institutional email to submit the ${university.name} profile claim for UniDoxia review.</p><p><a href="${verificationUrl}">Verify institutional email</a></p><p>This link expires in 30 minutes. Verification does not grant ownership; UniDoxia must review and approve the claim.</p>`,
      }),
    });
    if (!emailResponse.ok) {
      console.error("Resend rejected university claim verification", await emailResponse.text());
      return json({ error: "The claim was recorded but the verification email could not be sent. Contact UniDoxia support." }, 502);
    }
    return json({ ok: true, message: "Check your institutional email for a verification link." });
  } catch (error) {
    console.error("submit-university-claim error", error);
    return json({ error: "Unable to submit the claim right now" }, 500);
  }
});
