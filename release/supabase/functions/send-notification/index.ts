import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  user_id: string;
  title: string;
  message: string;
  type?: string;
  related_booking_id?: string;
}

/**
 * Get a short-lived OAuth2 access token for FCM HTTP v1 API
 * using a Google Service Account (JWT → access_token exchange).
 */
async function getAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
  token_uri: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: serviceAccount.token_uri,
    iat: now,
    exp: now + 3600,
  };

  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const unsignedToken = `${enc(header)}.${enc(payload)}`;

  const pemBody = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${unsignedToken}.${sig}`;

  const tokenRes = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error(`Token exchange failed: ${JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}

/**
 * Remove a stale/invalid FCM token from both storage locations.
 * Called automatically when FCM returns UNREGISTERED or INVALID_REGISTRATION.
 */
async function removeStaleToken(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  staleToken: string
) {
  console.log(`[FCM] Removing stale token for user ${userId}`);
  await Promise.allSettled([
    supabase.from("fcm_tokens").delete().eq("token", staleToken),
    supabase
      .from("profiles")
      .update({ fcm_token: null })
      .eq("user_id", userId)
      .eq("fcm_token", staleToken), // only clear if it still matches
  ]);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_KEY");
    if (!serviceAccountJson) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not configured");
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id;
    if (!projectId) {
      throw new Error("project_id missing from service account key");
    }

    const body: NotificationPayload = await req.json();
    const { user_id, title, message, type, related_booking_id } = body;

    if (!user_id || !title || !message) {
      return new Response(
        JSON.stringify({ error: "user_id, title, and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── Resolve the best FCM token ───────────────────────────────────────────
    // Strategy:
    //   1. Check fcm_tokens table — pick the most recently updated token for
    //      this user (supports token refresh; most current device token wins).
    //   2. Fall back to profiles.fcm_token for users who registered before the
    //      fcm_tokens table was introduced.

    let fcmToken: string | null = null;
    let tokenSource: "fcm_tokens" | "profiles" = "fcm_tokens";

    const { data: tokenRows } = await supabase
      .from("fcm_tokens")
      .select("token, updated_at, created_at")
      .eq("user_id", user_id)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1);

    if (tokenRows && tokenRows.length > 0) {
      fcmToken = tokenRows[0].token;
      tokenSource = "fcm_tokens";
    } else {
      // Fallback: read from profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("fcm_token")
        .eq("user_id", user_id)
        .single();
      fcmToken = profile?.fcm_token ?? null;
      tokenSource = "profiles";
    }

    if (!fcmToken) {
      console.log(`[FCM] No token found for user ${user_id}, skipping push`);
      return new Response(
        JSON.stringify({ success: true, push_sent: false, reason: "no_fcm_token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[FCM] Sending to user ${user_id} via ${tokenSource}`);

    // ── Send via FCM HTTP v1 ─────────────────────────────────────────────────
    const accessToken = await getAccessToken(serviceAccount);

    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    const fcmPayload = {
      message: {
        token: fcmToken,
        notification: { title, body: message },
        data: {
          type: type || "info",
          related_booking_id: related_booking_id || "",
          click_action: related_booking_id
            ? `/calendar?booking=${related_booking_id}`
            : "/notifications",
        },
        android: {
          priority: "high" as const,
          notification: {
            sound: "default",
            channel_id: "bookme_notifications",
          },
        },
      },
    };

    const fcmRes = await fetch(fcmUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fcmPayload),
    });

    const fcmResult = await fcmRes.json();

    // ── Handle stale / invalid token ─────────────────────────────────────────
    if (!fcmRes.ok) {
      const errorCode =
        fcmResult?.error?.details?.[0]?.errorCode ?? fcmResult?.error?.status ?? "";

      if (
        errorCode === "UNREGISTERED" ||
        errorCode === "INVALID_REGISTRATION" ||
        errorCode === "INVALID_ARGUMENT"
      ) {
        // Token is dead — remove it so the next send attempt fails fast
        // rather than wasting a round-trip.
        await removeStaleToken(supabase, user_id, fcmToken);
        console.warn(`[FCM] Stale token removed for user ${user_id}`);
      }

      console.error("[FCM] Send failed:", JSON.stringify(fcmResult));
      return new Response(
        JSON.stringify({ success: true, push_sent: false, fcm_error: fcmResult }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── On success, ensure profiles.fcm_token stays in sync ─────────────────
    // If we fetched from fcm_tokens table, mirror the token to profiles as well
    // so both columns are always consistent.
    if (tokenSource === "fcm_tokens") {
      await supabase
        .from("profiles")
        .update({ fcm_token: fcmToken })
        .eq("user_id", user_id);
    }

    console.log("[FCM] Push sent successfully:", fcmResult.name);
    return new Response(
      JSON.stringify({ success: true, push_sent: true, message_name: fcmResult.name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
