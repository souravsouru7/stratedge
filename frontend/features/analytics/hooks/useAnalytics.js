"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueries } from "@tanstack/react-query";
import {
  getSummary,
  getRiskRewardAnalysis,
  getTradeDistribution,
  getPerformanceMetrics,
  getTimeAnalysis,
  getTradeQuality,
  getDrawdownAnalysis,
  getAIInsights,
  getPsychologyAnalytics,
} from "@/services/analyticsApi";

/**
 * useAnalytics
 * Refactored to use TanStack Query parallel fetching (useQueries).
 * Manages calendar month navigation and analytics data caching.
 *
 * Returns:
 *   loading           — true while any request is in flight
 *   data              — { summary, riskReward, distribution, performance, timeAnalysis, quality, drawdown, aiInsights, psychology }
 *   calendarMonth     — current Date for the P&L calendar
 *   prevMonth / nextMonth — navigation handlers
 */
export function useAnalytics() {
  const router = useRouter();
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // SEQUENTIAL: Core analytics first (immediate KPIs)
  const coreResults = useQueries({
    queries: [
      { queryKey: ["analytics", "summary"],      queryFn: getSummary,           staleTime: 5 * 60 * 1000 },
      { queryKey: ["analytics", "performance"],  queryFn: getPerformanceMetrics, staleTime: 5 * 60 * 1000 },
      { queryKey: ["analytics", "distribution"], queryFn: getTradeDistribution,  staleTime: 5 * 60 * 1000 },
    ],
  });

  const coreData = {
    summary: coreResults[0].data,
    performance: coreResults[1].data,
    distribution: coreResults[2].data,
  };
  
  const coreLoading = coreResults.some(r => r.isLoading);
  const coreError = coreResults.find(r => r.error)?.error;
  const hasCoreData = coreResults.every(r => r.data);

  // DEEP: Optional analytics (progressive loading, rate-limit safe)
  const deepResults = useQueries({
    queries: hasCoreData ? [  // Only if core succeeded
      { queryKey: ["analytics", "riskReward"],   queryFn: getRiskRewardAnalysis, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false },
      { queryKey: ["analytics", "timeAnalysis"], queryFn: getTimeAnalysis,       staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false },
      { queryKey: ["analytics", "drawdown"],     queryFn: getDrawdownAnalysis,   staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false },
      { queryKey: ["analytics", "aiInsights"],   queryFn: getAIInsights,         staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false },
      { queryKey: ["analytics", "psychology"],   queryFn: async () => {
          try { return await getPsychologyAnalytics(); } catch (e) { return null; }
        }, 
        staleTime: 5 * 60 * 1000 
      },
    ] : []
  });

  const deepLoading = deepResults.some(r => r.isLoading);
  const deepError = deepResults.find(r => r.error)?.error;
  const error = coreError || deepError || null;
  const loading = coreLoading || deepLoading;

  useEffect(() => {
    const token = typeof window !== "undefined" && localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
  }, [router]);

  // Auto-navigate calendar to the most recent month with trades
  useEffect(() => {
    const dateKeys = Object.keys(data.timeAnalysis?.byDate || {});
    if (dateKeys.length === 0) return;
    const latestKey = [...dateKeys].sort().slice(-1)[0];
    const [year, month] = latestKey.split("-").map(Number);
    if (year && month) setCalendarMonth(new Date(year, month - 1, 1));
  }, [data.timeAnalysis]);

  const shiftMonth = (amount) =>
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + amount, 1));

  return {
    loading,
    data,
    calendarMonth,
    prevMonth: () => shiftMonth(-1),
    nextMonth: () => shiftMonth(+1),
    coreLoading,
    deepLoading,
    error,
    hasCoreData,
    retryAfterSeconds: error?.retryAfterSeconds || 0
  };
}
