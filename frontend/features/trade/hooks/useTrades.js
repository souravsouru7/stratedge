"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTrades, deleteTrade } from "@/services/tradeApi";

/**
 * useTrades
 * Encapsulates all state and logic for the Trade Journal list page using TanStack Query.
 */
export function useTrades() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filter, setFilter]             = useState("ALL");
  const [search, setSearch]             = useState("");
  const [mounted, setMounted]           = useState(false);

  // 1. Data Fetching via useQuery
  const { data: trades = [], isLoading: loading, error } = useQuery({
    queryKey: ["trades"],
    queryFn: async () => {
      const data = await getTrades();
      return Array.isArray(data) ? data : [];
    },
    // Only fetch if authenticated (simple check)
    enabled: typeof window !== "undefined" && !!localStorage.getItem("token"),
  });

  // 2. Data Deletion via useMutation
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteTrade(id),
    onSuccess: () => {
      // Automatically refresh the trades list
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      setDeleteTarget(null);
    },
    onError: (err) => {
      console.error("useTrades: delete failed", err);
      setDeleteTarget(null);
    },
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    setMounted(true);
  }, [router]);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget._id);
  };

  const cancelDelete = () => setDeleteTarget(null);

  // Client-side filtering logic (preserved from original)
  const filtered = trades.filter((t) => {
    const matchFilter = filter === "ALL" || t.type?.toUpperCase() === filter;
    const matchSearch = t.pair?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  // Summary stats (computed from trades)
  const totalPnl   = trades.reduce((s, t) => s + (parseFloat(t.profit) || 0), 0);
  const winners    = trades.filter((t) => parseFloat(t.profit) >= 0).length;
  const winRate    = trades.length ? ((winners / trades.length) * 100).toFixed(1) : "0.0";
  const totalBull  = totalPnl >= 0;

  const summaryStats = [
    { label: "TOTAL TRADES", val: trades.length,                                               bull: true       },
    { label: "WIN RATE",      val: `${winRate}%`,                                              bull: parseFloat(winRate) >= 50 },
    { label: "TOTAL P&L",     val: `${totalBull ? "+" : ""}$${Math.abs(totalPnl).toFixed(2)}`, bull: totalBull  },
  ];

  return {
    trades,
    filtered,
    loading: loading || deleteMutation.isPending,
    deleteTarget,
    filter,
    search,
    summaryStats,
    mounted,
    error,
    handlers: { setFilter, setSearch, setDeleteTarget, confirmDelete, cancelDelete },
  };
}
