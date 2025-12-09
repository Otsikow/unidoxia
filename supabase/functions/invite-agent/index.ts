import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { retry } from "./retry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface InviteAgentRequest {
  fullName: string;
  email: string;
  companyName: string;
  phone?: string;
  tenantId: string;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(payload.padEnd(payload.length + (4 - (payload.length % 4)) % 4, "="));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function requireAuthenticatedUser(req: Request): Response | null {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.slice(7);
  const payload = decodeJwtPayload(token);
  const role = (payload?.role || payload?.["user_role"]) as string | undefined;
  const sub = payload?.sub as string | undefined;

  if (!payload || role !== "authenticated" || !sub) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return null;
}

function getSupabaseAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase configuration missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  }) as any;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authError = requireAuthenticatedUser(req);
  if (authError) return authError;

  try {
    const body = (await req.json()) as Partial<InviteAgentRequest> | null;
    console.log("Invite agent request received", { body });

    if (!body) {
      console.error("Request body is missing");
      return new Response(JSON.stringify({ error: "Request body is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fullName, email, companyName, phone, tenantId } = body;

    if (!fullName || typeof fullName !== "string" || fullName.trim().length === 0 || fullName.length > 200) {
      return new Response(JSON.stringify({ error: "fullName is required and must be fewer than 200 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!email || typeof email !== "string" || email.trim().length === 0 || email.length > 320) {
      return new Response(JSON.stringify({ error: "email is required and must be fewer than 320 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!companyName || typeof companyName !== "string" || companyName.trim().length === 0 || companyName.length > 200) {
      return new Response(JSON.stringify({ error: "companyName is required and must be fewer than 200 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!tenantId || typeof tenantId !== "string" || !isValidUuid(tenantId)) {
      return new Response(JSON.stringify({ error: "tenantId must be a valid UUID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const supabaseAdmin = getSupabaseAdminClient();

    const redirectTo = Deno.env.get("INVITE_REDIRECT_URL") || undefined;

    // Check if a profile with this email already exists
    const { data: existingProfile, error: profileLookupError } = await retry<{
      data: { id: string; tenant_id: string; role: string; full_name: string; email: string; phone: string | null } | null;
      error: Error | null;
    }>(() =>
      supabaseAdmin
        .from("profiles")
        .select("id, tenant_id, role, full_name, email, phone")
        .eq("email", normalizedEmail)
        .maybeSingle(),
    );

    if (profileLookupError) {
      console.error("Error fetching existing profile", profileLookupError);
      throw profileLookupError;
    }

    if (existingProfile) {
      if (existingProfile.tenant_id !== tenantId) {
        return new Response(
          JSON.stringify({ error: "Email already associated with a different tenant" }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (existingProfile.role === "agent") {
        return new Response(
          JSON.stringify({ error: "An agent with this email already exists" }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    let userId: string | undefined = existingProfile?.id;
    let inviteType: "invite" | "magic_link" = "invite";

    if (existingProfile) {
      // User exists, send a magic link instead
      const { error: magicLinkError } = await retry<{ data: unknown; error: Error | null }>(() =>
        supabaseAdmin.auth.signInWithOtp({
          email: normalizedEmail,
          options: {
            emailRedirectTo: redirectTo,
            shouldCreateUser: false,
            data: {
              full_name: fullName,
              role: "agent",
              tenant_id: tenantId,
              phone: phone ?? undefined,
            },
          },
        }),
      );

      if (magicLinkError) {
        console.error("Error sending magic link", magicLinkError);
        throw magicLinkError;
      }

      inviteType = "magic_link";

      // Update the existing profile to agent role
      const { error: profileUpdateError } = await retry<{ data: unknown; error: Error | null }>(() =>
        supabaseAdmin.from("profiles").update({
          role: "agent",
          full_name: fullName,
          phone: phone ?? null,
          updated_at: new Date().toISOString(),
        }).eq("id", userId),
      );

      if (profileUpdateError) {
        console.error("Error updating profile to agent", profileUpdateError);
        throw profileUpdateError;
      }
    } else {
      // Invite new user via admin API
      const { data: inviteData, error: inviteError } = await retry<{
        data: { user: { id: string } | null };
        error: Error | null;
      }>(() =>
        supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail, {
          redirectTo,
          data: {
            full_name: fullName,
            role: "agent",
            tenant_id: tenantId,
            phone: phone ?? undefined,
          },
        }),
      );

      if (inviteError) {
        console.error("Error inviting user", inviteError);
        throw inviteError;
      }

      userId = inviteData.user?.id;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unable to determine invited user ID" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a username for the agent
    const username = `agent_${userId.slice(0, 8)}`;

    // Upsert the profile record
    const { error: profileUpsertError } = await retry<{ data: unknown; error: Error | null }>(() =>
      supabaseAdmin.from("profiles").upsert(
        {
          id: userId,
          tenant_id: tenantId,
          email: normalizedEmail,
          full_name: fullName,
          phone: phone ?? null,
          role: "agent",
          username,
          onboarded: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      ),
    );

    if (profileUpsertError) {
      console.error("Error upserting profile", profileUpsertError);
      throw profileUpsertError;
    }

    // Upsert user role
    const { error: userRoleError } = await retry<{ data: unknown; error: Error | null }>(() =>
      supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "agent" }, { onConflict: "user_id,role" }),
    );

    if (userRoleError) {
      console.error("Error upserting user role", userRoleError);
      throw userRoleError;
    }

    // Create or update the agent record
    const { data: agentRecord, error: agentUpsertError } = await retry<{
      data: { id: string };
      error: Error | null;
    }>(() =>
      supabaseAdmin
        .from("agents")
        .upsert(
          {
            tenant_id: tenantId,
            profile_id: userId,
            company_name: companyName,
            verification_status: "pending",
            active: true,
          },
          { onConflict: "profile_id" },
        )
        .select("id")
        .single(),
    );

    if (agentUpsertError) {
      console.error("Error upserting agent", agentUpsertError);
      throw agentUpsertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        agentId: agentRecord.id,
        userId,
        inviteType,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("Error inviting agent", {
      errorMessage: message,
      errorStack: error instanceof Error ? error.stack : null,
      errorCause: error instanceof Error && error.cause ? error.cause : null,
    });

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
