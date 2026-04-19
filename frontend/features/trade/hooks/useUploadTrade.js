"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMarket, MARKETS } from "@/context/MarketContext";
import { uploadTradeImage } from "@/services/uploadApi";
import { createTrade, getTradeStatus, updateTrade } from "@/services/tradeApi";
import { useSetups } from "./useSetups";
import { useToast } from "@/features/shared/components/ui/Toast";

const DEFAULT_SETUP_RULES = [];
const getTodayInputValue = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split("T")[0];
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function buildIndianTradeTemplate(imageUrl, t = {}) {
  const sym = (t.symbol || "").toUpperCase();
  const strike = t.strike ? String(t.strike) : "";
  const ot = (t.optionType || "CE").toUpperCase();
  const pairBuilt = sym && strike ? `${sym} ${strike} ${ot}` : sym;
  return {
    pair: pairBuilt || t.pair || "",
    action: "buy",
    quantity: t.quantity != null ? String(t.quantity) : "",
    profit: t.pnl != null ? String(t.pnl) : (t.profit != null ? String(t.profit) : ""),
    entryPrice: t.entryPrice != null ? String(t.entryPrice) : "",
    exitPrice: t.exitPrice != null ? String(t.exitPrice) : "",
    optionType: ot,
    screenshot: imageUrl,
    segment: "F&O",
    instrumentType: "OPTION",
    strikePrice: strike,
    tradeType: "INTRADAY",
    strategy: "", strategyCustom: "",
    tradeDate: getTodayInputValue(),
    expiryDate: t.expiryDate || "",
    riskRewardRatio: "", riskRewardCustom: "",
    entryBasis: "Plan", entryBasisCustom: "",
    notes: "", setup: "", mistakeTag: "", lesson: "",
    brokerage: "", sttTaxes: "",
    mood: null, confidence: "", emotionalTags: [], wouldRetake: "",
    setupRules: [],
  };
}

// Detect trading session from current upload time (UTC hour)
function detectSessionFromNow() {
  const utcHour = new Date().getUTCHours();
  if (utcHour >= 22 || utcHour < 8)  return "Asia";
  if (utcHour >= 8  && utcHour < 12) return "London";
  if (utcHour >= 12 && utcHour < 17) return "London-NY Overlap";
  return "New York";
}

function buildForexTradeTemplate(imageUrl, t = {}) {
  return {
    pair: t.pair || t.symbol || "",
    action: (t.action || t.type || "buy").toString().toLowerCase(),
    lotSize: t.lotSize != null ? String(t.lotSize) : "",
    entryPrice: t.entryPrice != null ? String(t.entryPrice) : "",
    exitPrice: t.exitPrice != null ? String(t.exitPrice) : "",
    stopLoss: t.stopLoss != null ? String(t.stopLoss) : "",
    takeProfit: t.takeProfit != null ? String(t.takeProfit) : "",
    profit: t.profit != null ? String(t.profit) : (t.pnl != null ? String(t.pnl) : ""),
    commission: t.commission != null ? String(t.commission) : "",
    swap: t.swap != null ? String(t.swap) : "",
    balance: t.balance != null ? String(t.balance) : "",
    session: t.session || detectSessionFromNow(),
    strategy: "", strategyCustom: "",
    tradeDate: getTodayInputValue(),
    notes: "", screenshot: imageUrl,
    segment: t.segment || "Equity",
    instrumentType: t.instrumentType || "EQUITY",
    quantity: t.quantity != null ? String(t.quantity) : "",
    strikePrice: t.strikePrice != null ? String(t.strikePrice) : "",
    expiryDate: t.expiryDate || "",
    brokerage: "", sttTaxes: "",
    entryBasis: "Plan", entryBasisCustom: "",
    mood: null, confidence: "", emotionalTags: [], wouldRetake: "",
    setupRules: [],
  };
}

