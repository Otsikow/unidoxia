import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PlanCode = "self_service" | "agent_supported";

interface PlanConfig {
  name: string;
  priceInCents: number;
  currency: string;
  description: string;
  stripePriceId?: string;
}

const STRIPE_SELF_SERVICE_PRICE_ID = Deno.env.get("STRIPE_SELF_SERVICE_PRICE_ID");
const STRIPE_AGENT_SUPPORTED_PRICE_ID = Deno.env.get("STRIPE_AGENT_SUPPORTED_PRICE_ID");

const PLAN_CONFIGS: Record<PlanCode, PlanConfig> = {
  self_service: {
    name: "Self-Service Plan",
    priceInCents: 4900,
    currency: "usd",
    description: "Apply to unlimited universities independently - One-time payment",
    stripePriceId: STRIPE_SELF_SERVICE_PRICE_ID,
  },
  agent_supported: {
    name: "Agent-Supported Plan",
    priceInCents: 20000,
    currency: "usd",
    description: "Full guidance from application to visa - One-time payment",
    stripePriceId: STRIPE_AGENT_SUPPORTED_PRICE_ID,
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

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

type RequestPayload = {
  planCode?: PlanCode;
  successUrl?: string;
  cancelUrl?: string;
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

  if (!stripeSecretKey) {
    return new Response(
      JSON.stringify({ error: "Stripe is not configured. Please contact support.", demo: true }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const auth = await getAuthenticatedUser(req);
  if (auth.error) return auth.error;
  const authContext = auth.user;

  try {
    const body = (await req.json()) as RequestPayload;
    const planCode = body?.planCode;
    const successUrl = body?.successUrl || `${req.headers.get("origin")}/student/dashboard?payment=success`;
    const cancelUrl = body?.cancelUrl || `${req.headers.get("origin")}/pricing?payment=cancelled`;

    if (!planCode || !(planCode in PLAN_CONFIGS)) {
      return new Response(JSON.stringify({ error: "Invalid plan code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plan = PLAN_CONFIGS[planCode];

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, plan_type, tenant_id")
      .eq("profile_id", authContext.id)
      .single();

    if (studentError || !student) {
      console.error("Student lookup failed", studentError);
      return new Response(JSON.stringify({ error: "Student profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (student.plan_type && student.plan_type !== "free") {
      return new Response(
        JSON.stringify({ error: "You are already on a paid plan", currentPlan: student.plan_type }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    const lineItem = plan.stripePriceId
      ? { price: plan.stripePriceId, quantity: 1 }
      : {
          price_data: {
            currency: plan.currency,
            product_data: { name: plan.name, description: plan.description },
            unit_amount: plan.priceInCents,
          },
          quantity: 1,
        };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: authContext.email,
      line_items: [lineItem],
      success_url: `${successUrl}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        student_id: student.id,
        user_id: authContext.id,
        plan_code: planCode,
        tenant_id: student.tenant_id,
      },
      payment_intent_data: {
        metadata: {
          student_id: student.id,
          user_id: authContext.id,
          plan_code: planCode,
          tenant_id: student.tenant_id,
        },
      },
    });

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("create-checkout-session error", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
