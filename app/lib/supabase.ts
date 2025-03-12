import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
); 