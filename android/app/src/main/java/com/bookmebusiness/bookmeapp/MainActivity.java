package com.bookmebusiness.bookmeapp;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannels();
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager == null) return;

            int navyColor = Color.parseColor("#0D1626");

            // 1. Default / Fallback
            NotificationChannel defaultChan = new NotificationChannel(
                "bookme_default",
                "General",
                NotificationManager.IMPORTANCE_HIGH
            );
            defaultChan.setDescription("General notifications and account updates");
            defaultChan.enableLights(true);
            defaultChan.setLightColor(navyColor);
            defaultChan.enableVibration(true);
            manager.createNotificationChannel(defaultChan);

            // 2. Chat & Messages
            NotificationChannel chatChan = new NotificationChannel(
                "bookme_chat",
                "Chat & Messages",
                NotificationManager.IMPORTANCE_HIGH
            );
            chatChan.setDescription("New direct messages from customers");
            chatChan.enableLights(true);
            chatChan.setLightColor(navyColor);
            chatChan.enableVibration(true);
            manager.createNotificationChannel(chatChan);

            // 3. New Bookings
            NotificationChannel bookingsChan = new NotificationChannel(
                "bookme_bookings",
                "New Bookings",
                NotificationManager.IMPORTANCE_HIGH
            );
            bookingsChan.setDescription("Notifications for newly received bookings");
            bookingsChan.enableLights(true);
            bookingsChan.setLightColor(navyColor);
            bookingsChan.enableVibration(true);
            manager.createNotificationChannel(bookingsChan);

            // 4. Booking Updates
            NotificationChannel bookingUpdatesChan = new NotificationChannel(
                "bookme_booking_updates",
                "Booking Updates",
                NotificationManager.IMPORTANCE_HIGH
            );
            bookingUpdatesChan.setDescription("Updates on booking confirmations and completion");
            bookingUpdatesChan.enableLights(true);
            bookingUpdatesChan.setLightColor(navyColor);
            bookingUpdatesChan.enableVibration(true);
            manager.createNotificationChannel(bookingUpdatesChan);

            // 5. Cancellations
            NotificationChannel cancellationsChan = new NotificationChannel(
                "bookme_cancellations",
                "Cancellations",
                NotificationManager.IMPORTANCE_HIGH
            );
            cancellationsChan.setDescription("Urgent alerts for cancelled bookings");
            cancellationsChan.enableLights(true);
            cancellationsChan.setLightColor(navyColor);
            cancellationsChan.enableVibration(true);
            manager.createNotificationChannel(cancellationsChan);

            // 6. Reschedules
            NotificationChannel reschedulesChan = new NotificationChannel(
                "bookme_reschedules",
                "Reschedules",
                NotificationManager.IMPORTANCE_HIGH
            );
            reschedulesChan.setDescription("Alerts for rescheduled appointment times");
            reschedulesChan.enableLights(true);
            reschedulesChan.setLightColor(navyColor);
            reschedulesChan.enableVibration(true);
            manager.createNotificationChannel(reschedulesChan);

            // 7. Reminders
            NotificationChannel remindersChan = new NotificationChannel(
                "bookme_reminders",
                "Reminders",
                NotificationManager.IMPORTANCE_HIGH
            );
            remindersChan.setDescription("Upcoming booking and appointment reminders");
            remindersChan.enableLights(true);
            remindersChan.setLightColor(navyColor);
            remindersChan.enableVibration(true);
            manager.createNotificationChannel(remindersChan);

            // 8. Promotions
            NotificationChannel promoChan = new NotificationChannel(
                "bookme_promotions",
                "Promotions & Offers",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            promoChan.setDescription("Promotional updates and special announcements");
            promoChan.enableLights(true);
            promoChan.setLightColor(navyColor);
            manager.createNotificationChannel(promoChan);

            // 9. System / Account
            NotificationChannel systemChan = new NotificationChannel(
                "bookme_system",
                "Account & System",
                NotificationManager.IMPORTANCE_HIGH
            );
            systemChan.setDescription("Critical account and verification updates");
            systemChan.enableLights(true);
            systemChan.setLightColor(navyColor);
            systemChan.enableVibration(true);
            manager.createNotificationChannel(systemChan);
        }
    }
}
