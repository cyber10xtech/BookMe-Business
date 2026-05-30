import { supabase } from '@/lib/supabase';

// Safe platform check — reads the global Capacitor object injected by the
// native bridge at runtime. Returns false on web (no bridge present).
const isNative = (): boolean => {
  try {
    return (window as any)?.Capacitor?.isNativePlatform?.() ?? false;
  } catch {
    return false;
  }
};

let _registered = false;

export const initPushNotifications = async (userId: string) => {
  // Only run on native — silently skip on web
  if (!isNative()) return;
  if (_registered) return;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

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
          await supabase.from('fcm_tokens').upsert(
            { user_id: userId, token: fcmToken, platform: 'android' },
            { onConflict: 'token' }
          );
        }

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
  } catch (err) {
    console.error('[FCM] Failed to initialise push notifications:', err);
  }
};

export const clearFcmToken = async (userId: string) => {
  _registered = false;
  await Promise.allSettled([
    supabase.from('profiles').update({ fcm_token: null }).eq('user_id', userId),
    supabase.from('fcm_tokens').delete().eq('user_id', userId).eq('platform', 'android'),
  ]);
};
