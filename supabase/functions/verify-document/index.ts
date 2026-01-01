import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { documentType, fileName, fileSize } = await req.json()

    // Mock AI Verification Logic
    // In a real scenario, this would call OpenAI, AWS Textract, or Google Cloud Document AI

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    let status = 'Verified';
    let reason = 'Document passes all checks.';

    // Mock rules for demonstration purposes
    const nameLower = fileName.toLowerCase();

    if (nameLower.includes('suspicious')) {
        status = 'Suspicious';
        reason = 'Manual Review Required: Document appears to be altered or inconsistent.';
    } else if (nameLower.includes('invalid') || nameLower.includes('expired')) {
        status = 'Invalid';
        reason = 'Reupload Required: Document is expired or format is incorrect.';
    } else if (documentType === 'passport' && fileSize < 5000) { // arbitrary small size
        status = 'Suspicious';
        reason = 'File size is unusually small for a passport scan.';
    } else if (documentType === 'transcript' && nameLower.includes('unofficial')) {
        status = 'Suspicious';
        reason = 'Document marked as unofficial. Please provide certified copies.';
    } else if (documentType === 'ielts' && nameLower.includes('toefl')) {
         status = 'Suspicious';
         reason = 'Filename suggests TOEFL but uploaded as IELTS.';
    }

    // Additional "AI" checks
    if (status === 'Verified') {
        if (documentType === 'transcript') {
            reason = 'Dates and grade progression consistent.';
        } else if (documentType === 'passport') {
             reason = 'Passport valid and expiry date checks out.';
        } else if (documentType === 'ielts') {
            reason = 'English test format is valid.';
        }
    }

    return new Response(
      JSON.stringify({ status, reason }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
