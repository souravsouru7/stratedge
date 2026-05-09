"use client";

import { PushNotifications } from "@capacitor/push-notifications";
import apiClient from "./apiClient";

function dbg(step, value) {
  if (typeof window !== "undefined") {
    window.alert(`[Push] ${step}: ${JSON.stringify(value)}`);
  }
}

export async function registerPushNotifications() {
  dbg("fn_called", { hasCapacitor: typeof window !== "undefined" && !!window.Capacitor });

  if (typeof window === "undefined" || !window.Capacitor) return;

  dbg("passed_check", { platform: window.Capacitor.getPlatform?.() });

  if (window.Capacitor.getPlatform?.() === "android") {
    try {
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
      dbg("channel_ok", {});
    } catch (err) {
      dbg("channel_err", { error: err?.message });
    }
  }

  try {
    const permResult = await PushNotifications.requestPermissions();
    dbg("perm", { receive: permResult.receive });

    if (permResult.receive !== "granted") return;

    PushNotifications.addListener("registration", async (token) => {
      dbg("token", { preview: token.value?.slice(0, 20) });
      try {
        await apiClient.post("/api/profile/fcm-token", { token: token.value });
        dbg("saved", {});
      } catch (err) {
        dbg("save_err", { error: err?.message });
      }
    });

    PushNotifications.addListener("registrationError", (err) => {
      dbg("reg_err", { error: JSON.stringify(err) });
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

    dbg("registering", {});
    await PushNotifications.register();
    dbg("registered", {});
  } catch (err) {
    dbg("fatal", { error: err?.message });
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
