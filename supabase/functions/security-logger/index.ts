import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type EventType =
  | "failed_authentication"
  | "privilege_escalation_attempt"
  | "suspicious_activity"
  | "policy_violation"
  | "custom";

type Severity = "low" | "medium" | "high" | "critical";

interface SecurityLogRequest {
  eventType: EventType;
  severity?: Severity;
  description?: string;
  tenantId?: string | null;
  userId?: string | null;
  actorEmail?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown> | null;
  alert?: boolean | {
    summary?: string;
    details?: string;
  };
}

const EVENT_DEFAULT_SEVERITY: Record<EventType, Severity> = {
  failed_authentication: "medium",
  privilege_escalation_attempt: "high",
  suspicious_activity: "high",
  policy_violation: "medium",
  custom: "low",
};

const ALERT_SUMMARIES: Partial<Record<EventType, string>> = {
  privilege_escalation_attempt: "Privilege escalation attempt detected",
  suspicious_activity: "Suspicious activity detected",
};

type CallerKind = "service_role" | "user_jwt" | "anon";

function authorizeRequest(req: Request): { response?: Response; caller?: CallerKind } {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      response: new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const token = authHeader.slice(7);
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (serviceRoleKey && token === serviceRoleKey) {
    return { caller: "service_role" };
  }

  if (token.split(".").length === 3) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      const role = (payload?.role || payload?.["user_role"]) as string | undefined;
      const sub = payload?.sub as string | undefined;
      if (payload && sub && role === "authenticated") {
        return { caller: "user_jwt" };
      }
      if (role === "service_role") {
        return { caller: "service_role" };
      }
    } catch {
      // fallthrough
    }
  }

  // Anon-key callers are treated as untrusted; they get heavily restricted access below.
  if (anonKey && token === anonKey) {
    return { caller: "anon" };
  }

  return {
    response: new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }),
  };
}

// Per-IP in-memory rate limit for anon callers (best-effort within a single isolate)
const ANON_RATE_LIMIT_MAX = 10;
const ANON_RATE_LIMIT_WINDOW_MS = 60_000;
const anonRateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkAnonRateLimit(ip: string | null): boolean {
  const key = ip || "unknown";
  const now = Date.now();
  const bucket = anonRateBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    anonRateBuckets.set(key, { count: 1, resetAt: now + ANON_RATE_LIMIT_WINDOW_MS });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= ANON_RATE_LIMIT_MAX;
}

const ANON_ALLOWED_EVENT_TYPES: EventType[] = ["failed_authentication"];

function normalizeIdentifier(email?: string | null, ip?: string | null): string | null {
  if (email && typeof email === "string" && email.trim().length > 0) {
    return email.trim().toLowerCase();
  }
  if (ip && typeof ip === "string" && ip.trim().length > 0) {
    return ip.trim();
  }
  return null;
}

function parseRequestBody(body: unknown): SecurityLogRequest {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }

  const {
    eventType,
    severity,
    description,
    tenantId,
    userId,
    actorEmail,
    userAgent,
    metadata,
    ipAddress,
    alert,
  } = body as SecurityLogRequest;

  if (!eventType || typeof eventType !== "string") {
    throw new Error("eventType is required");
  }

  if (!(eventType in EVENT_DEFAULT_SEVERITY)) {
    throw new Error(`Unsupported eventType: ${eventType}`);
  }

  if (severity && !["low", "medium", "high", "critical"].includes(severity)) {
    throw new Error("Invalid severity value");
  }

  const cleanedMetadata = metadata && typeof metadata === "object" ? metadata : undefined;

  return {
    eventType: eventType as EventType,
    severity,
    description,
    tenantId: tenantId ?? null,
    userId: userId ?? null,
    actorEmail: actorEmail ?? null,
    userAgent: userAgent ?? null,
    metadata: cleanedMetadata ?? null,
    ipAddress: ipAddress ?? null,
    alert,
  };
}

function getSupabaseClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceKey) {
    throw new Error("Supabase configuration missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  }) as any;
}

async function recordFailedAuthHeuristic(
  supabaseClient: any,
  eventId: string,
  identifier: string | null,
  tenantId: string | null,
  severity: Severity,
  metadata: Record<string, unknown> | null,
): Promise<{ alertCreated: boolean; alertId?: string }> {
  if (!identifier) {
    return { alertCreated: false };
  }

  const threshold = Number(Deno.env.get("SECURITY_FAILED_AUTH_THRESHOLD") ?? "5");
  const windowMinutes = Number(Deno.env.get("SECURITY_FAILED_AUTH_WINDOW_MINUTES") ?? "15");
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  const { count, error } = await supabaseClient
    .from("security_audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("event_type", "failed_authentication")
    .gte("created_at", windowStart)
    .eq("metadata->>identifier", identifier);

  if (error) {
    console.error("Failed to evaluate failed authentication threshold", error);
    return { alertCreated: false };
  }

  if ((count ?? 0) < threshold) {
    return { alertCreated: false };
  }

  const summary = `Repeated failed authentication attempts detected for ${identifier}`;
  const details = `Detected ${count} failed authentication attempts within ${windowMinutes} minutes.`;

  const { data, error: alertError } = await supabaseClient
    .from("security_alerts")
    .insert({
      tenant_id: tenantId,
      source_event_id: eventId,
      event_type: "failed_authentication",
      severity: severity === "critical" ? "critical" : "high",
      summary,
      details,
      metadata: metadata ?? {},
    })
    .select("id")
    .single();

  if (alertError) {
    console.error("Failed to create failed authentication alert", alertError);
    return { alertCreated: false };
  }

  return { alertCreated: true, alertId: data?.id };
}

async function maybeCreateAlert(
  supabaseClient: any,
  eventType: EventType,
  severity: Severity,
  tenantId: string | null,
  eventId: string,
  metadata: Record<string, unknown> | null,
  alertPayload: SecurityLogRequest["alert"],
): Promise<{ alertCreated: boolean; alertId?: string }> {
  if (eventType === "failed_authentication") {
    const identifier = (metadata?.identifier as string | undefined) ?? null;
    return recordFailedAuthHeuristic(supabaseClient, eventId, identifier, tenantId, severity, metadata);
  }

  let shouldCreate = false;
  let summary = ALERT_SUMMARIES[eventType];
  let details: string | undefined;
  const alertSeverity: Severity = severity;

  if (typeof alertPayload === "object") {
    summary = alertPayload.summary ?? summary;
    details = alertPayload.details ?? details;
    shouldCreate = true;
  } else if (alertPayload === true) {
    shouldCreate = true;
  }

  if (!shouldCreate && ["privilege_escalation_attempt", "suspicious_activity"].includes(eventType)) {
    shouldCreate = true;
  }

  if (!shouldCreate) {
    return { alertCreated: false };
  }

  if (!summary) {
    summary = `Security alert for ${eventType.replace(/_/g, " ")}`;
  }

  if (!details && metadata) {
    details = JSON.stringify(metadata);
  }

  const { data, error } = await supabaseClient
    .from("security_alerts")
    .insert({
      tenant_id: tenantId,
      source_event_id: eventId,
      event_type: eventType,
      severity: alertSeverity,
      summary,
      details,
      metadata: metadata ?? {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create security alert", error);
    return { alertCreated: false };
  }

  return { alertCreated: true, alertId: data?.id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const auth = authorizeRequest(req);
  if (auth.response) return auth.response;
  const caller: CallerKind = auth.caller!;

  try {
    const requestJson = await req.json();
    const parsed = parseRequestBody(requestJson);

    const supabaseClient = getSupabaseClient();

    const severity = parsed.severity ?? EVENT_DEFAULT_SEVERITY[parsed.eventType];
    const ipAddress = parsed.ipAddress ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = parsed.userAgent ?? req.headers.get("user-agent") ?? null;

    // Anon callers (using public anon key) are heavily restricted to prevent
    // log flooding and forged high-severity alerts.
    let effectiveAlert = parsed.alert;
    let effectiveSeverity: Severity = severity;
    if (caller === "anon") {
      if (!ANON_ALLOWED_EVENT_TYPES.includes(parsed.eventType)) {
        return new Response(
          JSON.stringify({ error: "Event type not permitted for unauthenticated callers" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!checkAnonRateLimit(ipAddress)) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      // Strip alert capability and clamp severity for anon callers.
      effectiveAlert = undefined;
      if (effectiveSeverity === "critical" || effectiveSeverity === "high") {
        effectiveSeverity = "medium";
      }
    }

    const emailFromMetadata = typeof parsed.metadata?.email === "string" ? parsed.metadata.email : undefined;
    const identifier = normalizeIdentifier(emailFromMetadata || parsed.actorEmail || undefined, ipAddress);

    const metadata = {
      ...parsed.metadata,
      identifier: identifier ?? null,
      user_agent: userAgent,
      ip_address: ipAddress,
    } as Record<string, unknown>;

    const { data, error } = await supabaseClient
      .from("security_audit_logs")
      .insert({
        tenant_id: parsed.tenantId,
        user_id: parsed.userId,
        actor_email: parsed.actorEmail,
        event_type: parsed.eventType,
        severity: effectiveSeverity,
        description: parsed.description ?? null,
        metadata,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to insert security audit log", error);
      throw new Error("Failed to record security event");
    }

    const eventId = data?.id as string;

    const alertResult = await maybeCreateAlert(
      supabaseClient,
      parsed.eventType,
      effectiveSeverity,
      parsed.tenantId ?? null,
      eventId,
      metadata,
      effectiveAlert,
    );

    return new Response(
      JSON.stringify({
        success: true,
        eventId,
        alertCreated: alertResult.alertCreated,
        alertId: alertResult.alertId ?? null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("security-logger error", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

