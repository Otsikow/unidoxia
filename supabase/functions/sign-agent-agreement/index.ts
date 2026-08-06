import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import {
  AGENT_AGREEMENT_ACCEPTANCE,
  AGENT_AGREEMENT_INTRO,
  AGENT_AGREEMENT_SECTIONS,
  AGENT_AGREEMENT_TITLE,
  AGENT_AGREEMENT_VERSION,
} from "../_shared/agentAgreementTerms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const APPROVED_STATUSES = ["verified", "approved"];

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

const bodySchema = z.object({
  agreement_version: z.string().trim().max(40).optional(),
  full_legal_name: z.string().trim().min(2).max(150),
  business_name: optionalText(150),
  company_registration_number: optionalText(80),
  country_of_operation: z.string().trim().min(2).max(80),
  business_address: z.string().trim().min(5).max(300),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(40),
  identification_number: optionalText(80),
  representative_name: optionalText(150),
  position_title: optionalText(120),
  electronic_signature: z.string().trim().min(2).max(150),
  confirmed_read: z.literal(true),
  confirmed_authority: z.literal(true),
  consented_verification: z.literal(true),
});

type Body = z.infer<typeof bodySchema>;

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/* ------------------------------- PDF builder ------------------------------ */

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 54;
const MAX_W = PAGE_W - MARGIN * 2;

