import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { getSupabaseBrowserConfig, isSupabaseConfigFallback } from '@/lib/supabaseClientConfig';

const supabaseConfig = getSupabaseBrowserConfig();
const { url: SUPABASE_URL, anonKey: SUPABASE_PUBLISHABLE_KEY } = supabaseConfig;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    // Enable detection of session tokens in URL hash (for email verification, OAuth callbacks)
    detectSessionInUrl: true,
    // Use PKCE flow for enhanced security
    flowType: 'pkce',
  },
});

export const isSupabaseConfigured = !isSupabaseConfigFallback();