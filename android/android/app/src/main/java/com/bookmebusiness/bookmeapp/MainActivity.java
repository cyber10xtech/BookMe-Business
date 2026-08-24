package com.bookmebusiness.bookmeapp;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // Must match:
    //   1. com.google.firebase.messaging.default_notification_channel_id in AndroidManifest.xml
    //   2. the "channel_id" hardcoded in the send-notification edge function's
    //      android.notification payload (supabase/functions/send-notification)
    // That edge-function value takes priority over the manifest default on
    // every real push, so all three must stay in sync. On Android 8+ (API
    // 26+), FCM silently drops any notification targeting a channel ID that
    // doesn't exist yet — this has to be created before the first push can
    // arrive, so it's done here in onCreate() rather than lazily anywhere else.
    private static final String DEFAULT_CHANNEL_ID = "bookme_default";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createDefaultNotificationChannel();
    }

    private void createDefaultNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                DEFAULT_CHANNEL_ID,
                "General",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Bookings, messages, and account updates");
            channel.enableLights(true);
            channel.setLightColor(Color.parseColor("#0D1626"));
            channel.enableVibration(true);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
