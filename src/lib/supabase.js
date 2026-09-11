import { createClient } from "@supabase/supabase-js";

// Build-time environment variables are preferred for deployments.
// The publishable key is safe for browser use; never put a service-role/secret key here.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://cckobknolduqnsimwvdu.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_dnyPhxVf2nVqHE1UOR96Fg_HpqE4M32";

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
