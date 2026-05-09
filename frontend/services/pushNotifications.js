"use client";

import { PushNotifications } from "@capacitor/push-notifications";
import apiClient from "./apiClient";

async function dbg(step, value) {
  console.info(`[Push] ${step}:`, value);
  try {
    // Send to backend debug endpoint so we can see mobile steps in server logs
    await apiClient.post("/api/push-debug", { step, value });
  } catch {
    // Ignore errors for debug logs
  }
}

export async function registerPushNotifications() {
  await dbg("fn_called", { hasCapacitor: typeof window !== "undefined" && !!window.Capacitor });

  if (typeof window === "undefined" || !window.Capacitor) return;

  await dbg("passed_check", { platform: window.Capacitor.getPlatform?.() });

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
      await dbg("channel_ok", {});
    } catch (err) {
      await dbg("channel_err", { error: err?.message });
    }
  }

  try {
    const permResult = await PushNotifications.requestPermissions();
    await dbg("perm", { receive: permResult.receive });

    if (permResult.receive !== "granted") return;

    PushNotifications.addListener("registration", async (token) => {
      await dbg("token", { preview: token.value?.slice(0, 20) });
      try {
        await apiClient.post("/api/profile/fcm-token", { token: token.value });
        await dbg("saved", {});
      } catch (err) {
        await dbg("save_err", { error: err?.message });
      }
    });

    PushNotifications.addListener("registrationError", async (err) => {
      await dbg("reg_err", { error: JSON.stringify(err) });
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

    await dbg("registering", {});
    await PushNotifications.register();
    await dbg("registered", {});
  } catch (err) {
    await dbg("fatal", { error: err?.message });
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