async function buildAgreementPdf(details: Body, signedAt: Date): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const ascii = (value: string) =>
    value
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\u2022/g, "-")
      .replace(/[^\x00-\x7F]/g, "");

  const newPage = () => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };

  const wrap = (text: string, font: typeof regular, size: number, width: number) => {
    const words = ascii(text).split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > width && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  const write = (
    text: string,
    opts: { font?: typeof regular; size?: number; indent?: number; gap?: number; color?: ReturnType<typeof rgb> } = {},
  ) => {
    const font = opts.font ?? regular;
    const size = opts.size ?? 10;
    const indent = opts.indent ?? 0;
    const lineHeight = size * 1.35;
    for (const line of wrap(text, font, size, MAX_W - indent)) {
      if (y - lineHeight < MARGIN) newPage();
      page.drawText(line, {
        x: MARGIN + indent,
        y: y - size,
        size,
        font,
        color: opts.color ?? rgb(0.15, 0.16, 0.19),
      });
      y -= lineHeight;
    }
    y -= opts.gap ?? 4;
  };

  // Header
  write("UniDoxia", { font: bold, size: 18, gap: 2, color: rgb(0.07, 0.09, 0.15) });
  write(AGENT_AGREEMENT_TITLE, { font: bold, size: 13, gap: 2 });
  write(
    `Agreement version ${AGENT_AGREEMENT_VERSION}  |  Signed ${signedAt.toUTCString()}`,
    { font: italic, size: 9, gap: 10 },
  );

  for (const block of AGENT_AGREEMENT_INTRO) {
    if (Array.isArray(block)) block.forEach((item) => write(`\u2022 ${item}`, { indent: 14 }));
    else write(block);
  }

  for (const section of AGENT_AGREEMENT_SECTIONS) {
    y -= 6;
    write(section.title.toUpperCase(), { font: bold, size: 11, gap: 5 });
    for (const block of section.blocks) {
      if (Array.isArray(block)) block.forEach((item) => write(`\u2022 ${item}`, { indent: 14, gap: 2 }));
      else write(block);
    }
  }

  // Agent details
  newPage();
  write("AGENT DETAILS", { font: bold, size: 12, gap: 8 });
  const rows: Array<[string, string]> = [
    ["Full legal name of agent or counsellor", details.full_legal_name],
    ["Business or organisation name", details.business_name || "-"],
    ["Company registration number", details.company_registration_number || "-"],
    ["Country of operation", details.country_of_operation],
    ["Business address", details.business_address],
    ["Email address", details.email],
    ["Telephone or WhatsApp number", details.phone],
    ["Government ID / company identification reference", details.identification_number || "-"],
    ["Company owner or authorised representative", details.representative_name || "-"],
    ["Position or job title", details.position_title || "-"],
  ];
  for (const [label, value] of rows) {
    write(label, { font: bold, size: 9.5, gap: 1 });
    write(value, { size: 10, gap: 6 });
  }

  y -= 6;
  write("ACCEPTANCE", { font: bold, size: 12, gap: 8 });
  for (const item of AGENT_AGREEMENT_ACCEPTANCE) {
    write(`[X] ${item}`, { size: 9.5, gap: 4 });
  }

  y -= 10;
  write("ELECTRONIC SIGNATURE", { font: bold, size: 12, gap: 8 });
  write(details.electronic_signature, { font: italic, size: 16, gap: 4 });
  write(
    `Signed electronically on ${signedAt.toUTCString()} by clicking "I AGREE AND SIGN" on the UniDoxia platform.`,
    { size: 9, gap: 2, color: rgb(0.35, 0.38, 0.44) },
  );
  write("UniDoxia · info@unidoxia.com · unidoxia.com", { size: 9, color: rgb(0.35, 0.38, 0.44) });

  return await pdf.save();
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* --------------------------------- handler -------------------------------- */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) return json(401, { error: "Unauthorized" });
    const user = userData.user;

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }

    const parsed = bodySchema.safeParse(payload);
    if (!parsed.success) {
      return json(400, { error: parsed.error.flatten().fieldErrors });
    }
    const body = parsed.data;

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: profile } = await admin
      .from("profiles")
      .select("id, tenant_id, role, full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "agent") {
      return json(403, { error: "Only recruitment agents can sign this agreement" });
    }

    const { data: agent } = await admin
      .from("agents")
      .select("id, verification_status, active")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (!agent || agent.active === false || !APPROVED_STATUSES.includes(String(agent.verification_status ?? "").toLowerCase())) {
      return json(403, { error: "Your agent account has not been approved yet" });
    }

    const version = body.agreement_version || AGENT_AGREEMENT_VERSION;

    const { data: existing } = await admin
      .from("agent_agreements")
      .select("id")
      .eq("profile_id", user.id)
      .eq("agreement_version", version)
      .maybeSingle();

    if (existing) {
      return json(200, { success: true, alreadySigned: true, emailed: true });
    }

    const signedAt = new Date();

    const { data: inserted, error: insertError } = await admin
      .from("agent_agreements")
      .insert({
        tenant_id: profile.tenant_id,
        agent_id: agent.id,
        profile_id: user.id,
        agreement_version: version,
        full_legal_name: body.full_legal_name,
        business_name: body.business_name || null,
        company_registration_number: body.company_registration_number || null,
        country_of_operation: body.country_of_operation,
        business_address: body.business_address,
        email: body.email,
        phone: body.phone,
        identification_number: body.identification_number || null,
        representative_name: body.representative_name || null,
        position_title: body.position_title || null,
        electronic_signature: body.electronic_signature,
        confirmed_read: true,
        confirmed_authority: true,
        consented_verification: true,
        signed_at: signedAt.toISOString(),
        user_agent: req.headers.get("user-agent"),
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to store agent agreement", insertError);
      return json(500, { error: "Could not store the signed agreement" });
    }

    let emailed = false;
    try {
      const pdfBytes = await buildAgreementPdf(body, signedAt);
      const resendKey = Deno.env.get("RESEND_API_KEY");

      if (resendKey) {
        const filename = `UniDoxia-Agent-Agreement-${signedAt.toISOString().slice(0, 10)}.pdf`;
        const html = `
          <div style="font-family:Arial,Helvetica,sans-serif;color:#111827;line-height:1.6">
            <h2 style="margin:0 0 12px">Your UniDoxia agent agreement</h2>
            <p>Dear ${escapeHtml(body.full_legal_name)},</p>
            <p>Thank you for signing the UniDoxia Recruitment Agent and Education Counsellor Essential Terms.</p>
            <p>A signed PDF copy of your agreement is attached for your records.</p>
            <p><strong>Agreement version:</strong> ${escapeHtml(version)}<br/>
               <strong>Signed on:</strong> ${signedAt.toUTCString()}</p>
            <p>If you have any questions, contact us at
               <a href="mailto:info@unidoxia.com">info@unidoxia.com</a>.</p>
            <p style="margin-top:24px">Warm regards,<br/>The UniDoxia Team</p>
          </div>`;

        const recipients = Array.from(new Set([body.email, profile.email].filter(Boolean) as string[]));

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "UniDoxia <info@unidoxia.com>",
            to: recipients,
            bcc: ["info@unidoxia.com"],
            subject: "Your signed UniDoxia agent agreement",
            html,
            attachments: [{ filename, content: toBase64(pdfBytes) }],
          }),
        });

        if (!response.ok) {
          console.error("Resend API error", response.status, await response.text());
        } else {
          emailed = true;
          await admin
            .from("agent_agreements")
            .update({ pdf_sent_at: new Date().toISOString() })
            .eq("id", inserted.id);
        }
      } else {
        console.error("RESEND_API_KEY is not configured; agreement stored without email");
      }
    } catch (pdfError) {
      console.error("Failed to build or send agreement PDF", pdfError);
    }

    return json(200, { success: true, agreementId: inserted.id, emailed });
  } catch (error) {
    console.error("sign-agent-agreement failed", error);
    return json(500, { error: "Unexpected error" });
  }
});
