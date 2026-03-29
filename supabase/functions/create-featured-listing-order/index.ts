import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PlanCode = "spotlight_30" | "spotlight_90" | "spotlight_180";

interface PlanConfig {
  label: string;
  durationDays: number;
  amountCents: number;
  currency: string;
  defaultPriority: number;
  features: string[];
}

const PLAN_CONFIGS: Record<PlanCode, PlanConfig> = {
  spotlight_30: {
    label: "30-Day Spotlight",
    durationDays: 30,
    amountCents: 120_000,
    currency: "USD",
    defaultPriority: 8,
    features: ["Featured placement for one month", "Inclusion in weekly student newsletter", "Performance summary report at the end of the cycle"],
  },
  spotlight_90: {
    label: "90-Day Spotlight",
    durationDays: 90,
    amountCents: 300_000,
    currency: "USD",
    defaultPriority: 5,
    features: ["Quarterly featured placement", "Newsletter inclusion + homepage hero rotation", "Bi-weekly campaign insights"],
  },
  spotlight_180: {
    label: "180-Day Spotlight",
    durationDays: 180,
    amountCents: 540_000,
    currency: "USD",
    defaultPriority: 2,
    features: ["Half-year strategic spotlight", "Premium hero rotation with conversion copy refresh", "Monthly campaign review with Partner Success team"],
  },
};

async function getAuthenticatedUser(req: Request): Promise<{ user: { id: string; email?: string }; error?: never } | { user?: never; error: Response }> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  return { user: { id: data.user.id, email: data.user.email } };
}

function sanitizeCopy(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function sanitizeUrl(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed.slice(0, maxLength);
}

function sanitizePriority(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(99, Math.round(parsed)));
}

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

type RequestPayload = {
  universityId?: string;
  planCode?: PlanCode;
  summary?: string;
  highlight?: string;
  imageUrl?: string;
  priority?: number;
};

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

  const auth = await getAuthenticatedUser(req);
  if (auth.error) return auth.error;
  const authContext = auth.user;

  try {
    const body = (await req.json()) as RequestPayload;
    const universityId = typeof body?.universityId === "string" ? body.universityId : undefined;
    const planCode = body?.planCode;

    if (!universityId) {
      return new Response(JSON.stringify({ error: "universityId is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!planCode || !(planCode in PLAN_CONFIGS)) {
      return new Response(JSON.stringify({ error: "planCode is invalid" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const plan = PLAN_CONFIGS[planCode];
    const summary = sanitizeCopy(body?.summary, 320);
    const highlight = sanitizeCopy(body?.highlight, 140);
    const imageUrl = sanitizeUrl(body?.imageUrl, 512);
    const requestedPriority = sanitizePriority(body?.priority);

    if (!summary) {
      return new Response(JSON.stringify({ error: "A summary headline is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile, error: profileError } = await supabase.from("profiles").select("id, tenant_id").eq("id", authContext.id).single();
    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Unable to resolve profile" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const [{ data: isPartner, error: partnerRoleError }, { data: isAdminOrStaff, error: adminRoleError }] = await Promise.all([
      supabase.rpc("has_role", { p_user_id: authContext.id, p_role: "partner" }),
      supabase.rpc("is_admin_or_staff", { user_id: authContext.id }),
    ]);

    if (partnerRoleError || adminRoleError) {
      return new Response(JSON.stringify({ error: "Unable to verify permissions" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!isPartner && !isAdminOrStaff) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: university, error: universityError } = await supabase
      .from("universities")
      .select("id, tenant_id, featured_listing_current_order_id, featured_listing_status, featured_priority, featured_summary, featured_highlight, featured_image_url")
      .eq("id", universityId)
      .single();

    if (universityError || !university) {
      return new Response(JSON.stringify({ error: "University not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!isAdminOrStaff && university.tenant_id !== profile.tenant_id) {
      return new Response(JSON.stringify({ error: "You can only manage spotlighting for your institution" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
    const nowIso = now.toISOString();
    const expiresIso = expiresAt.toISOString();
    const priority = requestedPriority ?? plan.defaultPriority;

    if (university.featured_listing_current_order_id) {
      await supabase.from("featured_listing_orders").update({ status: "expired", expires_at: nowIso }).eq("id", university.featured_listing_current_order_id).neq("status", "cancelled");
    }

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        tenant_id: isAdminOrStaff ? university.tenant_id : profile.tenant_id,
        amount_cents: plan.amountCents, currency: plan.currency, status: "succeeded", purpose: "featured_listing",
        metadata: { plan_code: planCode, duration_days: plan.durationDays, summary, highlight, image_url: imageUrl, priority, actor: { user_id: authContext.id, email: authContext.email ?? null } },
      })
      .select("id")
      .single();

    if (paymentError || !payment) {
      return new Response(JSON.stringify({ error: "Unable to record payment" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: order, error: orderError } = await supabase
      .from("featured_listing_orders")
      .insert({
        tenant_id: university.tenant_id, university_id: universityId, plan_code: planCode, duration_days: plan.durationDays,
        amount_cents: plan.amountCents, currency: plan.currency, status: "active", payment_id: payment.id,
        summary, highlight, image_url: imageUrl, priority, activated_at: nowIso, expires_at: expiresIso,
      })
      .select("*")
      .single();

    if (orderError || !order) {
      await supabase.from("payments").update({ status: "failed" }).eq("id", payment.id);
      return new Response(JSON.stringify({ error: "Unable to create featured listing order" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: updatedUniversity, error: updateUniversityError } = await supabase
      .from("universities")
      .update({
        featured: true, featured_summary: summary, featured_highlight: highlight, featured_image_url: imageUrl,
        featured_priority: priority, featured_listing_status: "active", featured_listing_current_order_id: order.id,
        featured_listing_expires_at: expiresIso, featured_listing_last_paid_at: nowIso,
      })
      .eq("id", universityId)
      .select("id, name, featured, featured_priority, featured_summary, featured_highlight, featured_image_url, featured_listing_status, featured_listing_expires_at, featured_listing_last_paid_at, featured_listing_current_order_id")
      .single();

    if (updateUniversityError || !updatedUniversity) {
      await supabase.from("featured_listing_orders").update({ status: "pending" }).eq("id", order.id);
      return new Response(JSON.stringify({ error: "Unable to update university showcase state" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ order, university: updatedUniversity, plan }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-featured-listing-order error", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
