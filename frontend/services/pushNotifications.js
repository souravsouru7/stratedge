"use client";

import { PushNotifications } from "@capacitor/push-notifications";
import apiClient from "./apiClient";

/**
 * Register for push notifications on Android (Capacitor only).
 * Requests permission, gets the FCM token, and sends it to the backend.
 * Safe to call on web — exits early when not running in Capacitor.
 */
export async function registerPushNotifications() {
  if (typeof window === "undefined" || !window.Capacitor) return;

  try {
    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== "granted") return;

    await PushNotifications.register();

    PushNotifications.addListener("registration", async (token) => {
      try {
        await apiClient.post("/api/profile/fcm-token", { token: token.value });
      } catch {
        // Non-critical — token will be retried next app open
      }
    });

    // Foreground notification display
    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      // Capacitor shows a system notification automatically when the app is in background.
      // When foregrounded, we can optionally handle it here (e.g. show an in-app toast).
      console.info("[Push] Received in foreground:", notification.title);
    });

    // Tap on notification — navigate to relevant screen
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const type = action.notification?.data?.type;
      if (type === "daily_pnl" || type === "streak_reminder") {
        // Navigate to journal dashboard — use replaceState so Next.js picks it up
        if (typeof window !== "undefined") {
          window.location.href = "/dashboard";
        }
      }
    });
  } catch (err) {
    // Never crash the app over push setup failure
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
