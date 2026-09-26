import { createClient } from '@supabase/supabase-js';

// These come from your Supabase project settings (Project Settings > API).
// The "publishable" key below is safe to expose in frontend code.
const SUPABASE_URL = 'https://ivpiwardlmjsogogxpjm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VXC4PTCxWe9Cw7TcrR5D_A_vC208aRy';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
