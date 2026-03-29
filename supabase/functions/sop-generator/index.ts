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

  const auth = await getAuthenticatedUser(req);
  if (auth.error) return auth.error;

  try {
    const {
      background,
      motivation,
      program,
      university,
      goals,
      workExperience,
      relevantSkills,
      achievements,
      tone,
      targetWordCount,
    } = await req.json();

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const targetWords = Math.min(Math.max(Number(targetWordCount) || 600, 400), 900);
    const prompt = `Write a concise, compelling Statement of Purpose (SoP) in ${targetWords} words.

Context:
- Academic background: ${background || 'Not provided'}
- Motivation: ${motivation || 'Not provided'}
- Target program: ${program || 'Not provided'}
- Target university: ${university || 'Not provided'}
- Career goals: ${goals || 'Not provided'}
 - Work experience: ${workExperience || 'Not provided'}
 - Relevant skills: ${relevantSkills || 'Not provided'}
 - Achievements: ${achievements || 'Not provided'}

Guidelines:
- Use ${tone || 'professional'} but personable tone
- Avoid generic claims; be specific and authentic
- Include a brief narrative of past experiences leading to the program
- Connect the program/university strengths to goals
- End with forward-looking, confident conclusion
- Do not fabricate facts; use only provided context
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert academic writing assistant.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const sop = data.choices[0]?.message?.content ?? '';

    return new Response(JSON.stringify({ sop }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in sop-generator function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