function buildTradePayload(trade, isInd, setupRules) {
  const activeRules = setupRules.filter(r => r.label && r.label.trim().length > 0);
  const followedCount = activeRules.filter(r => r.followed).length;
  const setupScore = activeRules.length > 0 ? Math.round((followedCount / activeRules.length) * 100) : null;

  const base = {
    pair: trade.pair,
    type: trade.action.toUpperCase(),
    entryPrice: trade.entryPrice ? parseFloat(trade.entryPrice) : undefined,
    exitPrice: trade.exitPrice ? parseFloat(trade.exitPrice) : undefined,
    profit: trade.profit ? parseFloat(trade.profit) : undefined,
    strategy: trade.strategy === "Custom" ? (trade.strategyCustom?.trim() || "Custom") : (trade.strategy || undefined),
    tradeDate: trade.tradeDate,
    entryBasis: trade.entryBasis || "Plan",
    entryBasisCustom: trade.entryBasis === "Custom" ? trade.entryBasisCustom : undefined,
    notes: trade.notes || undefined,
    screenshot: trade.screenshot || undefined,
    mood: trade.mood ?? undefined,
    confidence: trade.confidence || undefined,
    emotionalTags: Array.isArray(trade.emotionalTags) ? trade.emotionalTags : undefined,
    wouldRetake: trade.wouldRetake || undefined,
    riskRewardRatio: trade.riskRewardRatio || undefined,
    riskRewardCustom: trade.riskRewardCustom || undefined,
    setupRules: activeRules.map(({ label, followed }) => ({ label: String(label).trim(), followed })),
    setupScore,
  };

  if (isInd) {
    Object.assign(base, {
      optionType: (trade.optionType || "CE").toUpperCase(),
      quantity: trade.quantity ? parseFloat(trade.quantity) : undefined,
      strikePrice: trade.strikePrice ? parseFloat(trade.strikePrice) : undefined,
      underlying: trade.pair ? trade.pair.replace(/\s+\d+\s*(CE|PE)$/i, "").trim() : undefined,
      tradeType: trade.tradeType || undefined,
      expiryDate: trade.expiryDate || undefined,
      setup: trade.setup || undefined,
      mistakeTag: trade.mistakeTag || undefined,
      lesson: trade.lesson || undefined,
      brokerage: trade.brokerage ? parseFloat(trade.brokerage) : undefined,
      sttTaxes: trade.sttTaxes ? parseFloat(trade.sttTaxes) : undefined,
    });
  } else {
    Object.assign(base, {
      stopLoss: trade.stopLoss ? parseFloat(trade.stopLoss) : undefined,
      takeProfit: trade.takeProfit ? parseFloat(trade.takeProfit) : undefined,
      balance: trade.balance ? parseFloat(trade.balance) : undefined,
      session: trade.session || undefined,
      lotSize: trade.lotSize ? parseFloat(trade.lotSize) : undefined,
      commission: trade.commission ? parseFloat(trade.commission) : undefined,
      swap: trade.swap ? parseFloat(trade.swap) : undefined,
    });
  }

  return base;
}

function getFriendlyUploadError(err) {
  const status = err?.status;
  const message = String(err?.message || "").trim();
  const detail = String(err?.data?.detail || "").trim();

  if (status === 403 && /subscription required/i.test(message)) {
    return detail || "You have used your free upload. Please subscribe to continue uploading trade screenshots.";
  }

  return message || "Upload failed. Please try again.";
}

// ─── hook ─────────────────────────────────────────────────────────────────────

/**
 * useUploadTrade
 * Refactored to use TanStack Query for orchestration and useToast for feedback.
 */
