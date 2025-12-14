import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { retry } from "./retry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface InviteStudentRequest {
  fullName: string;
  email: string;
  phone?: string;
  agentProfileId?: string;
  counselorProfileId?: string;
  tenantId: string;
  includeActionLink?: boolean;
}

type HttpErrorPayload = {
  status: number;
  message: string;
  code?: string;
  retryAfterSeconds?: number;
};

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

function parseRetryAfterSeconds(message: string): number | undefined {
  const match = message.match(/after\s+(\d+)\s+seconds?/i);
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function toHttpErrorPayload(error: unknown): HttpErrorPayload {
  const defaultPayload: HttpErrorPayload = {
    status: 500,
    message: "Unexpected error while inviting the student.",
  };

  if (!error) return defaultPayload;

  if (typeof error === "string") {
    return { ...defaultPayload, message: error };
  }

  if (error instanceof Error) {
    const message = error.message || defaultPayload.message;
    const anyErr = error as any;
    const statusCandidate = Number(anyErr?.status ?? anyErr?.statusCode);
    const code = typeof anyErr?.code === "string" ? anyErr.code : undefined;

    const isRateLimited =
      statusCandidate === 429 ||
      /for security purposes, you can only request this after/i.test(message) ||
      /too many requests/i.test(message);

    if (isRateLimited) {
      const retryAfterSeconds = parseRetryAfterSeconds(message);
      return {
        status: 429,
        message,
        code: code ?? "rate_limited",
        retryAfterSeconds,
      };
    }

    if (Number.isFinite(statusCandidate) && statusCandidate >= 400 && statusCandidate <= 599) {
      return {
        status: statusCandidate,
        message,
        code,
      };
    }

    return {
      status: 500,
      message,
      code,
    };
  }

  if (typeof error === "object") {
    const anyErr = error as any;
    const message =
      (typeof anyErr?.message === "string" && anyErr.message) ||
      (typeof anyErr?.error === "string" && anyErr.error) ||
      defaultPayload.message;

    const statusCandidate = Number(anyErr?.status ?? anyErr?.statusCode);
    const code = typeof anyErr?.code === "string" ? anyErr.code : undefined;

    const isRateLimited =
      statusCandidate === 429 ||
      /for security purposes, you can only request this after/i.test(message) ||
      /too many requests/i.test(message);

    if (isRateLimited) {
      const retryAfterSeconds = parseRetryAfterSeconds(message);
      return {
        status: 429,
        message,
        code: code ?? "rate_limited",
        retryAfterSeconds,
      };
    }

    if (Number.isFinite(statusCandidate) && statusCandidate >= 400 && statusCandidate <= 599) {
      return {
        status: statusCandidate,
        message,
        code,
      };
    }

    return {
      status: 500,
      message,
      code,
    };
  }

  return defaultPayload;
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
    const body = (await req.json()) as Partial<InviteStudentRequest> | null;
    console.log("Invite student request received", { body });

    if (!body) {
      console.error("Request body is missing");
      return new Response(JSON.stringify({ error: "Request body is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fullName, email, phone, agentProfileId, counselorProfileId, tenantId } = body;
    const includeActionLink = Boolean(body.includeActionLink);

    if (!agentProfileId && !counselorProfileId) {
      return new Response(JSON.stringify({ error: "An agent or staff owner is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    if (agentProfileId && (typeof agentProfileId !== "string" || !isValidUuid(agentProfileId))) {
      return new Response(JSON.stringify({ error: "agentProfileId must be a valid UUID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (counselorProfileId && (typeof counselorProfileId !== "string" || !isValidUuid(counselorProfileId))) {
      return new Response(JSON.stringify({ error: "counselorProfileId must be a valid UUID" }), {
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

    if (existingProfile && existingProfile.tenant_id !== tenantId) {
      return new Response(
        JSON.stringify({ error: "Email already associated with a different tenant" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let userId: string | undefined = existingProfile?.id;
    let inviteType: "invite" | "magic_link" = "invite";
    let actionLink: string | undefined = undefined;

    if (existingProfile) {
      const { error: magicLinkError } = await retry<{ data: unknown; error: Error | null }>(() =>
        supabaseAdmin.auth.signInWithOtp({
          email: normalizedEmail,
          options: {
            emailRedirectTo: redirectTo,
            shouldCreateUser: false,
            data: {
              full_name: fullName,
              role: "student",
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
    } else {
      const { data: inviteData, error: inviteError } = await retry<{
        data: { user: { id: string } | null };
        error: Error | null;
      }>(() =>
        supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail, {
          redirectTo,
          data: {
            full_name: fullName,
            role: "student",
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

    if (includeActionLink) {
      const { data: linkData, error: linkError } = await retry<{
        data: unknown;
        error: Error | null;
      }>(() =>
        supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: normalizedEmail,
          options: {
            redirectTo,
            shouldCreateUser: false,
            data: {
              full_name: fullName,
              role: "student",
              tenant_id: tenantId,
              phone: phone ?? undefined,
            },
          },
        }),
      );

      if (linkError) {
        console.error("Error generating action link", linkError);
      } else {
        const candidate = (linkData as any)?.properties?.action_link;
        if (typeof candidate === "string" && candidate.trim().length > 0) {
          actionLink = candidate;
        }
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unable to determine invited user ID" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: profileUpsertError } = await retry<{ data: unknown; error: Error | null }>(() =>
      supabaseAdmin.from("profiles").upsert(
        {
          id: userId,
          tenant_id: tenantId,
          email: normalizedEmail,
          full_name: fullName,
          phone: phone ?? null,
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

    const { error: userRoleError } = await retry<{ data: unknown; error: Error | null }>(() =>
      supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "student" }, { onConflict: "user_id,role" }),
    );

    if (userRoleError) {
      console.error("Error upserting user role", userRoleError);
      throw userRoleError;
    }

    const { data: studentRecord, error: studentUpsertError } = await retry<{
      data: { id: string };
      error: Error | null;
    }>(() =>
      supabaseAdmin
        .from("students")
        .upsert(
          {
            tenant_id: tenantId,
            profile_id: userId,
            legal_name: fullName,
            preferred_name: fullName,
            contact_email: normalizedEmail,
            contact_phone: phone ?? null,
          },
          { onConflict: "profile_id" },
        )
        .select("id")
        .single(),
    );

    if (studentUpsertError) {
      console.error("Error upserting student", studentUpsertError);
      throw studentUpsertError;
    }

    // Look up the agent record using the profile_id
    if (agentProfileId) {
      const { data: agentRecord, error: agentLookupError } = await retry<{
        data: { id: string } | null;
        error: Error | null;
      }>(() =>
        supabaseAdmin
          .from("agents")
          .select("id")
          .eq("profile_id", agentProfileId)
          .maybeSingle(),
      );

      if (agentLookupError) {
        console.error("Error looking up agent", agentLookupError);
        throw agentLookupError;
      }

      if (!agentRecord) {
        return new Response(
          JSON.stringify({ error: "Agent not found for the given profile ID" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { error: linkUpsertError } = await retry<{ data: unknown; error: Error | null }>(() =>
        supabaseAdmin
          .from("agent_student_links")
          .upsert(
            {
              agent_id: agentRecord.id,
              student_id: studentRecord.id,
              tenant_id: tenantId,
              application_count: 0,
              status: "active",
            },
            { onConflict: "agent_id,student_id" },
          ),
      );

      if (linkUpsertError) {
        console.error("Error linking agent to student", linkUpsertError);
        throw linkUpsertError;
      }
    }

    if (counselorProfileId) {
      const { data: counselorProfile, error: counselorLookupError } = await retry<{
        data: { id: string; tenant_id: string } | null;
        error: Error | null;
      }>(() =>
        supabaseAdmin
          .from("profiles")
          .select("id, tenant_id")
          .eq("id", counselorProfileId)
          .maybeSingle(),
      );

      if (counselorLookupError) {
        console.error("Error looking up counselor profile", counselorLookupError);
        throw counselorLookupError;
      }

      if (!counselorProfile || counselorProfile.tenant_id !== tenantId) {
        return new Response(
          JSON.stringify({ error: "Counselor not found for the given tenant" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { error: assignmentCleanupError } = await retry<{ data: unknown; error: Error | null }>(() =>
        supabaseAdmin.from("student_assignments").delete().eq("student_id", studentRecord.id),
      );

      if (assignmentCleanupError) {
        console.error("Error removing previous assignments", assignmentCleanupError);
        throw assignmentCleanupError;
      }

      const { error: assignmentInsertError } = await retry<{ data: unknown; error: Error | null }>(() =>
        supabaseAdmin.from("student_assignments").insert({
          student_id: studentRecord.id,
          counselor_id: counselorProfileId,
          assigned_at: new Date().toISOString(),
        }),
      );

      if (assignmentInsertError) {
        console.error("Error assigning counselor to student", assignmentInsertError);
        throw assignmentInsertError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        studentId: studentRecord.id,
        inviteType,
        actionLink,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const payload = toHttpErrorPayload(error);

    const logBase = {
      status: payload.status,
      errorMessage: payload.message,
      errorCode: payload.code ?? null,
      retryAfterSeconds: payload.retryAfterSeconds ?? null,
      errorStack: error instanceof Error ? error.stack : null,
      errorCause: error instanceof Error && (error as Error).cause ? (error as Error).cause : null,
    };

    if (payload.status >= 500) {
      console.error("Error inviting student", logBase);
    } else {
      console.warn("Invite student request failed", logBase);
    }

    const headers: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": "application/json",
    };

    if (payload.status === 429) {
      const retryAfter =
        payload.retryAfterSeconds ??
        (typeof Deno.env.get("INVITE_RATE_LIMIT_RETRY_AFTER_SECONDS") === "string"
          ? Number(Deno.env.get("INVITE_RATE_LIMIT_RETRY_AFTER_SECONDS"))
          : undefined);
      if (retryAfter && Number.isFinite(retryAfter) && retryAfter > 0) {
        headers["Retry-After"] = String(Math.ceil(retryAfter));
      }
    }

    return new Response(
      JSON.stringify({
        error: payload.message,
        code: payload.code,
        retryAfterSeconds: payload.retryAfterSeconds,
      }),
      {
        status: payload.status,
        headers,
      },
    );
  }
});
