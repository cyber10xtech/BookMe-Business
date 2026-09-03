import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { registerPushNotifications, requestLocationPermission, isNative } from "@/services/native";

const DISMISSED_KEY = "bookme_permissions_dismissed_at";
const ALL_GRANTED_KEY = "bookme_permissions_all_granted";
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000; // 48 hours in ms

export const usePermissions = () => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [notifStatus, setNotifStatus] = useState<"idle" | "granted" | "denied">("idle");
  const [locationStatus, setLocationStatus] = useState<"idle" | "granted" | "denied">("idle");
  const [requesting, setRequesting] = useState(false);
  const doneRef = useRef(false);

  // Check current permission status synchronously and asynchronously
  const checkStatus = useCallback(async () => {
    let currentNotif: "idle" | "granted" | "denied" = "idle";
    let currentLocation: "idle" | "granted" | "denied" = "idle";

    if (isNative()) {
      try {
        const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");
        const pResult = await FirebaseMessaging.checkPermissions();
        if (pResult.receive === "granted") currentNotif = "granted";
        else if (pResult.receive === "denied") currentNotif = "denied";
      } catch (e) {
        console.warn("[usePermissions] Native notif status check failed:", e);
      }

      try {
        const { Geolocation } = await import("@capacitor/geolocation");
        const locResult = await Geolocation.checkPermissions();
        if (locResult.location === "granted" || locResult.coarseLocation === "granted") {
          currentLocation = "granted";
        } else if (locResult.location === "denied" && locResult.coarseLocation === "denied") {
          currentLocation = "denied";
        }
      } catch (e) {
        console.warn("[usePermissions] Native loc status check failed:", e);
      }
    } else {
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") currentNotif = "granted";
        else if (Notification.permission === "denied") currentNotif = "denied";
      }
    }

    setNotifStatus(currentNotif);
    setLocationStatus(currentLocation);

    return { currentNotif, currentLocation };
  }, []);

  useEffect(() => {
    if (!user || doneRef.current) return;

    // Check if user already granted all permissions permanently
    if (localStorage.getItem(ALL_GRANTED_KEY) === "true") {
      return;
    }

    // Check 2-day cooldown timer (48 hours)
    const dismissedAtStr = localStorage.getItem(DISMISSED_KEY);
    if (dismissedAtStr) {
      const dismissedAt = parseInt(dismissedAtStr, 10);
      if (!isNaN(dismissedAt) && Date.now() - dismissedAt < TWO_DAYS_MS) {
        // Less than 48h since last dismiss — skip popup
        return;
      }
    }

    let isMounted = true;
    checkStatus().then(({ currentNotif, currentLocation }) => {
      if (!isMounted) return;
      if (currentNotif === "granted" && currentLocation === "granted") {
        localStorage.setItem(ALL_GRANTED_KEY, "true");
        setShowModal(false);
      } else {
        // Delay 1s to let app interface finish mounting cleanly
        setTimeout(() => {
          if (isMounted && !doneRef.current) setShowModal(true);
        }, 1000);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [user, checkStatus]);

  const dismissModal = useCallback(() => {
    doneRef.current = true;
    setShowModal(false);
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
  }, []);

  const requestNotifications = async () => {
    if (!user) return;
    setRequesting(true);
    try {
      await registerPushNotifications(user.id);
      await checkStatus();
    } catch (e) {
      console.warn("[usePermissions] requestNotifications failed:", e);
      setNotifStatus("denied");
    } finally {
      setRequesting(false);
    }
  };

  const requestLocation = async () => {
    setRequesting(true);
    try {
      const granted = await requestLocationPermission();
      setLocationStatus(granted ? "granted" : "denied");
      await checkStatus();
    } catch (e) {
      console.warn("[usePermissions] requestLocation failed:", e);
      setLocationStatus("denied");
    } finally {
      setRequesting(false);
    }
  };

  const acceptAll = async () => {
    if (!user) return;
    setRequesting(true);
    try {
      await registerPushNotifications(user.id);
    } catch (e) {
      console.warn("[usePermissions] acceptAll push error:", e);
    }

    try {
      await requestLocationPermission();
    } catch (e) {
      console.warn("[usePermissions] acceptAll location error:", e);
    }

    try {
      const { currentNotif, currentLocation } = await checkStatus();
      if (currentNotif === "granted" && currentLocation === "granted") {
        localStorage.setItem(ALL_GRANTED_KEY, "true");
      }
    } finally {
      setRequesting(false);
      dismissModal();
    }
  };

  return {
    showModal,
    notifStatus,
    locationStatus,
    requesting,
    requestNotifications,
    requestLocation,
    acceptAll,
    dismissModal,
  };
};