export function useUploadTrade() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const pathname      = usePathname();
  const queryClient   = useQueryClient();
  const { currentMarket } = useMarket();
  const { addToast, removeToast } = useToast();

  // 1. Determine local context
  const marketType = pathname?.startsWith("/indian-market")
    ? MARKETS.INDIAN_MARKET
    : (searchParams.get("market") || searchParams.get("marketType") || currentMarket);
  const isInd = marketType === MARKETS.INDIAN_MARKET;

  // 2. Local UI/Form state
  const [mounted, setMounted]                 = useState(false);
  const [file, setFile]                       = useState(null);
  const [error, setError]                     = useState(null);
  const [jobId, setJobId]                     = useState("");
  const [uploadedTradeId, setUploadedTradeId] = useState(null); // original ghost trade ID from upload
  const [broker, setBroker]                   = useState("AUTO");
  const [trade, setTrade]                     = useState(null);
  const [trades, setTrades]                   = useState([]);
  const [savedTrades, setSavedTrades]         = useState([]);
  const [saved, setSaved]                     = useState(false);
  const [showCustomRR, setShowCustomRR]       = useState(false);
  const [setupRules, setSetupRules]           = useState(DEFAULT_SETUP_RULES);
  const [extractedText, setExtractedText]     = useState("");
  const [activeToastId, setActiveToastId]     = useState(null);

  // 3. Authenticity check
  useEffect(() => {
    const token = typeof window !== "undefined" && localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    setMounted(true);
  }, [router]);

  // 4. Setups Query
  const { strategies, setupsLoading } = useSetups(marketType);

  // 5. Initial Image Upload Mutation
  const uploadJobMutation = useMutation({
    mutationFn: (fileObj) => uploadTradeImage({ file: fileObj, marketType, broker: isInd ? broker : "" }),
    onSuccess: (res) => {
      const tradeId = String(res.jobId || "");
      setJobId(tradeId);
      setUploadedTradeId(tradeId);
      setError(null);
      const tid = addToast(
        `Correct ${isInd ? "Indian" : "Forex"} image uploaded. AI processing started...`,
        "loading",
        Infinity
      );
      setActiveToastId(tid);
    },
    onError: (err) => {
      const friendlyMessage = getFriendlyUploadError(err);
      setError(friendlyMessage);
      addToast(friendlyMessage, "error");
    }
  });

  // ─ apply default setup (first saved strategy) ─
  const applyDefaultSetup = (tradeObj, savedStrategies) => {
    if (!savedStrategies?.length) return tradeObj;
    const first = savedStrategies[0];
    const rules = first.rules?.length
      ? first.rules.map((r, i) => ({ id: r.id ?? i + 1, label: r.label, followed: false }))
      : [];
    return { ...tradeObj, strategy: first.name, setupRules: rules };
  };

  // ─ apply parsed data helper ─
  const applyProcessedTradeData = (payload) => {
    const p = payload?.parsedData?.parsedTrade || payload?.parsedTrade || {};
    const parsedTradesPayload = payload?.parsedData?.parsedTrades || payload?.parsedTrades || [];
    const imageUrl = payload?.imageUrl || payload?.screenshot || "";
    setExtractedText(payload?.extractedText || "");

    if (isInd) {
      const multiTrades = parsedTradesPayload || [];
      if (multiTrades.length > 0) {
        const tradeArr = multiTrades.map(t => applyDefaultSetup(buildIndianTradeTemplate(imageUrl, t), strategies));
        setTrades(tradeArr);
        setSavedTrades(new Array(tradeArr.length).fill(false));
        setTrade(tradeArr[0]);
        // Load default setup rules into checklist
        if (strategies?.[0]?.rules?.length) {
          setSetupRules(strategies[0].rules.map((r, i) => ({ id: r.id ?? i + 1, label: r.label, followed: false })));
        }
      } else {
        const pairStr = (p.pair || "").trim().toUpperCase();
        const ot = pairStr.endsWith(" PE") ? "PE" : pairStr.endsWith(" CE") ? "CE" : (p.optionType || "CE");
        const base = { ...buildIndianTradeTemplate(imageUrl, p), optionType: ot.toUpperCase() };
        setTrade(applyDefaultSetup(base, strategies));
        setTrades([]);
        if (strategies?.[0]?.rules?.length) {
          setSetupRules(strategies[0].rules.map((r, i) => ({ id: r.id ?? i + 1, label: r.label, followed: false })));
        }
      }
    } else {
      const multiTrades = parsedTradesPayload || [];
      if (multiTrades.length > 1) {
        const tradeArr = multiTrades.map(t => applyDefaultSetup(buildForexTradeTemplate(imageUrl, t), strategies));
        setTrades(tradeArr);
        setSavedTrades(new Array(tradeArr.length).fill(false));
        setTrade(tradeArr[0]);
        if (strategies?.[0]?.rules?.length) {
          setSetupRules(strategies[0].rules.map((r, i) => ({ id: r.id ?? i + 1, label: r.label, followed: false })));
        }
      } else {
        setTrades([]);
        setSavedTrades([]);
        const base = buildForexTradeTemplate(imageUrl, p);
        setTrade(applyDefaultSetup(base, strategies));
        if (strategies?.[0]?.rules?.length) {
          setSetupRules(strategies[0].rules.map((r, i) => ({ id: r.id ?? i + 1, label: r.label, followed: false })));
        }
      }
    }
  };

  // 6. Polling Query for status
  const jobStatusQuery = useQuery({
    queryKey: ["uploadStatus", jobId],
    queryFn: () => getTradeStatus(jobId),
    enabled: !!jobId,
    retry: false, // don't retry failed status polls — stop immediately on error
    refetchInterval: (query) => {
      // Stop polling on completed, failed, or any error (404 = trade not found)
      if (query.state.error) return false;
      const status = query.state.data?.status;
      if (status === "completed" || status === "failed") return false;
      return 4000;
    },
  });

  // Effect to process data when polling finishes
  useEffect(() => {
    if (jobStatusQuery.data?.status === "completed" && jobStatusQuery.data?.data) {
      applyProcessedTradeData(jobStatusQuery.data.data);
      setJobId("");
      if (activeToastId) {
        removeToast(activeToastId);
        setActiveToastId(null);
      }
      addToast("Trade details extracted successfully!", "success");
    } else if (jobStatusQuery.data?.status === "failed") {
      const rawError = jobStatusQuery.data.error || "Processing failed.";
      const isNotTradeImage =
        rawError.toLowerCase().includes("not appear to be a trade") ||
        rawError.toLowerCase().includes("could not extract any trade") ||
        rawError.toLowerCase().includes("not a trade");

      const userMessage = isNotTradeImage
        ? "This doesn't look like a trade screenshot. Please upload a screenshot directly from your broker platform (MT5, Zerodha Kite, etc.) showing the trade details."
        : rawError;

      setError(userMessage);
      setJobId("");
      // Clear the file so the upload zone resets and the user can pick a new one
      if (isNotTradeImage) setFile(null);
      if (activeToastId) {
        removeToast(activeToastId);
        setActiveToastId(null);
      }
      addToast(isNotTradeImage ? "Not a valid trade screenshot — please upload from your broker app" : rawError, "error");
    }
  }, [jobStatusQuery.data]);

  // Stop polling and surface error when status request itself fails (e.g. 404)
  useEffect(() => {
    if (jobStatusQuery.error) {
      const msg = jobStatusQuery.error?.message || "Failed to check processing status.";
      setError(msg);
      setJobId("");
      if (activeToastId) {
        removeToast(activeToastId);
        setActiveToastId(null);
      }
      addToast(msg, "error");
    }
  }, [jobStatusQuery.error]);

  const loading = uploadJobMutation.isPending || (!!jobId && jobStatusQuery.isLoading) || jobStatusQuery.isFetching;
  const processingStatus = uploadJobMutation.isPending ? "uploading" : jobStatusQuery.data?.status || (!!jobId ? "processing" : "");

  // 7. Save Mutation
  const saveTradeMutation = useMutation({
    mutationFn: async ({ idx = null, forceCreate = false }) => {
      const t = idx !== null ? trades[idx] : trade;
      const rules = idx !== null ? (t.setupRules || []) : setupRules;
      const tradeData = buildTradePayload(t, isInd, rules);

      const isMultiTrade = trades.length > 0;

      if (!forceCreate && !isMultiTrade && idx === null && uploadedTradeId) {
        // Single-trade: update the ghost trade in-place (backend kept it)
        return updateTrade(uploadedTradeId, tradeData, marketType);
      }

      // Multi-trade: backend already deleted the ghost — just create fresh trades
      return createTrade(tradeData, marketType);
    },
    onSuccess: (res, variables) => {
      const { idx } = variables;
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });

      addToast("Trade saved to your journal!", "success");

      if (idx !== null) {
        setSavedTrades(prev => {
          const updated = [...prev];
          updated[idx] = true;
          if (updated.every(Boolean)) {
             setTimeout(() => router.push(isInd ? "/indian-market/trades" : "/trades"), 1200);
          }
          return updated;
        });
      } else {
        setSaved(true);
        setTimeout(() => router.push(isInd ? "/indian-market/trades" : "/trades"), 1200);
      }
    },
    onError: (err) => {
      addToast(err.message || "Failed to save trade", "error");
    }
  });

  // 8. Actions
  const handleUpload = () => {
    if (!file) return setError("Select file");
    if (isInd && broker === "AUTO") return setError("Select broker");
    uploadJobMutation.mutate(file);
  };

  const handleChange = (e) => setTrade(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleStrategyChange = (e) => {
    const value = e.target.value;
    setTrade(p => ({ ...p, strategy: value }));
    const select = strategies.find(s => s.name === value);
    setSetupRules(select?.rules?.length ? select.rules.map((r, i) => ({ id: r.id ?? i + 1, label: r.label, followed: false })) : []);
  };

  const handleTradeChange = (idx, e) => {
    setTrades(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [e.target.name]: e.target.value };
      return copy;
    });
  };

  const handleMultiTradeStrategyChange = (idx, e) => {
    const value = e.target.value;
    const select = strategies.find(s => s.name === value);
    const rules = select?.rules?.length ? select.rules.map((r, i) => ({ id: r.id ?? i + 1, label: r.label, followed: false })) : [];
    setTrades(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], strategy: value, setupRules: rules };
      return copy;
    });
  };

  const tradeCount = trades.length > 1 ? trades.length : trade ? 1 : 0;

  const canSaveTrade = (tradeToSave) => {
    if (!tradeToSave?.tradeDate) {
      addToast("Trade date is required before saving", "info");
      return false;
    }
    return true;
  };

  return {
    file, setFile, trade, setTrade, trades, savedTrades, loading, error, setError,
    extractedText, strategies, setupsLoading, jobId, processingStatus, mounted, saved,
    showCustomRR, setShowCustomRR, broker, setBroker, setupRules, isInd, marketType,
    tradeCount,
    savingAll: saveTradeMutation.isPending,
    handleUpload,
    handleChange,
    handleStrategyChange,
    handleTradeChange,
    handleMultiTradeStrategyChange,
    saveTrade: () => {
      if (!canSaveTrade(trade)) return;
      saveTradeMutation.mutate({ idx: null });
    },
    saveIndianTrade: (idx) => {
      if (!canSaveTrade(trades[idx])) return;
      saveTradeMutation.mutate({ idx });
    },
    saveAllTrades: async () => {
      for (let i = 0; i < trades.length; i++) {
        if (!savedTrades[i] && canSaveTrade(trades[i])) {
          await saveTradeMutation.mutateAsync({ idx: i });
        }
      }
    },
    toggleSetupRule: id => setSetupRules(p => p.map(r => r.id === id ? { ...r, followed: !r.followed } : r)),
    updateSetupRuleLabel: (id, val) => setSetupRules(p => p.map(r => r.id === id ? { ...r, label: val } : r)),
    addSetupRule: () => setSetupRules(p => [...p, { id: Date.now(), label: "", followed: false }]),
    clearSetupRules: () => setSetupRules(p => p.map(r => ({ ...r, followed: false }))),
    toggleSetupRuleMulti: (tIdx, rId) => setTrades(p => p.map((t, i) => i !== tIdx ? t : { ...t, setupRules: t.setupRules.map(r => r.id === rId ? { ...r, followed: !r.followed } : r) })),
    updateSetupRuleLabelMulti: (tIdx, rId, v) => setTrades(p => p.map((t, i) => i !== tIdx ? t : { ...t, setupRules: t.setupRules.map(r => r.id === rId ? { ...r, label: v } : r) })),
    addSetupRuleMulti: (tIdx) => setTrades(p => p.map((t, i) => i !== tIdx ? t : { ...t, setupRules: [...(t.setupRules || []), { id: Date.now(), label: "", followed: false }] })),
    clearSetupRulesMulti: (tIdx) => setTrades(p => p.map((t, i) => i !== tIdx ? t : { ...t, setupRules: t.setupRules.map(r => ({ ...r, followed: false })) })),
    deleteTrade: (idx) => {
      setTrades(prev => prev.filter((_, i) => i !== idx));
      setSavedTrades(prev => prev.filter((_, i) => i !== idx));
    },
  };
}
