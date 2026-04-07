"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getSummary } from "@/services/analyticsApi";

/**
 * useDashboard
 * Fetches summary stats and manages the first-visit welcome guide using React Query.
 *
 * Returns:
 *   stats         — analytics summary data (or null while loading)
 *   loading       — query in progress
 *   mounted       — animation trigger
 *   showWelcome   — whether to show the welcome modal
 *   closeWelcome  — hides the modal and persists the preference
 */
export function useDashboard() {
  const router = useRouter();
  const [mounted, setMounted]         = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  // 1. Data Fetching via useQuery
  const { data: stats = null, isLoading: loading, error } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: getSummary,
    staleTime: 60 * 1000, // 1 minute stale time
    enabled: typeof window !== "undefined" && !!localStorage.getItem("token"),
  });

  useEffect(() => {
    const token = typeof window !== "undefined" && localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    setMounted(true);
    const hasSeen = localStorage.getItem("hasSeenWelcomeGuide");
    if (!hasSeen) setShowWelcome(true);
  }, [router]);

  const closeWelcome = () => {
    localStorage.setItem("hasSeenWelcomeGuide", "true");
    setShowWelcome(false);
  };

  return { stats, loading, mounted, showWelcome, closeWelcome, error };
}
