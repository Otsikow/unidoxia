import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface DispatchRequest {
  broadcastId?: string;
  processScheduled?: boolean;
}

const renderTemplateVariables = (input: string, vars: Record<string, string | null | undefined>) =>
  input.replace(/{{\s*(\w+)\s*}}/g, (_, key: string) => vars[key] ?? "");

const sendEmail = async (to: string, subject: string, html: string) => {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: "UniDoxia <notifications@unidoxia.com>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return await response.json();
};

const sendWhatsApp = async (phone: string, body: string) => {
  const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioFrom = Deno.env.get("TWILIO_WHATSAPP_FROM");

  if (!twilioSid || !twilioToken || !twilioFrom) {
    throw new Error("Twilio WhatsApp env vars not configured");
  }

  const payload = new URLSearchParams({
    To: `whatsapp:${phone}`,
    From: `whatsapp:${twilioFrom}`,
    Body: body,
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: payload,
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return await response.json();
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

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const userClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid user token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "staff"])
      .limit(1)
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: "Only admin/staff can dispatch broadcasts" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: DispatchRequest = await req.json();

    let targetBroadcastIds: string[] = [];

    if (payload.broadcastId) {
      targetBroadcastIds = [payload.broadcastId];
    } else if (payload.processScheduled) {
      const { data: dueRows, error: dueError } = await adminClient.rpc("claim_due_broadcasts", { p_limit: 20 });
      if (dueError) throw dueError;
      targetBroadcastIds = (dueRows ?? []).map((row: { id: string }) => row.id);
    }

    if (targetBroadcastIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const broadcastId of targetBroadcastIds) {
      const { data: broadcast, error: broadcastError } = await adminClient
        .from("broadcasts")
        .select("*")
        .eq("id", broadcastId)
        .single();

      if (broadcastError || !broadcast) {
        continue;
      }

      const { data: recipients, error: recipientsError } = await adminClient
        .from("broadcast_recipients")
        .select("*")
        .eq("broadcast_id", broadcastId);

      if (recipientsError || !recipients) {
        continue;
      }

      for (const recipient of recipients) {
        const vars = {
          first_name: (recipient.email ?? "").split("@")[0],
          agent_name: (recipient.email ?? "").split("@")[0],
          application_id: "",
          country: "",
          offer_status: "",
          commission_owed: "",
        };

        if (broadcast.send_email) {
          if (!recipient.email) {
            await adminClient.from("broadcast_logs").insert({
              tenant_id: broadcast.tenant_id,
              broadcast_id: broadcast.id,
              recipient_id: recipient.recipient_id,
              channel: "email",
              status: "failed",
              error_message: "Missing email",
            });

            await adminClient
              .from("broadcast_recipients")
              .update({ email_status: "failed" })
              .eq("id", recipient.id);
          } else {
            try {
              const unsubscribeFooter = `<p style=\"font-size:12px;color:#6b7280;margin-top:20px\">To unsubscribe from non-critical announcements, update your communication preferences in your UniDoxia profile settings.</p>`;
              const emailHtml = `<h2>${broadcast.headline || broadcast.subject || "UniDoxia update"}</h2><p>${renderTemplateVariables(
                (broadcast.message_body || "").replace(/\n/g, "<br />"),
                vars,
              )}</p>${
                broadcast.cta_url && broadcast.cta_label
                  ? `<p><a href=\"${broadcast.cta_url}\" style=\"color:#2563eb\">${broadcast.cta_label}</a></p>`
                  : ""
              }${unsubscribeFooter}`;

              const emailResponse = await sendEmail(recipient.email, broadcast.subject || "UniDoxia announcement", emailHtml);

              await adminClient.from("broadcast_logs").insert({
                tenant_id: broadcast.tenant_id,
                broadcast_id: broadcast.id,
                recipient_id: recipient.recipient_id,
                channel: "email",
                status: "sent",
                provider_message_id: emailResponse?.id ?? null,
              });

              await adminClient
                .from("broadcast_recipients")
                .update({ email_status: "sent" })
                .eq("id", recipient.id);
            } catch (error) {
              await adminClient.from("broadcast_logs").insert({
                tenant_id: broadcast.tenant_id,
                broadcast_id: broadcast.id,
                recipient_id: recipient.recipient_id,
                channel: "email",
                status: "failed",
                error_message: error instanceof Error ? error.message : "Email failed",
              });

              await adminClient
                .from("broadcast_recipients")
                .update({ email_status: "failed" })
                .eq("id", recipient.id);
            }
          }
        }

        if (broadcast.send_whatsapp) {
          if (!recipient.phone) {
            await adminClient.from("broadcast_logs").insert({
              tenant_id: broadcast.tenant_id,
              broadcast_id: broadcast.id,
              recipient_id: recipient.recipient_id,
              channel: "whatsapp",
              status: "failed",
              error_message: "Missing phone",
            });

            await adminClient.from("whatsapp_logs").insert({
              tenant_id: broadcast.tenant_id,
              broadcast_id: broadcast.id,
              recipient_id: recipient.recipient_id,
              phone: null,
              template_name: "broadcast_announcement_v1",
              status: "failed",
              error_message: "Missing phone",
            });

            await adminClient
              .from("broadcast_recipients")
              .update({ whatsapp_status: "failed" })
              .eq("id", recipient.id);
          } else if (!recipient.whatsapp_consent) {
            await adminClient.from("broadcast_logs").insert({
              tenant_id: broadcast.tenant_id,
              broadcast_id: broadcast.id,
              recipient_id: recipient.recipient_id,
              channel: "whatsapp",
              status: "rejected",
              error_message: "No Consent",
            });

            await adminClient.from("whatsapp_logs").insert({
              tenant_id: broadcast.tenant_id,
              broadcast_id: broadcast.id,
              recipient_id: recipient.recipient_id,
              phone: recipient.phone,
              template_name: "broadcast_announcement_v1",
              status: "rejected",
              error_message: "No Consent",
            });

            await adminClient
              .from("broadcast_recipients")
              .update({ whatsapp_status: "rejected" })
              .eq("id", recipient.id);
          } else {
            try {
              const whatsappMessage = `${broadcast.headline || broadcast.subject || "UniDoxia"}\n\n${renderTemplateVariables(
                broadcast.message_body || "",
                vars,
              )}${broadcast.cta_url ? `\n\n${broadcast.cta_url}` : ""}`;

              const waResponse = await sendWhatsApp(recipient.phone, whatsappMessage);

              await adminClient.from("broadcast_logs").insert({
                tenant_id: broadcast.tenant_id,
                broadcast_id: broadcast.id,
                recipient_id: recipient.recipient_id,
                channel: "whatsapp",
                status: "sent",
                provider_message_id: waResponse?.sid ?? null,
              });

              await adminClient.from("whatsapp_logs").insert({
                tenant_id: broadcast.tenant_id,
                broadcast_id: broadcast.id,
                recipient_id: recipient.recipient_id,
                phone: recipient.phone,
                template_name: "broadcast_announcement_v1",
                status: "sent",
                provider_message_id: waResponse?.sid ?? null,
              });

              await adminClient
                .from("broadcast_recipients")
                .update({ whatsapp_status: "sent" })
                .eq("id", recipient.id);
            } catch (error) {
              await adminClient.from("broadcast_logs").insert({
                tenant_id: broadcast.tenant_id,
                broadcast_id: broadcast.id,
                recipient_id: recipient.recipient_id,
                channel: "whatsapp",
                status: "failed",
                error_message: error instanceof Error ? error.message : "WhatsApp failed",
              });

              await adminClient.from("whatsapp_logs").insert({
                tenant_id: broadcast.tenant_id,
                broadcast_id: broadcast.id,
                recipient_id: recipient.recipient_id,
                phone: recipient.phone,
                template_name: "broadcast_announcement_v1",
                status: "failed",
                error_message: error instanceof Error ? error.message : "WhatsApp failed",
              });

              await adminClient
                .from("broadcast_recipients")
                .update({ whatsapp_status: "failed" })
                .eq("id", recipient.id);
            }
          }
        }
      }

      await adminClient
        .from("broadcasts")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", broadcast.id);

      processed += 1;
    }

    return new Response(JSON.stringify({ ok: true, processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("broadcast-dispatch error", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
