import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

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

  if (!stripeSecretKey || !stripeWebhookSecret) {
    console.error("Stripe configuration missing");
    return new Response(JSON.stringify({ error: "Stripe not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed", err);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        const studentId = session.metadata?.student_id;
        const userId = session.metadata?.user_id;
        const planCode = session.metadata?.plan_code as "self_service" | "agent_supported";
        
        if (!studentId || !planCode) {
          console.error("Missing metadata in session", session.metadata);
          break;
        }

        const amountCents = session.amount_total || 0;
        const currency = session.currency?.toUpperCase() || "USD";
        const paymentIntentId = typeof session.payment_intent === "string" 
          ? session.payment_intent 
          : session.payment_intent?.id;

        // Record payment
        const { data: payment, error: paymentError } = await supabase
          .from("payments")
          .insert({
            amount_cents: amountCents,
            currency: currency,
            status: "succeeded",
            purpose: "plan_upgrade",
            stripe_payment_intent: paymentIntentId,
            metadata: {
              plan_code: planCode,
              session_id: session.id,
              customer_email: session.customer_email,
            },
          })
          .select("id")
          .single();

        if (paymentError) {
          console.error("CRITICAL: Failed to record payment for session", {
            sessionId: session.id,
            studentId,
            planCode,
            error: paymentError.message,
            code: paymentError.code,
            details: paymentError.details,
          });
          // Continue processing to avoid webhook retry loops, but log for manual review
          // Payment was successful in Stripe but failed to record in database
        }

        // Update student plan
        const updateData: Record<string, unknown> = {
          plan_type: planCode,
          payment_type: "one_time",
          payment_date: new Date().toISOString(),
          payment_amount_cents: amountCents,
          payment_currency: currency,
          refund_eligibility: false,
          payment_confirmed_at: new Date().toISOString(),
        };

        // For agent_supported plan, assign an agent
        if (planCode === "agent_supported") {
          // Find an available agent to assign
          const { data: availableAgent } = await supabase
            .from("agents")
            .select("id")
            .eq("status", "active")
            .order("created_at", { ascending: true })
            .limit(1)
            .single();

          if (availableAgent) {
            updateData.assigned_agent_id = availableAgent.id;
            updateData.agent_assigned_at = new Date().toISOString();
          }
        }

        const { error: updateError } = await supabase
          .from("students")
          .update(updateData)
          .eq("id", studentId);

        if (updateError) {
          console.error("CRITICAL: Failed to update student plan after successful payment", {
            studentId,
            planCode,
            paymentRecorded: !paymentError,
            paymentId: payment?.id,
            error: updateError.message,
            code: updateError.code,
            details: updateError.details,
            hint: updateError.hint,
          });
          // This is a critical error - payment was recorded but student plan wasn't updated
          // Manual intervention required to reconcile the state
        } else {
          console.log(`Successfully upgraded student ${studentId} to ${planCode}`, {
            paymentId: payment?.id,
            planCode,
            amountCents,
          });
        }

        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const studentId = paymentIntent.metadata?.student_id;
        
        console.log(`Payment failed for student ${studentId}`, {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          errorMessage: paymentIntent.last_payment_error?.message,
        });

        // Record failed payment attempt
        const { error: failedPaymentError } = await supabase.from("payments").insert({
          amount_cents: paymentIntent.amount,
          currency: paymentIntent.currency.toUpperCase(),
          status: "failed",
          purpose: "plan_upgrade",
          stripe_payment_intent: paymentIntent.id,
          metadata: {
            plan_code: paymentIntent.metadata?.plan_code,
            error: paymentIntent.last_payment_error?.message,
            error_code: paymentIntent.last_payment_error?.code,
            decline_code: paymentIntent.last_payment_error?.decline_code,
          },
        });

        if (failedPaymentError) {
          console.error("Failed to record failed payment attempt", {
            studentId,
            paymentIntentId: paymentIntent.id,
            error: failedPaymentError.message,
            code: failedPaymentError.code,
          });
        }
        
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
