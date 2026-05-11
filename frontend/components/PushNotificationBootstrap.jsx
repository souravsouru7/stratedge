"use client";

import { useEffect } from "react";
import { initializePushNotifications } from "@/services/pushNotifications";

export default function PushNotificationBootstrap() {
  useEffect(() => {
    initializePushNotifications().catch((error) => {
      console.error("Push notification initialization failed", error);
    });
  }, []);

  return null;
}
