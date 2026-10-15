import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Server-side document validation edge function.
 * 
 * This provides a secondary validation layer after client-side checks.
 * It verifies that uploaded documents meet integrity requirements before
 * they are marked as complete in the database.
 * 
 * Validates:
 * - File exists in storage
 * - File size matches expected size (no truncation)
 * - PDFs have valid %%EOF trailer
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { bucket, path, expectedSize, expectedMimeType } = await req.json();

    if (!bucket || !path || !expectedSize) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Missing required parameters: bucket, path, expectedSize' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if file exists and get metadata
    const fileName = path.split('/').pop();
    const folderPath = path.split('/').slice(0, -1).join('/');

    const { data: files, error: listError } = await supabase.storage
      .from(bucket)
      .list(folderPath, { search: fileName });

    if (listError) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: `Storage error: ${listError.message}` 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!files || files.length === 0) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'File not found in storage' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const fileMetadata = files[0];
    const actualSize = fileMetadata.metadata?.size || 0;

    // Validate file size
    if (actualSize !== expectedSize) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: `File size mismatch: expected ${expectedSize} bytes, got ${actualSize} bytes`,
          actualSize,
          expectedSize,
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // PDF-specific validation
    if (expectedMimeType === 'application/pdf') {
      // Download last 1KB of file to check for %%EOF trailer
      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from(bucket)
        .download(path);

      if (downloadError || !fileBlob) {
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: 'Failed to download file for validation' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Check PDF trailer
      const arrayBuffer = await fileBlob.arrayBuffer();
      const lastChunkSize = Math.min(1024, arrayBuffer.byteLength);
      const lastChunk = arrayBuffer.slice(arrayBuffer.byteLength - lastChunkSize);
      const decoder = new TextDecoder('latin1');
      const text = decoder.decode(lastChunk);
      const trimmed = text.trimEnd();

      if (!trimmed.endsWith('%%EOF')) {
        return new Response(
          JSON.stringify({
            valid: false,
            error: 'PDF file is truncated or corrupted (missing %%EOF trailer)',
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // All validations passed
    return new Response(
      JSON.stringify({
        valid: true,
        actualSize,
        message: 'File validation successful',
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Validation error:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown validation error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
