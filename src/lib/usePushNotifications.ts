import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/lib/supabase';

let _registered = false;

export const initPushNotifications = async (userId: string) => {
  // Prevent duplicate listeners if called multiple times (e.g. auth state flicker)
  if (_registered) return;

  const permStatus = await PushNotifications.requestPermissions();
  if (permStatus.receive !== 'granted') {
    console.warn('[FCM] Permission not granted');
    return;
  }

  await PushNotifications.register();

  PushNotifications.addListener('registration', async (token) => {
    const fcmToken = token.value;
    console.log('[FCM] Token received:', fcmToken);

    try {
      // ── 1. Save to fcm_tokens table ──────────────────────────────────────
      // Upsert on (user_id, platform) so a refreshed token replaces the old
      // one for this device instead of creating a duplicate row.
      const { error: tokenErr } = await supabase
        .from('fcm_tokens')
        .upsert(
          {
            user_id: userId,
            token: fcmToken,
            platform: 'android',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,platform' }
        );
      if (tokenErr) {
        // Fallback: if the (user_id, platform) unique constraint doesn't exist
        // yet (SQL not run), fall back to the existing token-unique upsert.
        await supabase.from('fcm_tokens').upsert(
          { user_id: userId, token: fcmToken, platform: 'android' },
          { onConflict: 'token' }
        );
      }

      // ── 2. Mirror token to profiles.fcm_token ───────────────────────────
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ fcm_token: fcmToken })
        .eq('user_id', userId);

      if (profileErr) {
        console.error('[FCM] Failed to update profiles.fcm_token:', profileErr.message);
      }

      _registered = true;
      console.log('[FCM] Token saved to both fcm_tokens and profiles');
    } catch (err) {
      console.error('[FCM] Error saving token:', err);
    }
  });

  PushNotifications.addListener('registrationError', (err) => {
    console.error('[FCM] Registration error:', err);
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('[FCM] Foreground notification:', notification);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const data = action.notification.data;
    if (data?.related_booking_id) {
      window.location.href = `/calendar?booking=${data.related_booking_id}`;
    } else if (data?.click_action) {
      window.location.href = data.click_action;
    }
  });
};

/**
 * Call on sign-out to clear both storage locations and reset the guard flag.
 */
export const clearFcmToken = async (userId: string) => {
  _registered = false;
  await Promise.allSettled([
    supabase.from('profiles').update({ fcm_token: null }).eq('user_id', userId),
    supabase.from('fcm_tokens').delete().eq('user_id', userId).eq('platform', 'android'),
  ]);
};
