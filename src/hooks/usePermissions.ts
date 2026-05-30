import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { registerPushNotifications, requestLocationPermission } from "@/services/native";

const PERMISSIONS_KEY = "bookme_permissions_v2";

export const usePermissions = () => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [notifStatus, setNotifStatus] = useState<"idle" | "granted" | "denied">("idle");
  const [locationStatus, setLocationStatus] = useState<"idle" | "granted" | "denied">("idle");
  const [requesting, setRequesting] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (!user || done.current) return;
    if (localStorage.getItem(PERMISSIONS_KEY)) return;
    // Show modal after 1s so app renders first
    const t = setTimeout(() => setShowModal(true), 1000);
    return () => clearTimeout(t);
  }, [user]);

  // Sync current browser permission state on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("Notification" in window) {
      if (Notification.permission === "granted") setNotifStatus("granted");
      else if (Notification.permission === "denied") setNotifStatus("denied");
    }
  }, []);

  const requestNotifications = async () => {
    if (!user) return;
    setRequesting(true);
    try {
      await registerPushNotifications(user.id);
      const perm = "Notification" in window ? Notification.permission : "denied";
      setNotifStatus(perm === "granted" ? "granted" : "denied");
    } catch {
      setNotifStatus("denied");
    }
    setRequesting(false);
  };

  const requestLocation = async () => {
    setRequesting(true);
    try {
      const granted = await requestLocationPermission();
      setLocationStatus(granted ? "granted" : "denied");
    } catch {
      setLocationStatus("denied");
    }
    setRequesting(false);
  };

  const dismissModal = () => {
    done.current = true;
    setShowModal(false);
    localStorage.setItem(PERMISSIONS_KEY, "true");
  };

  const acceptAll = async () => {
    if (!user) return;
    setRequesting(true);
    await registerPushNotifications(user.id);
    await requestLocationPermission();
    const perm = "Notification" in window ? Notification.permission : "denied";
    setNotifStatus(perm === "granted" ? "granted" : "denied");
    setLocationStatus("granted");
    setRequesting(false);
    dismissModal();
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
