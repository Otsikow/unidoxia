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
    // Validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Invalid JSON in request body', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
      });
      return new Response(
        JSON.stringify({
          error: 'Invalid request format. Expected JSON body.',
          details: 'Request body must be valid JSON',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      );
    }

    const { documentType, fileName, fileSize } = requestBody;

    // Validate required fields
    if (!documentType || typeof documentType !== 'string') {
      return new Response(
        JSON.stringify({
          error: 'Validation error',
          details: 'documentType is required and must be a string',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      );
    }

    if (!fileName || typeof fileName !== 'string') {
      return new Response(
        JSON.stringify({
          error: 'Validation error',
          details: 'fileName is required and must be a string',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      );
    }

    // Validate fileSize if provided
    if (fileSize !== undefined && (typeof fileSize !== 'number' || fileSize < 0)) {
      return new Response(
        JSON.stringify({
          error: 'Validation error',
          details: 'fileSize must be a positive number',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      );
    }

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
  } catch (error: unknown) {
    console.error('Document verification error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });

    let errorMessage = 'Document verification failed';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('network')) {
        errorMessage = 'Network timeout during verification. Please try again.';
        statusCode = 503;
      } else if (error.message.includes('parse') || error.message.includes('JSON')) {
        errorMessage = 'Invalid request format. Please check your input.';
        statusCode = 400;
      } else {
        errorMessage = `Verification error: ${error.message}`;
      }
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      },
    )
  }
})
