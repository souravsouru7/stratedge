"use client";

import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import apiClient from "./apiClient";

export async function registerPushNotifications() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Create the notification channel before registering — Android 8+ silently
    // drops notifications to channels that don't exist.
    if (Capacitor.getPlatform() === "android") {
      await PushNotifications.createChannel({
        id: "stratedge_alerts",
        name: "Trading Alerts",
        description: "Daily P&L summaries and streak reminders",
        importance: 5,
        visibility: 1,
        sound: "default",
        vibration: true,
        lights: true,
      });
    }

    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== "granted") return;

    // Attach listeners BEFORE calling register() to avoid missing the
    // registration event that fires immediately after register() resolves.
    PushNotifications.addListener("registration", async (token) => {
      try {
        await apiClient.post("/api/profile/fcm-token", { token: token.value });
      } catch {
        // Non-critical — token will be retried next app open
      }
    });

    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.info("[Push] Received in foreground:", notification.title);
    });

    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const type = action.notification?.data?.type;
      if (type === "daily_pnl" || type === "streak_reminder") {
        window.location.href = "/dashboard";
      }
    });

    await PushNotifications.register();
  } catch (err) {
    console.warn("[Push] Registration failed:", err?.message || err);
  }
}

/**
 * Remove the FCM token from the backend on logout.
 * Call this after clearing the auth token.
 */
export async function deregisterPushNotifications() {
  if (typeof window === "undefined" || !window.Capacitor) return;

  try {
    const token = await PushNotifications.checkPermissions().then(() =>
      // We stored the token on registration; safest is to re-register and capture it
      new Promise((resolve) => {
        const listener = PushNotifications.addListener("registration", (t) => {
          listener.remove();
          resolve(t.value);
        });
        PushNotifications.register().catch(() => resolve(null));
      })
    );

    if (token) {
      await apiClient.delete("/api/profile/fcm-token", { data: { token } });
    }
  } catch {
    // Best-effort — stale tokens are cleaned up automatically on send failure
  }
}
