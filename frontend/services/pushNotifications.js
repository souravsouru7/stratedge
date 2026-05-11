"use client";

import { registerDeviceToken } from "@/services/notificationApi";
import { Capacitor } from "@capacitor/core";

let initialized = false;

function isNativeCapacitorRuntime() {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

function routeFromNotification(data = {}) {
  if (data.deepLink) {
    window.location.href = data.deepLink;
    return;
  }

  switch (data.screen) {
    case "trade":
      window.location.href = `/trades/view?id=${data.tradeId || ""}`;
      break;
    case "trade-edit":
      window.location.href = `/trades/edit?id=${data.tradeId || ""}`;
      break;
    case "indian-trade":
      window.location.href = `/indian-market/trades/view?id=${data.tradeId || ""}`;
      break;
    case "indian-trade-edit":
      window.location.href = `/indian-market/trades/edit?id=${data.tradeId || ""}`;
      break;
    case "indian-trades":
      window.location.href = "/indian-market/trades";
      break;
    case "trades":
      window.location.href = "/trades";
      break;
    case "weekly-report":
      window.location.href = `/weekly-reports?id=${data.reportId || ""}`;
      break;
    case "analytics":
      window.location.href = "/analytics";
      break;
    case "psychology":
      window.location.href = "/checklist/psychology";
      break;
    default:
      window.location.href = "/dashboard";
  }
}

export async function initializePushNotifications() {
  if (initialized || !isNativeCapacitorRuntime()) return;
  const authToken = window.localStorage.getItem("token");
  if (!authToken) return;

  initialized = true;
  const { PushNotifications } = await import("@capacitor/push-notifications");

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") {
    initialized = false;
    return;
  }

  try {
    await PushNotifications.createChannel({
      id: "edgecipline",
      name: "Edgecipline",
      description: "Trading discipline, psychology, and admin notifications",
      importance: 5,
      visibility: 1,
      sound: "default",
      lights: true,
      vibration: true,
    });
  } catch (error) {
    console.warn("Notification channel setup skipped", error);
  }

  PushNotifications.addListener("registration", async ({ value }) => {
    try {
      await registerDeviceToken({
        token: value,
        platform: "android",
        appVersion: "1.0",
      });
    } catch (error) {
      console.error("Failed to register push token", error);
    }
  });

  PushNotifications.addListener("registrationError", (error) => {
    console.error("Push registration failed", error);
  });

  PushNotifications.addListener("pushNotificationReceived", (notification) => {
    window.dispatchEvent(new CustomEvent("stratedge:push-notification", { detail: notification }));
  });

  PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
    routeFromNotification(notification?.data || {});
  });

  await PushNotifications.register();
}
