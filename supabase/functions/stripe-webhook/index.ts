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
const resendApiKey = Deno.env.get("RESEND_API_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

const sendEmail = async (to: string[], subject: string, html: string) => {
  if (!resendApiKey) {
    console.error("RESEND_API_KEY is not set");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: "UniDoxia <info@unidoxia.com>",
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }
};

const getAdminEmailRecipients = async () => {
  const { data: admins, error } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .eq("role", "admin")
    .not("email", "is", null);

  if (error) {
    console.error("Failed to load admin recipients", error);
    return [];
  }

  const adminIds = (admins ?? []).map((admin) => admin.id);
  if (adminIds.length === 0) return [];

  const { data: preferences } = await supabase
    .from("notification_preferences")
    .select("profile_id, email_notifications")
    .in("profile_id", adminIds);

  const preferenceMap = new Map(
    (preferences ?? []).map((row) => [row.profile_id, row.email_notifications])
  );

  return (admins ?? [])
    .filter((admin) => preferenceMap.get(admin.id) !== false)
    .map((admin) => admin.email as string);
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
        const tenantId = session.metadata?.tenant_id;
        
        if (!studentId || !planCode) {
          console.error("Missing metadata in session", session.metadata);
          break;
        }

        // If tenant_id not in metadata, fetch from student record
        let resolvedTenantId = tenantId;
        if (!resolvedTenantId) {
          const { data: studentData } = await supabase
            .from("students")
            .select("tenant_id")
            .eq("id", studentId)
            .single();
          resolvedTenantId = studentData?.tenant_id;
        }

        if (!resolvedTenantId) {
          console.error("Could not resolve tenant_id for student", studentId);
          break;
        }

        const amountCents = session.amount_total || 0;
        const currency = session.currency?.toUpperCase() || "USD";
        const paymentIntentId = typeof session.payment_intent === "string" 
          ? session.payment_intent 
          : session.payment_intent?.id;

        // Record payment with tenant_id
        const { data: payment, error: paymentError } = await supabase
          .from("payments")
          .insert({
            tenant_id: resolvedTenantId,
            amount_cents: amountCents,
            currency: currency,
            status: "succeeded",
            purpose: "plan_upgrade",
            stripe_payment_intent: paymentIntentId,
            metadata: {
              plan_code: planCode,
              session_id: session.id,
              customer_email: session.customer_email,
              student_id: studentId,
            },
          })
          .select("id")
          .single();

        if (paymentError) {
          console.error("Failed to record payment", paymentError);
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
          // Find an available active agent to assign (using 'active' column, not 'status')
          const { data: availableAgent } = await supabase
            .from("agents")
            .select("id")
            .eq("active", true)
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
          console.error("Failed to update student plan", updateError);
        } else {
          console.log(`Successfully upgraded student ${studentId} to ${planCode}`);
        }

        try {
          const recipients = await getAdminEmailRecipients();
          if (recipients.length > 0) {
            const { data: studentData } = await supabase
              .from("students")
              .select("profile_id, legal_name, preferred_name")
              .eq("id", studentId)
              .single();

            let studentName = "Student";
            let studentRole = "student";
            if (studentData) {
              studentName = studentData.legal_name || studentData.preferred_name || "Student";
            }

            if (studentData?.profile_id) {
              const { data: profileData } = await supabase
                .from("profiles")
                .select("full_name, role")
                .eq("id", studentData.profile_id)
                .single();
              if (profileData?.full_name) studentName = profileData.full_name;
              if (profileData?.role) studentRole = profileData.role;
            }

            const planLabel =
              planCode === "self_service"
                ? "$49"
                : planCode === "agent_supported"
                  ? "$200"
                  : "$0";

            const amountDisplay = `${currency} ${(amountCents / 100).toFixed(2)}`;
            const paidAt = new Date().toISOString();

            const html = `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h1>Payment confirmed</h1>
                <p><strong>User:</strong> ${studentName}</p>
                <p><strong>Role:</strong> ${studentRole}</p>
                <p><strong>Plan:</strong> ${planLabel}</p>
                <p><strong>Amount:</strong> ${amountDisplay}</p>
                <p><strong>Timestamp:</strong> ${paidAt}</p>
                <p>View details in the admin payments dashboard.</p>
              </div>
            `;

            await sendEmail(recipients, "Admin alert: payment confirmed", html);
          }
        } catch (notifyError) {
          console.error("Failed to send admin payment notification email", notifyError);
        }

        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const studentId = paymentIntent.metadata?.student_id;
        const tenantId = paymentIntent.metadata?.tenant_id;
        
        console.log(`Payment failed for student ${studentId}`);
        
        // Resolve tenant_id if not in metadata
        let resolvedTenantId = tenantId;
        if (!resolvedTenantId && studentId) {
          const { data: studentData } = await supabase
            .from("students")
            .select("tenant_id")
            .eq("id", studentId)
            .single();
          resolvedTenantId = studentData?.tenant_id;
        }

        if (resolvedTenantId) {
          // Record failed payment attempt with tenant_id
          await supabase.from("payments").insert({
            tenant_id: resolvedTenantId,
            amount_cents: paymentIntent.amount,
            currency: paymentIntent.currency.toUpperCase(),
            status: "failed",
            purpose: "plan_upgrade",
            stripe_payment_intent: paymentIntent.id,
            metadata: {
              plan_code: paymentIntent.metadata?.plan_code,
              error: paymentIntent.last_payment_error?.message,
              student_id: studentId,
            },
          });
        } else {
          console.error("Could not resolve tenant_id for failed payment", paymentIntent.id);
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
