// External Supabase client pointing to the unified production database.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://trnsuruvwdzfrhfaboxe.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRybnN1cnV2d2R6ZnJoZmFib3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMzkxMzMsImV4cCI6MjA5MTYxNTEzM30.asqTEqqVPY1WsSrDsIELHKde25qMUdTqSJXP2bNFsvM";

/**
 * Named storage key prevents session data colliding with the customer app
 * if both are ever installed on the same device / WebView profile.
 *
 * localStorage on Capacitor Android WebView persists across:
 *   • app backgrounds / foregrounds
 *   • process-death + cold restarts (Android keeps the WebView data dir)
 *
 * Session liveness is maintained by AuthContext's three complementary
 * mechanisms: visibilitychange, App.appStateChange, and a 10-min heartbeat.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage:            localStorage,
    storageKey:         "bookme-business-auth",   // ← scoped key (was missing)
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: false,                     // ← prevents spurious URL parsing
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

export const EXTERNAL_PROJECT_ID = "trnsuruvwdzfrhfaboxe";
