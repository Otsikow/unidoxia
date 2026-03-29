import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function getAuthenticatedUser(req: Request): Promise<{ user: { id: string; email?: string }; error?: never } | { user?: never; error: Response }> {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) };
  }
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) {
    return { error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) };
  }
  return { user: data.user };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const auth = await getAuthenticatedUser(req);
  if (auth.error) return auth.error;

  try {
    const { interests, preferredCountries, budget, currentLevel, targetLevel } = await req.json();
    if (
      (interests && typeof interests !== 'string') ||
      (preferredCountries && !Array.isArray(preferredCountries)) ||
      (budget && typeof budget !== 'number') ||
      (currentLevel && typeof currentLevel !== 'string') ||
      (targetLevel && typeof targetLevel !== 'string')
    ) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (Array.isArray(preferredCountries) && preferredCountries.length > 20) {
      return new Response(JSON.stringify({ error: 'Too many countries' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log('Generating AI recommendations for:', { interests, preferredCountries, budget, currentLevel, targetLevel });

    const prompt = `You are an expert university advisor. Based on the following student profile, provide personalized recommendations:

Student Profile:
- Academic Interests: ${interests || 'Not specified'}
- Preferred Countries: ${preferredCountries?.join(', ') || 'Not specified'}
- Budget (USD): ${budget ? `Up to $${budget}` : 'Not specified'}
- Current Education Level: ${currentLevel || 'Not specified'}
- Target Program Level: ${targetLevel || 'Not specified'}

Provide 3-5 specific, actionable recommendations for universities and scholarships. For each recommendation, explain:
1. Why it's a good fit for this student
2. Key programs or opportunities to explore
3. Potential scholarship opportunities
4. Next steps the student should take

Format the response in clear, concise bullet points.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a knowledgeable university admissions advisor helping students find the best educational opportunities. Provide specific, actionable advice.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const recommendations = data.choices[0].message.content;

    console.log('Generated recommendations successfully');

    return new Response(JSON.stringify({ recommendations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in zoe-staff-prompt function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
