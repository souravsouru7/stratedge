"use client";

import { useState, useEffect } from "react";

/**
 * useClock
 * Returns a live-updating time string (HH:MM:SS, 24-hour format).
 */
export function useClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  return time;
}
