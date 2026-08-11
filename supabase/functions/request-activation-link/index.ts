import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Generic response so this public endpoint cannot be used to probe for accounts.
  const genericSuccess = {
    success: true,
    message: "If an account exists for that email, a new activation link is on its way.",
  };

  try {
    const body = (await req.json().catch(() => null)) as { email?: unknown } | null;
    const rawEmail = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!rawEmail || rawEmail.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return jsonResponse({ error: "A valid email address is required" }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .eq("email", rawEmail)
      .maybeSingle();

    if (profileError) {
      console.error("Error looking up profile for activation link", profileError);
      return jsonResponse({ error: "Unable to process the request right now" }, 500);
    }

    if (!profile) {
      return jsonResponse(genericSuccess);
    }

    const siteUrl = (Deno.env.get("PUBLIC_SITE_URL") || "https://unidoxia.com").replace(/\/+$/, "");
    const redirectTo = Deno.env.get("INVITE_REDIRECT_URL") || `${siteUrl}/auth/callback`;

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: rawEmail,
      options: { redirectTo },
    });

    if (linkError) {
      console.error("Error generating activation link", linkError);
      return jsonResponse({ error: "Unable to generate a new link right now" }, 500);
    }

    const actionLink = linkData?.properties?.action_link;
    if (!actionLink) {
      return jsonResponse({ error: "Unable to generate a new link right now" }, 500);
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("RESEND_API_KEY is not configured; activation link not emailed");
      return jsonResponse({ error: "Email delivery is not configured" }, 500);
    }

    const safeName = escapeHtml((profile.full_name as string | null) ?? "there");

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "UniDoxia <info@unidoxia.com>",
        to: [rawEmail],
        subject: "Your new UniDoxia sign-in link",
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
            <h1 style="font-size:20px;margin:0 0 16px">Hi ${safeName},</h1>
            <p style="font-size:15px;line-height:1.6;margin:0 0 16px">
              Here is a fresh link to sign in to UniDoxia. For your security it can only be used once and expires shortly.
            </p>
            <p style="margin:24px 0">
              <a href="${actionLink}" style="background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-size:15px;display:inline-block">
                Sign in to UniDoxia
              </a>
            </p>
            <p style="font-size:13px;line-height:1.6;color:#475569;margin:0 0 8px">If the button does not work, copy and paste this link into your browser:</p>
            <p style="font-size:12px;word-break:break-all;color:#475569;margin:0 0 24px">${actionLink}</p>
            <p style="font-size:12px;color:#94a3b8;margin:0">If you did not request this, you can safely ignore this email.</p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const details = await emailResponse.text();
      console.error("Resend rejected the activation email", { status: emailResponse.status, details });
      return jsonResponse({ error: "We could not send the email. Please try again shortly." }, 502);
    }

    return jsonResponse(genericSuccess);
  } catch (error) {
    console.error("request-activation-link failed", error);
    return jsonResponse({ error: "Unexpected error" }, 500);
  }
});
