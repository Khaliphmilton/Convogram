import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://cckobknolduqnsimwvdu.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_fh481UbIohlw55Ry9_pTDg_DqK8Y3fb";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
