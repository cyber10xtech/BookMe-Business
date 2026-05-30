// External Supabase client pointing to the unified production database.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://trnsuruvwdzfrhfaboxe.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRybnN1cnV2d2R6ZnJoZmFib3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMzkxMzMsImV4cCI6MjA5MTYxNTEzM30.asqTEqqVPY1WsSrDsIELHKde25qMUdTqSJXP2bNFsvM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const EXTERNAL_PROJECT_ID = "trnsuruvwdzfrhfaboxe";
