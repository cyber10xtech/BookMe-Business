package com.bookmebusiness.bookmeapp;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  private static final int REQUEST_NOTIFICATION_PERMISSION = 1001;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    SplashScreen.installSplashScreen(this);
    super.onCreate(savedInstanceState);

    // ── Create all notification channels at startup (Android 8+) ──────────
    // Channels MUST be created before any notification is delivered.
    // Creating an already-existing channel is a no-op, so it is safe to call
    // this every time onCreate runs.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      createNotificationChannels();
    }

    // ── Request POST_NOTIFICATIONS permission (Android 13+) ───────────────
    if (Build.VERSION.SDK_INT >= 33) {
      if (ContextCompat.checkSelfPermission(
            this, Manifest.permission.POST_NOTIFICATIONS)
          != PackageManager.PERMISSION_GRANTED) {
        ActivityCompat.requestPermissions(
          this,
          new String[]{ Manifest.permission.POST_NOTIFICATIONS },
          REQUEST_NOTIFICATION_PERMISSION
        );
      }
    }
  }

  /**
   * Register every notification channel the app uses.
   * Channel IDs here must match the channel_id values sent in FCM payloads
   * from the Supabase send-notification edge function.
   */
  private void createNotificationChannels() {
    NotificationManager manager = getSystemService(NotificationManager.class);
    if (manager == null) return;

    // Primary channel — used by the edge function (channel_id: "bookme_notifications")
    manager.createNotificationChannel(makeChannel(
      "bookme_notifications",
      "BookMe Notifications",
      "General booking and app notifications",
      NotificationManager.IMPORTANCE_HIGH
    ));

    // New booking request received (business side)
    manager.createNotificationChannel(makeChannel(
      "new_booking",
      "New Bookings",
      "Alerts for incoming booking requests",
      NotificationManager.IMPORTANCE_HIGH
    ));

    // Booking confirmed / accepted
    manager.createNotificationChannel(makeChannel(
      "booking_confirm",
      "Booking Confirmed",
      "Alerts when a booking is confirmed",
      NotificationManager.IMPORTANCE_HIGH
    ));

    // Booking status updates (rescheduled, cancelled, completed)
    manager.createNotificationChannel(makeChannel(
      "booking_update",
      "Booking Updates",
      "Alerts for changes to existing bookings",
      NotificationManager.IMPORTANCE_DEFAULT
    ));

    // In-app messages from customers
    manager.createNotificationChannel(makeChannel(
      "new_message",
      "Messages",
      "Alerts for new messages from customers",
      NotificationManager.IMPORTANCE_HIGH
    ));

    // System / admin alerts
    manager.createNotificationChannel(makeChannel(
      "system",
      "System Alerts",
      "Account and system notifications",
      NotificationManager.IMPORTANCE_DEFAULT
    ));

    // Fallback default channel (FCM uses this when no channel_id is specified)
    manager.createNotificationChannel(makeChannel(
      "default",
      "General",
      "Miscellaneous notifications",
      NotificationManager.IMPORTANCE_DEFAULT
    ));
  }

  /** Helper to build a NotificationChannel with consistent settings. */
  private NotificationChannel makeChannel(
      String id, String name, String description, int importance) {
    NotificationChannel channel = new NotificationChannel(id, name, importance);
    channel.setDescription(description);
    channel.enableVibration(true);
    // Sound is controlled by the notification payload; enabling here ensures
    // the channel doesn't silently override it.
    channel.setShowBadge(true);
    return channel;
  }
}
