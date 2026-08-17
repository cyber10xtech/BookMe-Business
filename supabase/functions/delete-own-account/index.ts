/**
 * delete-own-account — Supabase Edge Function
 *
 * Deletes the currently authenticated user's own account from auth.users.
 *
 * ── SECURITY MODEL ──────────────────────────────────────────────────────────
 * The user to delete is ALWAYS derived from the JWT in the Authorization
 * header. The request body is never read or parsed. No user ID supplied by
 * the client can influence which account is deleted.
 *
 * Flow:
 *  1. Require an Authorization header — 401 if missing.
 *  2. Validate the JWT by calling auth.getUser() with the anon key.
 *     An invalid/expired token causes getUser() to return an error → 401.
 *  3. Extract authUserId from the validated JWT result.
 *  4. Call auth.admin.deleteUser(authUserId) using the service-role key.
 *     The service-role key is read from Deno.env — it never travels to the
 *     client and is never embedded in the Business App's source code.
 *  5. On success: return HTTP 200. The client then calls supabase.auth.signOut()
 *     locally to clear the now-invalid session.
 *  6. On failure: record the failed attempt in pending_auth_deletions and
 *     return HTTP 500. The client shows an error and does NOT sign the user
 *     out. The account is still active.
 *
 * ── DATABASE CASCADE ────────────────────────────────────────────────────────
 * Deleting auth.users.id triggers these confirmed ON DELETE CASCADE chains:
 *
 * CONFIRMED IN MIGRATIONS (20260413011734_*.sql + later migrations):
 *   auth.users → profiles         (profiles.user_id → auth.users ON DELETE CASCADE)
 *   profiles   → services         (services.provider_id → profiles ON DELETE CASCADE)
 *   profiles   → bookings         (bookings.customer_id/provider_id → profiles ON DELETE CASCADE)
 *   profiles   → reviews          (reviews.customer_id/provider_id → profiles ON DELETE CASCADE)
 *   profiles   → messages         (messages.sender_id → profiles ON DELETE CASCADE)
 *   profiles   → notifications    (notifications.user_id → profiles ON DELETE CASCADE)
 *   profiles   → favorites        (favorites.user_id/provider_id → profiles ON DELETE CASCADE)
 *   profiles   → customer_points  (customer_points.profile_id → profiles ON DELETE CASCADE)
 *   profiles   → customer_points_log (profile_id → profiles ON DELETE CASCADE)
 *
 * FROM SCHEMA DOCUMENT (tables not in tracked migrations — confirmed present
 * in the live database but created outside the migration files in this repo):
 *   auth.users → gallery_photos   (gallery_photos.user_id → auth.users)
 *   auth.users → fcm_tokens       (fcm_tokens.user_id → auth.users)
 *   auth.users → clients          (clients.business_user_id → auth.users)
 *   auth.users → promotions       (promotions.user_id → auth.users)
 *   auth.users → saved_providers  (saved_providers.user_id → auth.users)
 *   auth.users → availability     (availability.provider_id → profiles → auth.users)
 *   auth.users → documents        (documents.profile_id → profiles → auth.users)
 *   auth.users → chat_conversations (provider_user_id/customer_user_id → auth.users)
 *   auth.users → chat_messages    (sender_id → auth.users)
 *
 * NOTE: The ON DELETE behaviour for the tables listed under "schema document"
 * could not be confirmed from tracked migration SQL files because those tables
 * were created directly in the live database rather than via migrations. The
 * schema document states CASCADE for these. If any FK is actually RESTRICT or
 * NO ACTION, auth.admin.deleteUser() will fail and be recorded in
 * pending_auth_deletions rather than silently succeeding with orphan data.
 *
 * ── CONFIRMED SET NULL (no cascade, rows retained) ──────────────────────────
 *   bookings.business_user_id → auth.users ON DELETE SET NULL
 *   deep_link_events.user_id  → auth.users ON DELETE SET NULL
 *   deep_link_events.provider_id → profiles ON DELETE SET NULL
 *
 * ── NO FK TO users (rows retained) ──────────────────────────────────────────
 *   booking_trigger_audit, analytics_* tables, ai_* tables
 *
 * ── CORS ─────────────────────────────────────────────────────────────────────
 * Origin is set to * following standard Supabase Edge Function practice.
 * The JWT validation in step 2 is the actual security boundary — a request
 * without a valid Supabase user JWT is rejected at step 2 regardless of origin.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // ── CORS pre-flight ────────────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // ── Step 1: Require Authorization header ──────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // ── Step 2: Validate the JWT via the anon-key client ─────────────────────
    // createClient with the caller's Authorization header causes Supabase to
    // validate the token server-side. getUser() returns an error for any
    // invalid, expired, or tampered token.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser }, error: userError } = await callerClient.auth.getUser();

    if (userError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized — invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 3: authUserId comes from the validated JWT — never from the body ──
    const authUserId = callerUser.id;
    const email      = callerUser.email ?? null;

    // ── Step 4: Delete with service-role key ──────────────────────────────────
    // The service-role key is in Deno.env (set by Supabase infrastructure).
    // It is never embedded in client code or transmitted to the Business App.
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(authUserId);

    // ── Step 5: Failure path ──────────────────────────────────────────────────
    if (deleteError) {
      console.error(
        `[delete-own-account] auth.admin.deleteUser failed for ${authUserId}:`,
        deleteError.message
      );

      // Record the failure so an admin can retry. Use a separate try/catch so
      // a failure to write to pending_auth_deletions never changes the HTTP
      // response — we still return 500 with the original deletion error.
      try {
        await adminClient
          .from("pending_auth_deletions")
          .upsert(
            {
              auth_user_id:    authUserId,
              email,
              last_attempt_at: new Date().toISOString(),
              last_error:      deleteError.message,
              resolved:        false,
            },
            { onConflict: "auth_user_id" }
          );
      } catch (recordErr) {
        // Log but do not re-throw — the deletion failure response takes
        // precedence. The admin can find the user ID in Edge Function logs.
        console.error(
          "[delete-own-account] Failed to record in pending_auth_deletions:",
          recordErr instanceof Error ? recordErr.message : recordErr
        );
      }

      return new Response(
        JSON.stringify({
          error: "Account deletion failed. Please try again or contact support@bookmebusiness.com.",
          code:  "DELETE_FAILED",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 6: Success ───────────────────────────────────────────────────────
    // auth.users row deleted; database CASCADE removes all child records.
    // Return 200 so the client can sign out locally.
    console.log(`[delete-own-account] Successfully deleted auth user ${authUserId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[delete-own-account] Unexpected error:", message);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
