"use client";

import { PushNotifications } from "@capacitor/push-notifications";
import apiClient from "./apiClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.stratedge.live";

async function dbg(step, value) {
  try {
    await fetch(`${API_BASE}/api/push-debug`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step, value }),
    });
  } catch { /* ignore */ }
}

export async function registerPushNotifications() {
  await dbg("fn_called", { hasWindow: typeof window !== "undefined", hasCapacitor: typeof window !== "undefined" && !!window.Capacitor });

  if (typeof window === "undefined" || !window.Capacitor) return;

  await dbg("passed_capacitor_check", { platform: window.Capacitor.getPlatform?.() });

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
      await dbg("channel_created", {});
    } catch (err) {
      await dbg("channel_error", { error: err?.message });
    }
  }

  try {
    const permResult = await PushNotifications.requestPermissions();
    await dbg("permission_result", { receive: permResult.receive });

    if (permResult.receive !== "granted") return;

    PushNotifications.addListener("registration", async (token) => {
      await dbg("token_received", { tokenPreview: token.value?.slice(0, 20) });
      try {
        await apiClient.post("/api/profile/fcm-token", { token: token.value });
        await dbg("token_saved", {});
      } catch (err) {
        await dbg("token_save_error", { error: err?.message });
      }
    });

    PushNotifications.addListener("registrationError", async (err) => {
      await dbg("registration_error", { error: JSON.stringify(err) });
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

    await dbg("calling_register", {});
    await PushNotifications.register();
    await dbg("register_called", {});
  } catch (err) {
    await dbg("fatal_error", { error: err?.message });
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
