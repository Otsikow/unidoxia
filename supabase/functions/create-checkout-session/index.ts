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
}

const PLAN_CONFIGS: Record<PlanCode, PlanConfig> = {
  self_service: {
    name: "Self-Service Plan",
    priceInCents: 4900, // $49.00 USD
    currency: "usd",
    description: "Apply to unlimited universities independently - One-time payment",
  },
  agent_supported: {
    name: "Agent-Supported Plan",
    priceInCents: 20000, // $200.00 USD
    currency: "usd",
    description: "Full guidance from application to visa - One-time payment",
  },
};

interface AuthContext {
  userId: string;
  email?: string;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const segments = token.split(".");
    if (segments.length !== 3) return null;
    const payload = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(payload.padEnd(payload.length + (4 - (payload.length % 4)) % 4, "="));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getAuthContext(req: Request): AuthContext | Response {
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.slice(7);
  const payload = decodeJwtPayload(token);
  const role = (payload?.role ?? payload?.["user_role"]) as string | undefined;
  const subject = payload?.sub as string | undefined;

  if (!payload || role !== "authenticated" || !subject) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const email = typeof payload.email === "string" ? payload.email : undefined;
  return { userId: subject, email };
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

  // Check Stripe key
  if (!stripeSecretKey) {
    return new Response(
      JSON.stringify({ 
        error: "Stripe is not configured. Please contact support.",
        demo: true,
      }), 
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const authContext = getAuthContext(req);
  if (authContext instanceof Response) {
    return authContext;
  }

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

    // Fetch student profile
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, plan_type")
      .eq("profile_id", authContext.userId)
      .single();

    if (studentError || !student) {
      console.error("Student lookup failed", {
        userId: authContext.userId,
        error: studentError?.message,
        code: studentError?.code,
        details: studentError?.details,
        hint: studentError?.hint,
      });

      // Provide specific error messages based on error type
      let errorMessage = "Student profile not found";
      let statusCode = 404;

      if (studentError) {
        // Database or permission error
        if (studentError.code === 'PGRST116') {
          errorMessage = "Student profile not found. Please complete your profile setup first.";
        } else if (studentError.code?.startsWith('42501') || studentError.message?.includes('permission')) {
          errorMessage = "Access denied. Please ensure you have the correct permissions.";
          statusCode = 403;
        } else if (studentError.message?.includes('timeout') || studentError.message?.includes('network')) {
          errorMessage = "Database connection error. Please try again in a moment.";
          statusCode = 503;
        } else {
          errorMessage = `Failed to retrieve student profile: ${studentError.message}`;
          statusCode = 500;
        }
      }

      return new Response(JSON.stringify({
        error: errorMessage,
        code: studentError?.code,
      }), {
        status: statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already on a paid plan
    if (student.plan_type && student.plan_type !== "free") {
      return new Response(
        JSON.stringify({ 
          error: "You are already on a paid plan",
          currentPlan: student.plan_type,
        }), 
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: authContext.email,
      line_items: [
        {
          price_data: {
            currency: plan.currency,
            product_data: {
              name: plan.name,
              description: plan.description,
            },
            unit_amount: plan.priceInCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${successUrl}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        student_id: student.id,
        user_id: authContext.userId,
        plan_code: planCode,
      },
      payment_intent_data: {
        metadata: {
          student_id: student.id,
          user_id: authContext.userId,
          plan_code: planCode,
        },
      },
    });

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("create-checkout-session error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });

    let errorMessage = "An unexpected error occurred while creating the checkout session";
    let statusCode = 500;

    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('Stripe')) {
        errorMessage = "Payment provider error. Please try again or contact support.";
        statusCode = 503;
      } else if (error.message.includes('Invalid plan')) {
        errorMessage = "Invalid plan selected. Please choose a valid plan.";
        statusCode = 400;
      } else if (error.message.includes('JSON') || error.message.includes('parse')) {
        errorMessage = "Invalid request format. Please check your request and try again.";
        statusCode = 400;
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        errorMessage = "Network error. Please check your connection and try again.";
        statusCode = 503;
      } else {
        errorMessage = `Checkout session creation failed: ${error.message}`;
      }
    }

    return new Response(JSON.stringify({
      error: errorMessage,
      details: error instanceof Error ? error.message : undefined,
    }), {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
