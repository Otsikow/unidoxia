import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type PassportExtraction = {
  full_name: string | null;
  given_names: string | null;
  surname: string | null;
  date_of_birth: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
  nationality: string | null;
  sex: string | null;
  issuing_country: string | null;
  confidence: number;
  needs_review: boolean;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const mimeType = String(body?.mimeType ?? "");
    const base64 = String(body?.imageBase64 ?? "");

    if (!ALLOWED_TYPES.has(mimeType)) {
      return json({ error: "Upload a clear JPG, PNG, or WEBP image of the passport photo page." }, 415);
    }
    if (!base64 || base64.length > Math.ceil((MAX_BYTES * 4) / 3)) {
      return json({ error: "Passport image is missing or exceeds the 8 MB limit." }, 413);
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "Passport extraction is not configured yet." }, 503);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("PASSPORT_OCR_MODEL") || "gpt-4.1-mini",
        temperature: 0,
        max_output_tokens: 700,
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: "Read this passport biodata page. Return only JSON matching the schema. Do not guess. Use ISO dates YYYY-MM-DD. If a field is unclear, return null. This is extraction only, not identity or document verification." },
            { type: "input_image", image_url: `data:${mimeType};base64,${base64}`, detail: "high" }
          ]
        }],
        text: {
          format: {
            type: "json_schema",
            name: "passport_extraction",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                full_name: { type: ["string", "null"] },
                given_names: { type: ["string", "null"] },
                surname: { type: ["string", "null"] },
                date_of_birth: { type: ["string", "null"] },
                passport_number: { type: ["string", "null"] },
                passport_expiry: { type: ["string", "null"] },
                nationality: { type: ["string", "null"] },
                sex: { type: ["string", "null"] },
                issuing_country: { type: ["string", "null"] },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                needs_review: { type: "boolean" }
              },
              required: ["full_name", "given_names", "surname", "date_of_birth", "passport_number", "passport_expiry", "nationality", "sex", "issuing_country", "confidence", "needs_review"]
            }
          }
        }
      })
    });

    if (!response.ok) {
      console.error("OpenAI passport OCR failed", response.status, await response.text());
      return json({ error: "Passport extraction failed. Please try a clearer image." }, 502);
    }

    const result = await response.json();
    const outputText = result.output?.flatMap((item: any) => item.content ?? [])
      .find((item: any) => item.type === "output_text")?.text;
    if (!outputText) return json({ error: "No passport details could be read. Please try a clearer image." }, 422);

    const extraction = JSON.parse(outputText) as PassportExtraction;
    extraction.confidence = Math.max(0, Math.min(1, Number(extraction.confidence) || 0));
    extraction.needs_review = extraction.needs_review || extraction.confidence < 0.85;
    return json({ extraction });
  } catch (error) {
    console.error("passport-ocr error", error);
    return json({ error: "Unable to process the passport image." }, 400);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
