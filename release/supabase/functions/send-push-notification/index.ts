/**
 * send-push-notification — Supabase Edge Function
 *
 * Sends an FCM push notification via the HTTP v1 API whenever a row is
 * inserted into the `notifications` table (triggered by a Postgres trigger
 * that calls this function via pg_net / Supabase Database Webhooks).
 *
 * Required environment variables (set in Supabase Dashboard → Edge Functions → Secrets):
 *   GOOGLE_SERVICE_ACCOUNT_JSON  — full JSON of your Firebase service account key
 *   FCM_PROJECT_ID               — your Firebase project ID  (e.g. "bookme-xyz")
 *   SUPABASE_URL                 — already injected by Supabase automatically
 *   SUPABASE_SERVICE_ROLE_KEY    — already injected by Supabase automatically
 *
 * How to get GOOGLE_SERVICE_ACCOUNT_JSON:
 *   Firebase Console → Project Settings → Service Accounts → Generate new private key
 *   Copy the entire downloaded JSON and store it as a single-line secret.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Types ─────────────────────────────────────────────────────────────────────

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  related_booking_id?: string | null;
  data?: Record<string, unknown> | null;
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Base64url encode (no padding) */
const b64url = (input: string | Uint8Array): string => {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
};

/** Convert PEM private key to DER ArrayBuffer */
const pemToDer = (pem: string): ArrayBuffer => {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

/**
 * Obtain a short-lived Google OAuth2 access token using a service account JWT.
 * This implements the JWT Bearer Token flow required by FCM HTTP v1.
 */
async function getGoogleAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    sub: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const signingInput =
    b64url(JSON.stringify(header)) + "." + b64url(JSON.stringify(payload));

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  const jwt = signingInput + "." + b64url(new Uint8Array(signatureBuffer));

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:
      "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer" +
      "&assertion=" +
      jwt,
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Google token exchange failed: ${err}`);
  }

  const { access_token } = await tokenRes.json();
  return access_token as string;
}

/**
 * Send a single FCM push message via HTTP v1.
 * Returns true on success, false on unregistered/invalid token (caller should clean up).
 */
async function sendFcmMessage(
  accessToken: string,
  projectId: string,
  fcmToken: string,
  notification: { title: string; body: string },
  data: Record<string, string> = {}
): Promise<"ok" | "invalid_token" | "error"> {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const message = {
    message: {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      // data fields must all be strings
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channel_id: "bookme_notifications",
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(message),
  });

  if (res.ok) return "ok";

  const errBody = await res.json().catch(() => ({}));
  const errCode = errBody?.error?.details?.[0]?.errorCode ?? errBody?.error?.status;

  if (
    errCode === "UNREGISTERED" ||
    errCode === "INVALID_ARGUMENT" ||
    res.status === 404
  ) {
    console.warn(`[FCM] Stale/invalid token for user — will delete: ${fcmToken.slice(0, 20)}…`);
    return "invalid_token";
  }

  console.error("[FCM] Send error:", JSON.stringify(errBody));
  return "error";
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Supabase Database Webhooks / pg_net send POST with JSON body
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Validate internal call via shared secret (optional but recommended)
  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  let notification: NotificationRow;
  try {
    // Database Webhooks wrap the record in { type, table, schema, record, old_record }
    const body = await req.json();
    notification = (body.record ?? body) as NotificationRow;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  if (!notification?.user_id || !notification?.title) {
    return new Response("Missing required fields", { status: 400 });
  }

  // ── Load config ─────────────────────────────────────────────────────────────
  const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  const projectId = Deno.env.get("FCM_PROJECT_ID");

  if (!saJson || !projectId) {
    console.error("[FCM] Missing GOOGLE_SERVICE_ACCOUNT_JSON or FCM_PROJECT_ID");
    return new Response("Server misconfiguration", { status: 500 });
  }

  let serviceAccount: ServiceAccount;
  try {
    serviceAccount = JSON.parse(saJson);
  } catch {
    console.error("[FCM] Invalid GOOGLE_SERVICE_ACCOUNT_JSON — not valid JSON");
    return new Response("Server misconfiguration", { status: 500 });
  }

  // ── Look up FCM tokens for this user ────────────────────────────────────────
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    serviceRoleKey
  );

  // Query fcm_tokens table (primary — supports multi-device)
  // Also check profiles.fcm_token as a fallback for users who haven't refreshed
  // their token after the multi-device migration.
  const [tokensRes, profileRes] = await Promise.all([
    supabase
      .from("fcm_tokens")
      .select("id, token")
      .eq("user_id", notification.user_id),
    supabase
      .from("profiles")
      .select("fcm_token")
      .or(`user_id.eq.${notification.user_id},id.eq.${notification.user_id}`)
      .not("fcm_token", "is", null)
      .limit(1)
      .maybeSingle(),
  ]);

  // Merge tokens, deduplicate
  const tokenMap = new Map<string, string>(); // token → row id (for cleanup)
  (tokensRes.data ?? []).forEach((r: { id: string; token: string }) =>
    tokenMap.set(r.token, r.id)
  );
  // Add profile fallback token if not already in the set
  const fallbackToken = profileRes.data?.fcm_token as string | null;
  if (fallbackToken && !tokenMap.has(fallbackToken)) {
    tokenMap.set(fallbackToken, "profile"); // "profile" = came from profiles table
  }

  if (tokenMap.size === 0) {
    console.log(`[FCM] No token for user ${notification.user_id} — skipping push`);
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Get Google access token (one per invocation) ─────────────────────────────
  let accessToken: string;
  try {
    accessToken = await getGoogleAccessToken(serviceAccount);
  } catch (e) {
    console.error("[FCM] Failed to get Google access token:", e);
    return new Response("Failed to authenticate with Google", { status: 502 });
  }

  // ── Build notification payload ───────────────────────────────────────────────
  const notifPayload = {
    title: notification.title,
    body: notification.body,
  };

  const dataPayload: Record<string, string> = {
    notification_id: notification.id,
    type: notification.type,
  };
  if (notification.related_booking_id) {
    dataPayload.related_booking_id = notification.related_booking_id;
  }
  if (notification.data && typeof notification.data === "object") {
    Object.entries(notification.data).forEach(([k, v]) => {
      if (v != null) dataPayload[k] = String(v);
    });
  }

  // ── Send to all devices, collect stale tokens ────────────────────────────────
  const staleTokenRowIds: string[] = [];
  let sent = 0;

  await Promise.all(
    Array.from(tokenMap.entries()).map(async ([token, rowId]) => {
      const result = await sendFcmMessage(
        accessToken,
        projectId,
        token,
        notifPayload,
        dataPayload
      );
      if (result === "ok") {
        sent++;
      } else if (result === "invalid_token") {
        staleTokenRowIds.push(rowId);
      }
    })
  );

  // ── Clean up stale tokens ─────────────────────────────────────────────────────
  const staleTableIds = staleTokenRowIds.filter((id) => id !== "profile");
  if (staleTableIds.length > 0) {
    await supabase.from("fcm_tokens").delete().in("id", staleTableIds);
  }
  // If the profile fallback token was stale, null it out
  if (staleTokenRowIds.includes("profile") && fallbackToken) {
    await supabase
      .from("profiles")
      .update({ fcm_token: null })
      .or(`user_id.eq.${notification.user_id},id.eq.${notification.user_id}`);
  }

  console.log(
    `[FCM] user=${notification.user_id} type=${notification.type} sent=${sent}/${tokenMap.size} stale=${staleTokenRowIds.length}`
  );

  return new Response(
    JSON.stringify({ sent, total: tokenMap.size, stale: staleTokenRowIds.length }),
    { headers: { "Content-Type": "application/json" } }
  );
});
