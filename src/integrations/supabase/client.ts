import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { brokeredPreviewStorage } from './previewAuthStorage';
import { getSupabaseBrowserConfig, isSupabaseConfigFallback } from '@/lib/supabaseClientConfig';

const supabaseConfig = getSupabaseBrowserConfig();
const { url: SUPABASE_URL, anonKey: SUPABASE_PUBLISHABLE_KEY } = supabaseConfig;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: brokeredPreviewStorage(),
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const isSupabaseConfigured = !isSupabaseConfigFallback();