"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { createTrade } from "@/services/tradeApi";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useMarket, MARKETS } from "@/context/MarketContext";
import MarketSwitcher from "@/components/MarketSwitcher";
import InstallPWA from "@/components/InstallPWA";
import { API_URL } from "@/config/api";
import { fetchSetups } from "@/services/setupApi";

/* ─────────────────────────────────────────
   LIGHT THEME DESIGN TOKENS
   Base bg:      #F0EEE9  (warm parchment)
   Card:         #FFFFFF
   Header:       rgba(255,255,255,0.92)
   Bull:         #0D9E6E   Bear: #D63B3B
   Gold:         #B8860B
   Text:         #0F1923 / #4A5568 / #94A3B8
   Border:       #E2E8F0
   Fonts:        Plus Jakarta Sans + JetBrains Mono
 ───────────────────────────────────────── */

/* ── CANDLESTICK BACKGROUND ── */
function CandlestickBackground() {
  useEffect(() => {
    const canvas = document.getElementById("upload-bg-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const draw = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const count = Math.floor(W / 32);
      let price = 200;
      const candles = [];
      for (let i = 0; i < count; i++) {
        const open = price + (Math.random() - 0.5) * 20;
        const close = open + (Math.random() - 0.5) * 28;
        const high = Math.max(open, close) + Math.random() * 12;
        const low = Math.min(open, close) - Math.random() * 12;
        price = close;
        candles.push({ open, close, high, low });
      }
      const all = candles.flatMap(c => [c.high, c.low]);
      const mx = Math.max(...all), mn = Math.min(...all), rng = mx - mn || 1;
      const toY = p => H * 0.1 + (H * 0.8 * (mx - p)) / rng;

      ctx.strokeStyle = "rgba(0,0,0,0.04)"; ctx.lineWidth = 1;
      for (let i = 1; i < 7; i++) { ctx.beginPath(); ctx.moveTo(0, (H / 7) * i); ctx.lineTo(W, (H / 7) * i); ctx.stroke(); }

      candles.forEach((c, i) => {
        const x = i * 32 + 16, bull = c.close >= c.open;
        ctx.strokeStyle = bull ? "rgba(13,158,110,0.22)" : "rgba(214,59,59,0.18)";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, toY(c.high)); ctx.lineTo(x, toY(c.low)); ctx.stroke();
        ctx.fillStyle = bull ? "rgba(13,158,110,0.14)" : "rgba(214,59,59,0.11)";
        const bTop = toY(Math.max(c.open, c.close)), bBot = toY(Math.min(c.open, c.close));
        ctx.fillRect(x - 8, bTop, 16, Math.max(bBot - bTop, 1));
      });

      const ma = candles.map((_, i) => { const sl = candles.slice(Math.max(0, i - 5), i + 1); return sl.reduce((a, c) => a + c.close, 0) / sl.length; });
      ctx.strokeStyle = "rgba(184,134,11,0.28)"; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ma.forEach((p, i) => { const x = i * 32 + 16, y = toY(p); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }); ctx.stroke(); ctx.setLineDash([]);
    };
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, []);
  return <canvas id="upload-bg-canvas" style={{ position: "fixed", inset: 0, width: "100%", height: "100%", opacity: 1, zIndex: 0, pointerEvents: "none" }} />;
}

/* ── TICKER TAPE — dark strip for contrast ── */
const tickers = [
  { sym: "BTC", val: "+2.34%", bull: true }, { sym: "ETH", val: "-1.12%", bull: false },
  { sym: "AAPL", val: "+0.87%", bull: true }, { sym: "TSLA", val: "+4.20%", bull: true },
  { sym: "NVDA", val: "-0.55%", bull: false }, { sym: "GOLD", val: "+0.62%", bull: true },
  { sym: "SPY", val: "+0.31%", bull: true }, { sym: "OIL", val: "-2.18%", bull: false },
  { sym: "AMZN", val: "+1.05%", bull: true }, { sym: "USD/JPY", val: "-0.33%", bull: false },
];
function TickerTape() {
  const items = [...tickers, ...tickers];
  return (
    <div style={{ overflow: "hidden", background: "#0F1923", borderBottom: "3px solid #0D9E6E", padding: "7px 0", whiteSpace: "nowrap", position: "relative", zIndex: 10 }}>
      <div style={{ display: "inline-flex", gap: "48px", animation: "ticker 32s linear infinite" }}>
        {items.map((t, i) => (
          <span key={i} style={{ fontSize: "11px", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.04em" }}>
            <span style={{ color: "#94A3B8", marginRight: 6 }}>{t.sym}</span>
            <span style={{ color: t.bull ? "#22C78E" : "#F87171" }}>{t.bull ? "▲" : "▼"} {t.val}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── FILE UPLOAD ZONE ── */
function FileUploadZone({ onFileSelect, selectedFile, onClear }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = e => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = e => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) onFileSelect(f);
  };

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${isDragging ? "#0D9E6E" : "#E2E8F0"}`,
        borderRadius: 12, background: isDragging ? "#ECFDF5" : "#F8FAFC",
        padding: "40px 24px", textAlign: "center", cursor: "pointer",
        transition: "all 0.25s ease",
        transform: isDragging ? "scale(1.01)" : "scale(1)",
      }}
      onMouseEnter={e => { if (!isDragging) { e.currentTarget.style.borderColor = "#0D9E6E"; e.currentTarget.style.background = "#F0FDF9"; } }}
      onMouseLeave={e => { if (!isDragging) { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.background = "#F8FAFC"; } }}
    >
      <input ref={fileInputRef} type="file" accept="image/*" onChange={e => e.target.files[0] && onFileSelect(e.target.files[0])} style={{ display: "none" }} />

      {selectedFile ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ width: 68, height: 68, borderRadius: 14, background: "#ECFDF5", border: "1.5px solid #A7F3D0", display: "flex", alignItems: "center", justifyContent: "center", color: "#0D9E6E" }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F1923", fontFamily: "'Plus Jakarta Sans',sans-serif", marginBottom: 4 }}>{selectedFile.name}</div>
            <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace" }}>{(selectedFile.size / 1024).toFixed(1)} KB · Ready to extract</div>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onClear(); }}
            style={{ padding: "6px 16px", fontSize: 10, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, letterSpacing: "0.1em", color: "#D63B3B", background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 6, cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#FEE2E2"}
            onMouseLeave={e => e.currentTarget.style.background = "#FEF2F2"}
          >REMOVE</button>
        </div>
      ) : (
        <>
          <div style={{ width: 60, height: 60, borderRadius: 14, background: "rgba(184,134,11,0.1)", border: "1.5px solid rgba(184,134,11,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "#B8860B", margin: "0 auto 16px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0F1923", fontFamily: "'Plus Jakarta Sans',sans-serif", marginBottom: 6 }}>Drop your trade screenshot here</div>
          <div style={{ fontSize: 12, color: "#94A3B8", fontFamily: "'Plus Jakarta Sans',sans-serif", marginBottom: 12 }}>or click to browse</div>
          <div style={{ display: "inline-flex", gap: 6 }}>
            {["PNG", "JPG", "JPEG"].map(f => (
              <span key={f} style={{ fontSize: 9, color: "#B8860B", background: "rgba(184,134,11,0.08)", border: "1px solid rgba(184,134,11,0.2)", borderRadius: 4, padding: "2px 8px", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>{f}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── SHARED LABEL STYLE ── */
const labelStyle = {
  display: "block", fontSize: 10, fontWeight: 600, color: "#4A5568",
  letterSpacing: "0.1em", marginBottom: 7, fontFamily: "'JetBrains Mono',monospace",
};

/* ── SHARED INPUT BASE STYLE ── */
const inputBase = {
  width: "100%", padding: "11px 14px", fontSize: 13,
  fontFamily: "'JetBrains Mono',monospace", color: "#0F1923",
  background: "#F8FAFC", border: "1.5px solid #E2E8F0",
  borderRadius: 8, outline: "none", transition: "all 0.2s ease",
};

const onFocusGreen = e => {
  e.currentTarget.style.borderColor = "#0D9E6E";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(13,158,110,0.10)";
  e.currentTarget.style.background = "#F0FDF9";
};
const onBlurReset = e => {
  e.currentTarget.style.borderColor = "#E2E8F0";
  e.currentTarget.style.boxShadow = "none";
  e.currentTarget.style.background = "#F8FAFC";
};

function isFilled(v) {
  if (v == null) return false;
  return String(v).trim() !== "";
}

function FormInput({ label, name, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type={type} name={name} placeholder={placeholder} value={value || ""} onChange={onChange}
        style={inputBase} onFocus={onFocusGreen} onBlur={onBlurReset} />
    </div>
  );
}

function FormSelect({ label, name, value, onChange, options }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <select name={name} value={value || ""} onChange={onChange}
        style={{ ...inputBase, cursor: "pointer" }} onFocus={onFocusGreen} onBlur={onBlurReset}>
        <option value="">Select...</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

/* ── SECTION CARD ── */
function SectionCard({ accentColor = "#0D9E6E", title, subtitle, children, delay = 0, style = {} }) {
  return (
    <div style={{ background: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden", boxShadow: "0 2px 12px rgba(15,25,35,0.06)", animation: `fadeUp 0.5s ease ${delay}s both`, marginBottom: 20, ...style }}>
      <div style={{ height: 3, background: `linear-gradient(90deg,${accentColor},${accentColor}33)` }} />
      <div style={{ padding: "22px 24px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0F1923", fontFamily: "'Plus Jakarta Sans',sans-serif", marginBottom: 2 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.06em", marginBottom: 18 }}>{subtitle}</div>}
        {children}
      </div>
    </div>
  );
}

// Start with no static rules; rules will come from selected setup
const DEFAULT_SETUP_RULES = [];

/* ── QUALITY HELPER ── */
function getSetupQuality(rules) {
  if (!rules || rules.length === 0) return null;
  const activeRules = rules.filter(r => r.label && r.label.trim().length > 0);
  if (activeRules.length === 0) return null;
  const followed = activeRules.filter(r => r.followed).length;
  const score = (followed / activeRules.length) * 100;

  if (score >= 100) return { label: "A+", color: "#0D9E6E", bg: "#ECFDF5" };
  if (score >= 80) return { label: "A", color: "#10B981", bg: "#F0FDF4" };
  if (score >= 60) return { label: "B", color: "#B8860B", bg: "#FFFBEB" };
  if (score >= 40) return { label: "C", color: "#F59E0B", bg: "#FFF7ED" };
  return { label: "D", color: "#D63B3B", bg: "#FEF2F2" };
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
 ───────────────────────────────────────── */
function UploadTradeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { currentMarket } = useMarket();
  const [file, setFile] = useState(null);
  const [trade, setTrade] = useState(null);
  const [trades, setTrades] = useState([]);       // multi-trade array for Indian Market
  const [savedTrades, setSavedTrades] = useState([]); // track which trades are saved
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [strategies, setStrategies] = useState([]);
  const [setupsLoading, setSetupsLoading] = useState(false);

  const marketType = pathname?.startsWith("/indian-market")
    ? MARKETS.INDIAN_MARKET
    : (searchParams.get("market") || searchParams.get("marketType") || currentMarket);
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState("");
  const [saved, setSaved] = useState(false);
  const [showCustomRR, setShowCustomRR] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const [broker, setBroker] = useState("AUTO");
  const [setupRules, setSetupRules] = useState(DEFAULT_SETUP_RULES);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    setMounted(true);
    const tick = () => setTime(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t);
  }, [router]);

  // Load saved setups/strategies for current market so Strategy field shows them
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    const loadSetups = async () => {
      try {
        setSetupsLoading(true);
        const serverStrategies = await fetchSetups(marketType);
        if (cancelled) return;
        if (Array.isArray(serverStrategies) && serverStrategies.length) {
          const mapped = serverStrategies.map((s, sIdx) => ({
            id: sIdx + 1,
            name: s.name || "",
            rules: Array.isArray(s.rules)
              ? s.rules.map((r, rIdx) => ({
                  id: rIdx + 1,
                  label: r.label || "",
                  followed: false,
                }))
              : [],
          }));
          setStrategies(mapped);
        } else {
          setStrategies([]);
        }
      } catch (e) {
        console.error("Failed to load setups", e);
        setStrategies([]);
      } finally {
        if (!cancelled) setSetupsLoading(false);
      }
    };
    loadSetups();
    return () => {
      cancelled = true;
    };
  }, [marketType, mounted]);

  const handleUpload = async () => {
    if (!file) { setError("Please select an image file first"); return; }
    setLoading(true); setError(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("marketType", marketType); // Send marketType
      if (marketType === MARKETS.INDIAN_MARKET) {
        formData.append("broker", broker);
      }
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/upload?marketType=${marketType}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Upload failed"); }
      const data = await res.json();
      const p = data.parsedTrade || {};
      setExtractedText(data.extractedText || "");

      const isInd = marketType === MARKETS.INDIAN_MARKET;

      if (isInd) {
        // Use parsedTrades (multi-trade) if available
        const multiTrades = data.parsedTrades || [];
        if (multiTrades.length > 0) {
          const tradeArr = multiTrades.map(t => {
            const sym = (t.symbol || "").toUpperCase();
            const strike = t.strike ? String(t.strike) : "";
            const ot = (t.optionType || "CE").toUpperCase();
            const pairBuilt = sym && strike ? `${sym} ${strike} ${ot}` : (sym || "");
            return {
              pair: pairBuilt,
              action: "buy",
              quantity: t.quantity != null ? String(t.quantity) : "",
              profit: t.pnl != null ? String(t.pnl) : "",
              entryPrice: t.entryPrice != null ? String(t.entryPrice) : "",
              exitPrice: "",
              optionType: ot,
              screenshot: data.url,
              segment: "F&O",
              instrumentType: "OPTION",
              strikePrice: strike,
              tradeType: "INTRADAY",
              strategy: "",
              strategyCustom: "",
              expiryDate: "",
              riskRewardRatio: "",
              riskRewardCustom: "",
              entryBasis: "Plan",
              entryBasisCustom: "",
              notes: "",
              setup: "",
              mistakeTag: "",
              lesson: "",
              brokerage: "",
              sttTaxes: "",
              setupRules: [],
            };
          });
          setTrades(tradeArr);
          setSavedTrades(new Array(tradeArr.length).fill(false));
          // Also set first trade as the single trade for backward compatibility
          setTrade(tradeArr[0]);
        } else {
          // Fallback to single parsedTrade
          const pairStr = (p.pair || "").trim().toUpperCase();
          const optionTypeFromPair = pairStr.endsWith(" PE") ? "PE" : pairStr.endsWith(" CE") ? "CE" : (p.optionType || "CE");
          setTrade({
            pair: p.pair || "",
            action: (p.action || p.type || "BUY").toString().toUpperCase().slice(0, 4) === "SELL" ? "sell" : "buy",
            quantity: p.quantity != null ? String(p.quantity) : "",
            profit: p.profit != null && p.profit !== "" ? String(p.profit) : "",
            entryPrice: p.entryPrice != null ? String(p.entryPrice) : "",
            exitPrice: p.exitPrice != null ? String(p.exitPrice) : "",
            optionType: optionTypeFromPair,
            screenshot: data.url,
            segment: "F&O",
            instrumentType: "OPTION",
            strikePrice: p.strikePrice != null ? String(p.strikePrice) : "",
            tradeType: "INTRADAY",
            strategy: "",
            strategyCustom: "",
            expiryDate: p.expiryDate || "",
            riskRewardRatio: "",
            riskRewardCustom: "",
            entryBasis: "Plan",
            entryBasisCustom: "",
            notes: "",
            setup: "",
            mistakeTag: "",
            lesson: "",
            brokerage: "",
            sttTaxes: "",
          });
          setTrades([]);
        }
      } else {
        setTrade({
          pair: p.pair || "",
          action: p.action || p.type || "BUY",
          lotSize: p.lotSize ? String(p.lotSize) : "",
          entryPrice: p.entryPrice ? String(p.entryPrice) : "",
          exitPrice: p.exitPrice ? String(p.exitPrice) : "",
          stopLoss: p.stopLoss ? String(p.stopLoss) : "",
          takeProfit: p.takeProfit ? String(p.takeProfit) : "",
          profit: p.profit ? String(p.profit) : "",
          commission: p.commission ? String(p.commission) : "",
          swap: p.swap ? String(p.swap) : "",
          balance: p.balance ? String(p.balance) : "",
          session: p.session || "",
          strategy: "",
          notes: "",
          screenshot: data.url,
          segment: p.segment || "Equity",
          instrumentType: p.instrumentType || "EQUITY",
          quantity: p.quantity ? String(p.quantity) : "",
          strikePrice: p.strikePrice ? String(p.strikePrice) : "",
          expiryDate: p.expiryDate || "",
          brokerage: "",
          sttTaxes: "",
          entryBasis: "Plan",
          entryBasisCustom: "",
        });
      }
    } catch (err) {
      setError(err.message || "Failed to upload image. Please try again.");
    } finally { setLoading(false); }
  };

  const handleChange = e => setTrade({ ...trade, [e.target.name]: e.target.value });
  const handleStrategyChange = e => {
    const value = e.target.value;
    setTrade(prev => ({ ...prev, strategy: value }));

    const selected = strategies.find(s => s.name === value);
    if (selected && Array.isArray(selected.rules) && selected.rules.length) {
      setSetupRules(
        selected.rules.map((r, idx) => ({
          id: r.id ?? idx + 1,
          label: r.label || "",
          followed: false,
        }))
      );
    } else {
      // No strategy or no rules -> start with empty checklist
      setSetupRules([]);
    }
  };

  // Multi-trade: change handler for a specific index
  const handleTradeChange = (index, e) => {
    const updated = [...trades];
    updated[index] = { ...updated[index], [e.target.name]: e.target.value };
    setTrades(updated);
  };

  // Multi-trade: when strategy changes, load that strategy's checklist rules (same logic as single-trade)
  const handleMultiTradeStrategyChange = (index, e) => {
    const value = e.target.value;
    const updated = [...trades];
    updated[index] = { ...updated[index], strategy: value };
    const selected = strategies.find(s => s.name === value);
    const newRules = selected && Array.isArray(selected.rules) && selected.rules.length
      ? selected.rules.map((r, idx) => ({ id: r.id ?? idx + 1, label: r.label || "", followed: false }))
      : [];
    updated[index].setupRules = newRules;
    setTrades(updated);
  };

  // Multi-trade: setup checklist actions per trade index
  const toggleSetupRuleMulti = (tradeIdx, ruleId) => {
    setTrades(prev => prev.map((t, i) => {
      if (i !== tradeIdx || !Array.isArray(t.setupRules)) return t;
      return { ...t, setupRules: t.setupRules.map(r => r.id === ruleId ? { ...r, followed: !r.followed } : r) };
    }));
  };
  const updateSetupRuleLabelMulti = (tradeIdx, ruleId, value) => {
    setTrades(prev => prev.map((t, i) => {
      if (i !== tradeIdx || !Array.isArray(t.setupRules)) return t;
      return { ...t, setupRules: t.setupRules.map(r => r.id === ruleId ? { ...r, label: value } : r) };
    }));
  };
  const addSetupRuleMulti = (tradeIdx) => {
    setTrades(prev => prev.map((t, i) => {
      if (i !== tradeIdx) return t;
      const rules = Array.isArray(t.setupRules) ? t.setupRules : [];
      const nextId = (rules[rules.length - 1]?.id || 0) + 1;
      return { ...t, setupRules: [...rules, { id: nextId, label: "", followed: false }] };
    }));
  };
  const clearSetupRulesMulti = (tradeIdx) => {
    setTrades(prev => prev.map((t, i) => {
      if (i !== tradeIdx || !Array.isArray(t.setupRules)) return t;
      return { ...t, setupRules: t.setupRules.map(r => ({ ...r, followed: false })) };
    }));
  };

  // Multi-trade: save a single trade by index
  const saveIndianTrade = async (index) => {
    const t = trades[index];
    if (!t.pair) { setError("Please enter a symbol"); return; }
    setError(null);
    try {
      const rules = Array.isArray(t.setupRules) ? t.setupRules : [];
      const activeRules = rules.filter(r => r.label && String(r.label).trim().length > 0);
      const followedCount = activeRules.filter(r => r.followed).length;
      const setupScore = activeRules.length > 0 ? Math.round((followedCount / activeRules.length) * 100) : null;

      const tradeData = {
        pair: t.pair,
        type: (t.action || "BUY").toUpperCase(),
        optionType: (t.optionType || "CE").toUpperCase(),
        quantity: t.quantity ? parseFloat(t.quantity) : undefined,
        profit: t.profit ? parseFloat(t.profit) : undefined,
        strikePrice: t.strikePrice ? parseFloat(t.strikePrice) : undefined,
        underlying: t.pair ? t.pair.replace(/\s+\d+\s*(CE|PE)$/i, "").trim() : undefined,
        screenshot: t.screenshot,
        entryPrice: t.entryPrice ? parseFloat(t.entryPrice) : undefined,
        exitPrice: t.exitPrice ? parseFloat(t.exitPrice) : undefined,
        tradeType: t.tradeType || undefined,
        strategy: t.strategy === "Custom" ? (t.strategyCustom?.trim() || "Custom") : (t.strategy || undefined),
        expiryDate: t.expiryDate || undefined,
        riskRewardRatio: t.riskRewardRatio || undefined,
        entryBasis: t.entryBasis || "Plan",
        entryBasisCustom: t.entryBasis === "Custom" ? t.entryBasisCustom : undefined,
        notes: t.notes || undefined,
        setup: t.setup || undefined,
        mistakeTag: t.mistakeTag || undefined,
        lesson: t.lesson || undefined,
        brokerage: t.brokerage ? parseFloat(t.brokerage) : undefined,
        sttTaxes: t.sttTaxes ? parseFloat(t.sttTaxes) : undefined,
        setupRules: activeRules.map(({ label, followed }) => ({ label: String(label).trim(), followed })),
        setupScore,
      };
      const result = await createTrade(tradeData, marketType);
      if (result && result._id) {
        const updated = [...savedTrades];
        updated[index] = true;
        setSavedTrades(updated);
        // If all trades saved, redirect
        if (updated.every(Boolean)) {
          setTimeout(() => router.push("/indian-market/trades"), 1200);
        }
      } else {
        throw new Error(result?.message || "Failed to save trade");
      }
    } catch (err) {
      setError(err.message || "Failed to save trade.");
    }
  };

  const saveTrade = async () => {
    if (!trade.pair) { setError(`Please enter a ${marketType === MARKETS.INDIAN_MARKET ? "symbol" : "trading pair"}`); return; }
    if (!trade.action) { setError("Please select an action (Buy/Sell)"); return; }
    setError(null);
    try {
      const isInd = marketType === MARKETS.INDIAN_MARKET;

      const activeRules = setupRules.filter(r => r.label && r.label.trim().length > 0);
      const followedCount = activeRules.filter(r => r.followed).length;
      const setupScore = activeRules.length > 0 ? Math.round((followedCount / activeRules.length) * 100) : null;

      const tradeData = {
        pair: trade.pair,
        type: trade.action.toUpperCase(),
        entryPrice: trade.entryPrice ? parseFloat(trade.entryPrice) : undefined,
        exitPrice: trade.exitPrice ? parseFloat(trade.exitPrice) : undefined,
        stopLoss: trade.stopLoss ? parseFloat(trade.stopLoss) : undefined,
        takeProfit: trade.takeProfit ? parseFloat(trade.takeProfit) : undefined,
        profit: trade.profit ? parseFloat(trade.profit) : undefined,
        balance: trade.balance ? parseFloat(trade.balance) : undefined,
        session: trade.session || undefined,
        strategy: trade.strategy || undefined,
        notes: trade.notes || undefined,
        screenshot: trade.screenshot || undefined,
        riskRewardRatio: trade.riskRewardRatio || undefined,
        riskRewardCustom: trade.riskRewardCustom || undefined,
        entryBasis: trade.entryBasis || "Plan",
        entryBasisCustom: trade.entryBasis === "Custom" ? trade.entryBasisCustom : undefined,
        setupRules: activeRules.map(({ label, followed }) => ({ label: label.trim(), followed })),
        setupScore,
      };

      if (isInd) {
        tradeData.optionType = (trade.optionType || "CE").toUpperCase();
        tradeData.quantity = trade.quantity ? parseFloat(trade.quantity) : undefined;
        tradeData.profit = trade.profit ? parseFloat(trade.profit) : undefined;
        tradeData.strikePrice = trade.strikePrice ? parseFloat(trade.strikePrice) : undefined;
        tradeData.underlying = trade.pair ? trade.pair.replace(/\s+\d+\s*(CE|PE)$/i, "").trim() : undefined;
        tradeData.tradeType = trade.tradeType || undefined;
        tradeData.strategy = trade.strategy === "Custom" ? (trade.strategyCustom?.trim() || "Custom") : (trade.strategy || undefined);
        tradeData.expiryDate = trade.expiryDate || undefined;
        tradeData.setup = trade.setup || undefined;
        tradeData.mistakeTag = trade.mistakeTag || undefined;
        tradeData.lesson = trade.lesson || undefined;
        tradeData.brokerage = trade.brokerage ? parseFloat(trade.brokerage) : undefined;
        tradeData.sttTaxes = trade.sttTaxes ? parseFloat(trade.sttTaxes) : undefined;
      } else {
        tradeData.lotSize = trade.lotSize ? parseFloat(trade.lotSize) : undefined;
        tradeData.commission = trade.commission ? parseFloat(trade.commission) : undefined;
        tradeData.swap = trade.swap ? parseFloat(trade.swap) : undefined;
      }

      const result = await createTrade(tradeData, marketType);

      if (result && result._id) {
        setSaved(true);
        const redirectPath = marketType === MARKETS.INDIAN_MARKET ? "/indian-market/trades" : "/trades";
        setTimeout(() => router.push(redirectPath), 1200);
      } else {
        throw new Error(result?.message || "Failed to save trade");
      }
    } catch (err) {
      setError(err.message || "Failed to save trade. Please try again.");
    }
  };

  const toggleSetupRule = (id) => {
    setSetupRules(prev =>
      prev.map(r => (r.id === id ? { ...r, followed: !r.followed } : r))
    );
  };

  const updateSetupRuleLabel = (id, value) => {
    setSetupRules(prev =>
      prev.map(r => (r.id === id ? { ...r, label: value } : r))
    );
  };

  const addSetupRule = () => {
    setSetupRules(prev => [
      ...prev,
      {
        id: (prev[prev.length - 1]?.id || 0) + 1,
        label: "",
        followed: false,
      },
    ]);
  };

  const clearSetupRules = () => {
    setSetupRules(prev => prev.map(r => ({ ...r, followed: false })));
  };

  /* ── step progress state ── */
  const steps = [
    { label: "Upload", done: !!file },
    { label: "Extract", done: !!trade },
    { label: "Save", done: saved },
  ];

  const isInd = marketType === MARKETS.INDIAN_MARKET;

  return (
    <div style={{ minHeight: "100vh", background: "#F0EEE9", fontFamily: "'Plus Jakarta Sans',sans-serif", color: "#0F1923", position: "relative", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <CandlestickBackground />
      {/* Warm overlay */}
      <div style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", background: "linear-gradient(135deg,rgba(240,238,233,0.80) 0%,rgba(240,238,233,0.74) 100%)" }} />
      {/* Gold glow top-left */}
      <div style={{ position: "fixed", top: -80, left: -80, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle,rgba(184,134,11,0.07) 0%,transparent 70%)", zIndex: 1, pointerEvents: "none" }} />
      {/* Green glow bottom-right */}
      <div style={{ position: "fixed", bottom: -100, right: -60, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle,rgba(13,158,110,0.06) 0%,transparent 70%)", zIndex: 1, pointerEvents: "none" }} />

      {/* ── HEADER ── */}
      <header style={{ position: "relative", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px", minHeight: 60, flexWrap: "wrap", gap: 10, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid #E2E8F0", boxShadow: "0 1px 12px rgba(15,25,35,0.06)" }}>

        {/* Left: back + logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Global back button */}
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              width: 32,
              height: 32,
              borderRadius: "999px",
              border: "1px solid #E2E8F0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 8,
              cursor: "pointer",
              background: "#FFFFFF",
              padding: 0
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0F1923" strokeWidth="2.2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div style={{ width: 38, height: 38, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}><img src="/logo.png" alt="Stratedge" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
          <div>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 800, letterSpacing: "0.04em", color: "#0F1923", lineHeight: 1 }}>STRATEDGE</div>
            <div style={{ fontSize: 9, letterSpacing: "0.18em", color: "#0D9E6E", marginTop: 1, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>AI JOURNAL {isInd ? "🇮🇳" : "🌍"}</div>
          </div>
        </div>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Live clock */}
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#4A5568", letterSpacing: "0.06em", background: "#F8F6F2", border: "1px solid #E2E8F0", borderRadius: 6, padding: "4px 10px" }}>
            {time}
          </div>

          {/* Market open pill */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 20, padding: "5px 12px" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#0D9E6E", animation: "blink 1.2s ease-in-out infinite" }} />
            <span style={{ fontSize: 10, letterSpacing: "0.1em", color: "#0D9E6E", fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}>MARKET OPEN</span>
          </div>

          <InstallPWA />
          <MarketSwitcher />
        </div>
      </header>

      <TickerTape />

      {/* ── MAIN ── */}
      <main style={{ position: "relative", zIndex: 5, padding: "28px 20px", maxWidth: 900, margin: "0 auto", opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(16px)", transition: "all 0.55s cubic-bezier(0.22,1,0.36,1)" }}>

        {/* Page title + step progress */}
        <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 14 }}>
          <div>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 28, fontWeight: 800, color: "#0F1923", margin: 0, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
              Upload <span style={{ color: "#B8860B" }}>{isInd ? "Indian Trade" : "Forex Trade"}</span>
            </h1>
            <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 5, fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.06em" }}>
              AI-POWERED SCREENSHOT EXTRACTION
            </p>
          </div>

          {/* Step progress row */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {steps.map((s, i) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {i > 0 && <div style={{ width: 22, height: 2, background: steps[i].done ? "#0D9E6E" : "#E2E8F0", borderRadius: 2 }} />}
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: s.done ? "#0D9E6E" : "#FFFFFF", border: `1.5px solid ${s.done ? "#0D9E6E" : "#E2E8F0"}`, transition: "all 0.3s" }}>
                    {s.done
                      ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                      : <span style={{ fontSize: 9, color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>{i + 1}</span>
                    }
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, fontFamily: "'Plus Jakarta Sans',sans-serif", color: s.done ? "#0D9E6E" : "#94A3B8", transition: "color 0.3s" }}>{s.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── UPLOAD CARD ── */}
        <SectionCard accentColor={isInd ? "#1B5E20" : "#B8860B"} title="Upload Screenshot" subtitle={isInd ? "DROP YOUR OPTIONS TRADE SCREENSHOT (BROKER APP)" : "DROP YOUR TRADE SCREENSHOT TO BEGIN AI EXTRACTION"} delay={0.05}>

          <FileUploadZone selectedFile={file} onFileSelect={f => { setFile(f); setError(null); }} onClear={() => { setFile(null); setError(null); }} />

          {/* Broker selector (Indian Market only) */}
          {isInd && (
            <div style={{ marginTop: 14 }}>
              <FormSelect
                label="BROKER (OPTIONAL)"
                name="broker"
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
                options={[
                  { value: "AUTO", label: "Auto-detect" },
                  { value: "Zerodha", label: "Zerodha (Kite)" },
                  { value: "Upstox", label: "Upstox" },
                  { value: "Angel One", label: "Angel One" },
                  { value: "Groww", label: "Groww" },
                  { value: "Dhan", label: "Dhan" },
                  { value: "Fyers", label: "Fyers" },
                  { value: "5paisa", label: "5paisa" },
                  { value: "ICICI Direct", label: "ICICI Direct" },
                  { value: "Kotak", label: "Kotak Securities" },
                  { value: "Paytm Money", label: "Paytm Money" },
                ]}
              />
              <div style={{ marginTop: 6, fontSize: 11, color: "#64748B", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                If extraction is wrong, pick your broker to apply the right screen template.
              </div>
            </div>
          )}

          {/* ── INDIAN OPTIONS HINT (before file selected) ── */}
          {isInd && !file && (
            <div style={{ marginTop: 16, borderRadius: 10, border: "1px solid #E2E8F0", overflow: "hidden", background: "#F8FAFC" }}>
              <div style={{ padding: "10px 14px", background: "linear-gradient(90deg,rgba(27,94,32,0.08),rgba(27,94,32,0.02))", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B5E20" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#1B5E20", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.08em" }}>OPTIONS — UPLOAD A SCREENSHOT LIKE THIS</span>
              </div>
              <div style={{ padding: "14px 16px", fontSize: 12, color: "#475569", fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1.55 }}>
                <p style={{ margin: "0 0 8px 0" }}>Your broker app’s <strong>closed position</strong> or <strong>trade detail</strong> screen works best. Make sure it shows:</p>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  <li>Instrument (e.g. <strong>NIFTY 26100 CE</strong>) and <strong>NSE</strong> tag</li>
                  <li><strong>Expiry</strong> (e.g. 02 Dec 2025)</li>
                  <li><strong>Position details</strong> — Side (Closed), Avg price, Net Qty</li>
                  <li><strong>Trade summary</strong> — Buys (Qty, Price) and Sells (Qty, Price)</li>
                </ul>
                <p style={{ margin: "10px 0 0 0", fontSize: 11, color: "#64748B" }}>AI will extract symbol, strike, CE/PE, entry &amp; exit premium, and P&L.</p>
              </div>
            </div>
          )}

          {/* ── SAMPLE IMAGE HINT (Forex only, before file selected) ── */}
          {!isInd && !file && (
            <div style={{ marginTop: 16, borderRadius: 10, border: "1px solid #E2E8F0", overflow: "hidden", background: "#F8FAFC" }}>
              <div style={{ padding: "10px 14px", background: "linear-gradient(90deg,rgba(184,134,11,0.07),rgba(184,134,11,0.02))", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B8860B" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#B8860B", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.1em" }}>SAMPLE — UPLOAD A SCREENSHOT LIKE THIS</span>
              </div>
              <div style={{ padding: "10px 14px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div
                  onClick={() => setShowSample(true)}
                  style={{ borderRadius: 6, overflow: "hidden", border: "1.5px solid #B8860B", boxShadow: "0 2px 8px rgba(15,25,35,0.08)", flexShrink: 0, width: 120, height: 80, cursor: "zoom-in", position: "relative" }}
                >
                  <img
                    src="/sample.png"
                    alt="Sample MT5 Forex trade screenshot"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                  <div style={{ position: "absolute", inset: 0, background: "rgba(184,134,11,0.0)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(184,134,11,0.18)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(184,134,11,0.0)"}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{ opacity: 0.9, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.4))" }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: "#64748B", fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1.5, margin: 0 }}>
                    Upload your <strong>MT5 trade history screenshot</strong>. Make sure pair, lot size, entry/exit prices &amp; profit are visible.
                  </p>
                  <p style={{ fontSize: 10, color: "#B8860B", fontFamily: "'JetBrains Mono',monospace", marginTop: 5, letterSpacing: "0.04em", cursor: "pointer" }} onClick={() => setShowSample(true)}>
                    🔍 Click image to expand
                  </p>
                </div>
              </div>

              {/* ── LIGHTBOX MODAL ── */}
              {showSample && (
                <div
                  onClick={() => setShowSample(false)}
                  onKeyDown={e => e.key === "Escape" && setShowSample(false)}
                  tabIndex={-1}
                  style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,25,35,0.85)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, cursor: "zoom-out", animation: "fadeUp 0.2s ease both" }}
                >
                  <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: "90vw", maxHeight: "88vh", borderRadius: 14, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.55)", border: "1.5px solid rgba(255,255,255,0.12)" }}>
                    <img
                      src="/sample.png"
                      alt="Sample MT5 Forex trade screenshot"
                      style={{ display: "block", maxWidth: "90vw", maxHeight: "80vh", objectFit: "contain" }}
                    />
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent,rgba(15,25,35,0.88))", padding: "16px 20px 14px" }}>
                      <div style={{ fontSize: 11, color: "#E2E8F0", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600 }}>Sample MT5 Forex Trade Screenshot</div>
                      <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace", marginTop: 3 }}>Your screenshot should look similar to this · Click anywhere to close</div>
                    </div>
                    <button
                      onClick={() => setShowSample(false)}
                      style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: "50%", background: "rgba(15,25,35,0.70)", border: "1px solid rgba(255,255,255,0.15)", color: "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(4px)" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div style={{ marginTop: 14, padding: "12px 16px", background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D63B3B" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              <span style={{ fontSize: 12, color: "#D63B3B", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 500 }}>{error}</span>
            </div>
          )}

          {/* Extract button */}
          <button
            onClick={handleUpload} disabled={loading || !file}
            style={{
              marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              width: "100%", padding: "13px 20px",
              fontSize: 12, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, letterSpacing: "0.12em",
              color: (loading || !file) ? "#94A3B8" : "#FFFFFF",
              background: (loading || !file) ? "#F1F5F9" : "linear-gradient(135deg,#B8860B,#D4A917)",
              border: "none", borderRadius: 10, cursor: (loading || !file) ? "not-allowed" : "pointer",
              transition: "all 0.25s ease",
              boxShadow: (loading || !file) ? "none" : "0 4px 16px rgba(184,134,11,0.32)",
              position: "relative", overflow: "hidden",
            }}
            onMouseEnter={e => { if (!loading && file) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(184,134,11,0.42)"; } }}
            onMouseLeave={e => { if (!loading && file) { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(184,134,11,0.32)"; } }}
          >
            {(!loading && file) && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.15) 50%,transparent 60%)", animation: "shimmer 2.5s linear infinite" }} />}
            {loading ? (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" style={{ animation: "spin 0.9s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>EXTRACTING TRADE DATA...</>
            ) : (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>EXTRACT TRADE DATA</>
            )}
          </button>
        </SectionCard>

        {/* ── LOADING CARD ── */}
        {loading && (
          <SectionCard accentColor="#B8860B" title="" subtitle="" delay={0.1}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 0", gap: 14 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B8860B" strokeWidth="2.5" style={{ animation: "spin 0.9s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              <div style={{ fontSize: 12, color: "#94A3B8", letterSpacing: "0.12em", fontFamily: "'JetBrains Mono',monospace" }}>EXTRACTING TRADE DATA...</div>
              <div style={{ fontSize: 11, color: "#CBD5E1", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>AI is reading your screenshot</div>
            </div>
          </SectionCard>
        )}

        {/* ── MULTI-TRADE CARDS (Indian Market with multiple trades) ── */}
        {isInd && trades.length > 1 && (
          <>
            {/* Overall P&L (frontend-only, not stored) */}
            {(() => {
              const totalPnl = trades.reduce((sum, t) => {
                const p = t.profit != null && String(t.profit).trim() !== "" ? parseFloat(String(t.profit).replace(/,/g, "")) : NaN;
                return sum + (Number.isFinite(p) ? p : 0);
              }, 0);
              const isProfit = totalPnl >= 0;
              const formatted = Number.isFinite(totalPnl)
                ? (totalPnl >= 0 ? "₹" : "-₹") + Math.abs(totalPnl).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : "—";
              return (
                <SectionCard accentColor={isProfit ? "#0D9E6E" : "#D63B3B"} title="Overall P&L" subtitle={`${formatted} on ${trades.length} positions · Any broker · For reference only (not saved)`} delay={0.08}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: isProfit ? "#0D9E6E" : "#D63B3B", letterSpacing: "0.02em" }}>
                      {formatted}
                    </span>
                    <span style={{ fontSize: 12, color: "#64748B", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                      Sum of all P&L below
                    </span>
                  </div>
                </SectionCard>
              );
            })()}

            {/* Screenshot preview + badge */}
            <SectionCard accentColor="#1B5E20" title={`${trades.length} Trades Detected`} subtitle="AI FOUND MULTIPLE TRADES IN YOUR SCREENSHOT" delay={0.1}>
              {trades[0]?.screenshot && (
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>SCREENSHOT PREVIEW</label>
                  <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #E2E8F0", maxWidth: 280, boxShadow: "0 2px 8px rgba(15,25,35,0.07)" }}>
                    <img src={trades[0].screenshot} alt="Trade screenshot" style={{ width: "100%", height: "auto", display: "block" }} />
                  </div>
                </div>
              )}
              <div style={{ background: "linear-gradient(135deg,#ECFDF5,#F0FDF9)", border: "1px solid #A7F3D0", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#0D9E6E", animation: "blink 1.2s ease-in-out infinite", flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "#065F46", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 500 }}>
                  Review each trade below and save them individually.
                </span>
              </div>
            </SectionCard>

            {trades.map((t, idx) => (
              <SectionCard key={idx} accentColor={savedTrades[idx] ? "#0D9E6E" : "#B8860B"} title={`Trade ${idx + 1}: ${t.pair || "Unknown"}`} subtitle={savedTrades[idx] ? "✅ SAVED" : `P&L: ${t.profit || "—"}`} delay={0.1 + idx * 0.08}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <FormInput label="SYMBOL" name="pair" value={t.pair} onChange={e => handleTradeChange(idx, e)} placeholder="e.g. NIFTY 26100 CE" />
                  </div>
                  <FormSelect label="CE / PE" name="optionType" value={t.optionType} onChange={e => handleTradeChange(idx, e)} options={[{ value: "CE", label: "CE" }, { value: "PE", label: "PE" }]} />
                  <FormSelect label="BUY / SELL" name="action" value={t.action} onChange={e => handleTradeChange(idx, e)} options={[{ value: "buy", label: "BUY" }, { value: "sell", label: "SELL" }]} />
                  {isFilled(t.quantity) && <FormInput label="QTY (lots)" name="quantity" value={t.quantity} onChange={e => handleTradeChange(idx, e)} placeholder="e.g. 3" />}
                  {isFilled(t.profit) && <FormInput label="PROFIT / LOSS (₹)" name="profit" value={t.profit} onChange={e => handleTradeChange(idx, e)} placeholder="e.g. 1500 or -500" />}
                  {isFilled(t.entryPrice) && <FormInput label="ENTRY PREMIUM (₹)" name="entryPrice" value={t.entryPrice} onChange={e => handleTradeChange(idx, e)} placeholder="e.g. 85.50" />}
                  {isFilled(t.exitPrice) && <FormInput label="EXIT PREMIUM (₹)" name="exitPrice" value={t.exitPrice} onChange={e => handleTradeChange(idx, e)} placeholder="e.g. 120" />}
                  {isFilled(t.tradeType) && <FormSelect label="TRADE TYPE" name="tradeType" value={t.tradeType} onChange={e => handleTradeChange(idx, e)} options={[{ value: "INTRADAY", label: "Intraday" }, { value: "DELIVERY", label: "Delivery" }, { value: "SWING", label: "Swing" }]} />}
                  <FormSelect
                    label={`STRATEGY${setupsLoading ? " (loading...)" : ""}`}
                    name="strategy"
                    value={t.strategy}
                    onChange={e => handleMultiTradeStrategyChange(idx, e)}
                    options={[
                      { value: "", label: "Select setup..." },
                      ...strategies.filter(s => s.name && s.name.trim().length > 0).map(s => ({ value: s.name, label: s.name })),
                      { value: "Custom", label: "Custom" },
                    ]}
                  />
                  {t.strategy === "Custom" && (
                    <FormInput label="CUSTOM STRATEGY" name="strategyCustom" value={t.strategyCustom} onChange={e => handleTradeChange(idx, e)} placeholder="e.g. My own setup" />
                  )}
                  {isFilled(t.expiryDate) && <FormInput label="EXPIRY DATE" name="expiryDate" value={t.expiryDate} onChange={e => handleTradeChange(idx, e)} placeholder="YYYY-MM-DD" />}
                  {isFilled(t.entryBasis) && <FormSelect label="ENTRY BASIS" name="entryBasis" value={t.entryBasis} onChange={e => handleTradeChange(idx, e)} options={[{ value: "Plan", label: "Rule Based / Plan" }, { value: "Emotion", label: "Emotional" }, { value: "Impulsive", label: "Impulsive" }, { value: "Custom", label: "Custom Basis" }]} />}
                  {isFilled(t.riskRewardRatio) && <FormSelect label="RISK : REWARD" name="riskRewardRatio" value={t.riskRewardRatio} onChange={e => handleTradeChange(idx, e)} options={[{ value: "", label: "Select..." }, { value: "1:1", label: "1:1" }, { value: "1:2", label: "1:2" }, { value: "1:3", label: "1:3" }, { value: "1:4", label: "1:4" }, { value: "1:5", label: "1:5" }]} />}
                  {isFilled(t.setup) && <FormInput label="SETUP / PATTERN" name="setup" value={t.setup} onChange={e => handleTradeChange(idx, e)} placeholder="e.g. Breakout above 26200" />}
                  {isFilled(t.mistakeTag) && <FormSelect label="MISTAKE (if any)" name="mistakeTag" value={t.mistakeTag} onChange={e => handleTradeChange(idx, e)} options={[{ value: "", label: "None" }, { value: "Overtraded", label: "Overtraded" }, { value: "Held too long", label: "Held too long" }, { value: "Exited early", label: "Exited early" }, { value: "Wrong strike", label: "Wrong strike" }, { value: "Revenge trade", label: "Revenge trade" }, { value: "No stop", label: "No stop" }, { value: "Other", label: "Other" }]} />}
                  {isFilled(t.lesson) && <FormInput label="LESSON (one line)" name="lesson" value={t.lesson} onChange={e => handleTradeChange(idx, e)} placeholder="e.g. Never add to a losing position" />}
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>NOTES</label>
                  <textarea name="notes" placeholder="Why you took this trade..." value={t.notes || ""} onChange={e => handleTradeChange(idx, e)} rows={2} style={{ ...inputBase, resize: "vertical", fontFamily: "'Plus Jakarta Sans',sans-serif" }} onFocus={onFocusGreen} onBlur={onBlurReset} />
                </div>
                {/* Setup checklist — only when a strategy is selected */}
                <div style={{ marginBottom: 14 }}>
                  {t.strategy ? (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, gap: 10 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>SETUP CHECKLIST</div>
                            {getSetupQuality(t.setupRules) && (
                              <div style={{ 
                                padding: "2px 8px", 
                                borderRadius: 6, 
                                fontSize: 10, 
                                fontWeight: 800, 
                                fontFamily: "'JetBrains Mono',monospace",
                                color: getSetupQuality(t.setupRules).color,
                                background: getSetupQuality(t.setupRules).bg,
                                border: `1px solid ${getSetupQuality(t.setupRules).color}33`,
                                animation: "fadeUp 0.3s ease both"
                              }}>
                                QUALITY: {getSetupQuality(t.setupRules).label}
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: "#64748B", fontFamily: "'Plus Jakarta Sans',sans-serif", marginTop: 4 }}>Tick the rules you followed for this trade.</div>
                        </div>
                        <button type="button" onClick={() => clearSetupRulesMulti(idx)} style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.08em", padding: "6px 10px", borderRadius: 999, border: "1px solid #E2E8F0", background: "#F8FAFC", color: "#64748B", cursor: "pointer" }}>CLEAR TICKS</button>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {(!t.setupRules || t.setupRules.length === 0) ? (
                          <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>No rules for this setup. Add your own rules below.</div>
                        ) : (
                          (t.setupRules || []).map(rule => (
                            <div key={rule.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 10, background: rule.followed ? "rgba(13,158,110,0.04)" : "transparent", border: "1px solid #E2E8F0" }}>
                              <button type="button" onClick={() => toggleSetupRuleMulti(idx, rule.id)} style={{ width: 18, height: 18, borderRadius: 5, border: rule.followed ? "1.5px solid #0D9E6E" : "1.5px solid #CBD5E1", background: rule.followed ? "linear-gradient(135deg,#0D9E6E,#22C78E)" : "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                                {rule.followed && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.4"><polyline points="20 6 9 17 4 12" /></svg>}
                              </button>
                              <input type="text" value={rule.label || ""} onChange={e => updateSetupRuleLabelMulti(idx, rule.id, e.target.value)} placeholder="Add setup rule..." style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 12, fontFamily: "'Plus Jakarta Sans',sans-serif", color: "#0F1923" }} />
                            </div>
                          ))
                        )}
                      </div>
                      <button type="button" onClick={() => addSetupRuleMulti(idx)} style={{ marginTop: 8, fontSize: 11, fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.08em", color: "#0D9E6E", background: "transparent", border: "none", cursor: "pointer" }}>+ ADD RULE</button>
                    </>
                  ) : (
                    <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Select a setup above to load its checklist, or add your own rules.</div>
                  )}
                </div>
                {/* Save button per trade */}
                <button onClick={() => saveIndianTrade(idx)} disabled={savedTrades[idx]}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 24px", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, letterSpacing: "0.1em", color: "#FFFFFF", background: savedTrades[idx] ? "#0D9E6E" : "linear-gradient(135deg,#0D9E6E,#22C78E)", border: "none", borderRadius: 8, cursor: savedTrades[idx] ? "default" : "pointer", transition: "all 0.25s", boxShadow: savedTrades[idx] ? "none" : "0 3px 12px rgba(13,158,110,0.28)", opacity: savedTrades[idx] ? 0.8 : 1 }}
                >
                  {savedTrades[idx] ? (<><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>SAVED</>) : (<><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>SAVE TRADE {idx + 1}</>)}
                </button>
              </SectionCard>
            ))}

            {/* Error banner */}
            {error && (
              <div style={{ marginBottom: 16, padding: "12px 16px", background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D63B3B" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <span style={{ fontSize: 12, color: "#D63B3B", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 500 }}>{error}</span>
              </div>
            )}

            {/* Re-upload */}
            <div style={{ marginBottom: 20 }}>
              <button onClick={() => { setTrade(null); setTrades([]); setSavedTrades([]); setFile(null); setError(null); setExtractedText(""); }}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 22px", fontSize: 12, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, letterSpacing: "0.1em", color: "#4A5568", background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 10, cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#F0EEE9"; e.currentTarget.style.borderColor = "#CBD5E1"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#F8FAFC"; e.currentTarget.style.borderColor = "#E2E8F0"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.27" /></svg>
                RE-UPLOAD
              </button>
            </div>
          </>
        )}

        {/* ── SINGLE TRADE FORM CARD (Forex or single Indian trade) ── */}
        {trade && !(isInd && trades.length > 1) && (
          <SectionCard accentColor="#0D9E6E" title="Trade Details" subtitle="REVIEW &amp; EDIT EXTRACTED DATA" delay={0.1}>

            {/* Screenshot preview */}
            {trade.screenshot && (
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>SCREENSHOT PREVIEW</label>
                <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #E2E8F0", maxWidth: 280, boxShadow: "0 2px 8px rgba(15,25,35,0.07)" }}>
                  <img src={trade.screenshot} alt="Trade screenshot" style={{ width: "100%", height: "auto", display: "block" }} />
                </div>
              </div>
            )}

            {/* AI extraction notice */}
            <div style={{ background: "linear-gradient(135deg,#ECFDF5,#F0FDF9)", border: "1px solid #A7F3D0", borderRadius: 8, padding: "10px 14px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#0D9E6E", animation: "blink 1.2s ease-in-out infinite", flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "#065F46", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 500 }}>
                AI extracted the data below. Review and edit any fields before saving.
              </span>
            </div>

            {/* Debug: show OCR output when Indian market extraction fails */}
            {isInd && !trade?.pair && extractedText && (
              <details style={{ marginBottom: 20, background: "#FFF8E1", border: "1px solid #FFE082", borderRadius: 8, overflow: "hidden" }}>
                <summary style={{ padding: "10px 14px", fontSize: 11, fontWeight: 600, color: "#F57F17", cursor: "pointer", fontFamily: "'JetBrains Mono',monospace" }}>
                  OCR read this — extraction missed. Edit symbol manually or try a clearer screenshot.
                </summary>
                <pre style={{ margin: 0, padding: 14, fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "#5D4037", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 120, overflow: "auto" }}>{extractedText}</pre>
              </details>
            )}

            {/* Fields grid */}
            <div style={{ display: "grid", gridTemplateColumns: isInd ? "1fr 1fr" : "repeat(auto-fit,minmax(190px,1fr))", gap: 14, marginBottom: 18 }}>
              {isInd ? (
                <>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <FormInput label="SYMBOL" name="pair" value={trade?.pair} onChange={handleChange} placeholder="e.g. NIFTY 26100 CE" />
                  </div>
                  <FormSelect label="CE / PE" name="optionType" value={trade?.optionType} onChange={handleChange} options={[{ value: "CE", label: "CE" }, { value: "PE", label: "PE" }]} />
                  <FormSelect label="BUY / SELL" name="action" value={trade?.action} onChange={handleChange} options={[{ value: "buy", label: "BUY" }, { value: "sell", label: "SELL" }]} />
                  {isFilled(trade?.quantity) && <FormInput label="QTY (lots)" name="quantity" value={trade?.quantity} onChange={handleChange} placeholder="e.g. 3" />}
                  {isFilled(trade?.profit) && <FormInput label="PROFIT / LOSS (₹)" name="profit" value={trade?.profit} onChange={handleChange} placeholder="e.g. 1500 or -500" />}
                  {isFilled(trade?.entryPrice) && <FormInput label="ENTRY PREMIUM (₹)" name="entryPrice" value={trade?.entryPrice} onChange={handleChange} placeholder="e.g. 85.50" />}
                  {isFilled(trade?.exitPrice) && <FormInput label="EXIT PREMIUM (₹)" name="exitPrice" value={trade?.exitPrice} onChange={handleChange} placeholder="e.g. 120" />}
                  {isFilled(trade?.tradeType) && <FormSelect label="TRADE TYPE" name="tradeType" value={trade?.tradeType} onChange={handleChange} options={[{ value: "INTRADAY", label: "Intraday" }, { value: "DELIVERY", label: "Delivery" }, { value: "SWING", label: "Swing" }]} />}
                  <FormSelect
                    label={`STRATEGY${setupsLoading ? " (loading...)" : ""}`}
                    name="strategy"
                    value={trade?.strategy}
                    onChange={handleStrategyChange}
                    options={
                      [
                        { value: "", label: "Select setup..." },
                        ...strategies
                          .filter(s => s.name && s.name.trim().length > 0)
                          .map(s => ({ value: s.name, label: s.name })),
                        { value: "Custom", label: "Custom" },
                      ]
                    }
                  />
                  {trade?.strategy === "Custom" && (
                    <FormInput label="CUSTOM STRATEGY" name="strategyCustom" value={trade?.strategyCustom} onChange={handleChange} placeholder="e.g. My own setup" />
                  )}
                  {isFilled(trade?.expiryDate) && <FormInput label="EXPIRY DATE" name="expiryDate" value={trade?.expiryDate} onChange={handleChange} placeholder="YYYY-MM-DD" />}
                  {(isFilled(trade?.riskRewardRatio) || showCustomRR) && (
                    <>
                      <FormSelect
                        label="RISK : REWARD"
                        name="riskRewardRatio"
                        value={trade?.riskRewardRatio}
                        onChange={(e) => { setShowCustomRR(e.target.value === "custom"); handleChange(e); }}
                        options={[
                          { value: "", label: "Select..." },
                          { value: "1:1", label: "1:1" },
                          { value: "1:1.5", label: "1:1.5" },
                          { value: "1:2", label: "1:2" },
                          { value: "1:3", label: "1:3" },
                          { value: "1:4", label: "1:4" },
                          { value: "1:5", label: "1:5" },
                          { value: "custom", label: "Custom" }
                        ]}
                      />
                      {showCustomRR && (
                        <FormInput label="CUSTOM RR" name="riskRewardCustom" value={trade?.riskRewardCustom} onChange={handleChange} placeholder="e.g. 1:2.5" />
                      )}
                    </>
                  )}
                  {isFilled(trade?.entryBasis) && (
                    <>
                      <FormSelect
                        label="ENTRY BASIS"
                        name="entryBasis"
                        value={trade?.entryBasis}
                        onChange={handleChange}
                        options={[
                          { value: "Plan", label: "Rule Based / Plan" },
                          { value: "Emotion", label: "Emotional" },
                          { value: "Impulsive", label: "Impulsive" },
                          { value: "Custom", label: "Custom Basis" }
                        ]}
                      />
                      {trade?.entryBasis === "Custom" && (
                        <FormInput label="CUSTOM BASIS" name="entryBasisCustom" value={trade?.entryBasisCustom} onChange={handleChange} placeholder="Describe basis..." />
                      )}
                    </>
                  )}
                  {isFilled(trade?.setup) && <FormInput label="SETUP / PATTERN" name="setup" value={trade?.setup} onChange={handleChange} placeholder="e.g. Breakout above 26200" />}
                  {isFilled(trade?.mistakeTag) && <FormSelect label="MISTAKE (if any)" name="mistakeTag" value={trade?.mistakeTag} onChange={handleChange} options={[{ value: "", label: "None" }, { value: "Overtraded", label: "Overtraded" }, { value: "Held too long", label: "Held too long" }, { value: "Exited early", label: "Exited early" }, { value: "Wrong strike", label: "Wrong strike" }, { value: "Revenge trade", label: "Revenge trade" }, { value: "No stop", label: "No stop" }, { value: "Other", label: "Other" }]} />}
                  {isFilled(trade?.lesson) && <FormInput label="LESSON (one line)" name="lesson" value={trade?.lesson} onChange={handleChange} placeholder="e.g. Never add to a losing position" />}
                </>
              ) : (
                <>
                  <FormInput label="TRADING PAIR" name="pair" value={trade?.pair} onChange={handleChange} placeholder="e.g. USDCAD" />
                  <FormSelect label="ACTION" name="action" value={trade?.action} onChange={handleChange} options={[{ value: "buy", label: "Buy (Long)" }, { value: "sell", label: "Sell (Short)" }]} />
                  {isFilled(trade?.lotSize) && <FormInput label="LOT SIZE" name="lotSize" value={trade?.lotSize} onChange={handleChange} placeholder="0.01" />}
                  {isFilled(trade?.entryPrice) && <FormInput label="ENTRY PRICE" name="entryPrice" value={trade?.entryPrice} onChange={handleChange} placeholder="1.2345" />}
                  {isFilled(trade?.exitPrice) && <FormInput label="EXIT PRICE" name="exitPrice" value={trade?.exitPrice} onChange={handleChange} placeholder="1.2365" />}
                  {isFilled(trade?.profit) && <FormInput label="PROFIT" name="profit" value={trade?.profit} onChange={handleChange} placeholder="+20.00" />}
                  {isFilled(trade?.stopLoss) && <FormInput label="STOP LOSS" name="stopLoss" value={trade?.stopLoss} onChange={handleChange} placeholder="1.2300" />}
                  {isFilled(trade?.takeProfit) && <FormInput label="TAKE PROFIT" name="takeProfit" value={trade?.takeProfit} onChange={handleChange} placeholder="1.2400" />}
                  {isFilled(trade?.commission) && <FormInput label="COMMISSION" name="commission" value={trade?.commission} onChange={handleChange} placeholder="2.50" />}
                  {isFilled(trade?.swap) && <FormInput label="SWAP" name="swap" value={trade?.swap} onChange={handleChange} placeholder="0.00" />}
                  {isFilled(trade?.balance) && <FormInput label="BALANCE" name="balance" value={trade?.balance} onChange={handleChange} placeholder="1000.00" />}
                  {isFilled(trade?.session) && <FormSelect label="SESSION" name="session" value={trade?.session} onChange={handleChange} options={[{ value: "Asian", label: "Asian" }, { value: "London", label: "London" }, { value: "New York", label: "New York" }]} />}
                  <FormSelect
                    label={`STRATEGY${setupsLoading ? " (loading...)" : ""}`}
                    name="strategy"
                    value={trade?.strategy}
                    onChange={handleStrategyChange}
                    options={
                      [
                        { value: "", label: "Select setup..." },
                        ...strategies
                          .filter(s => s.name && s.name.trim().length > 0)
                          .map(s => ({ value: s.name, label: s.name })),
                        { value: "Custom", label: "Custom" },
                      ]
                    }
                  />
                  {(isFilled(trade?.riskRewardRatio) || showCustomRR) && (
                    <>
                      <FormSelect
                        label="RISK : REWARD"
                        name="riskRewardRatio"
                        value={trade?.riskRewardRatio}
                        onChange={(e) => { setShowCustomRR(e.target.value === "custom"); handleChange(e); }}
                        options={[{ value: "", label: "Select..." }, { value: "1:1", label: "1:1" }, { value: "1:2", label: "1:2" }, { value: "1:3", label: "1:3" }, { value: "1:4", label: "1:4" }, { value: "1:5", label: "1:5" }, { value: "custom", label: "Custom" }]}
                      />
                      {showCustomRR && (
                        <FormInput label="CUSTOM RR" name="riskRewardCustom" value={trade?.riskRewardCustom} onChange={handleChange} placeholder="e.g. 1:2.5" />
                      )}
                    </>
                  )}
                  {(isFilled(trade?.entryBasis) || trade?.entryBasis === "Custom") && (
                    <>
                      <FormSelect
                        label="ENTRY BASIS"
                        name="entryBasis"
                        value={trade?.entryBasis}
                        onChange={handleChange}
                        options={[{ value: "Plan", label: "Rule Based / Plan" }, { value: "Emotion", label: "Emotional" }, { value: "Impulsive", label: "Impulsive" }, { value: "Custom", label: "Custom Basis" }]}
                      />
                      {trade?.entryBasis === "Custom" && (
                        <FormInput label="CUSTOM BASIS" name="entryBasisCustom" value={trade?.entryBasisCustom} onChange={handleChange} placeholder="Describe basis..." />
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Setup checklist — only when a strategy is selected */}
            <div style={{ marginBottom: 20 }}>
              {trade?.strategy ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, gap: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>
                          SETUP CHECKLIST
                        </div>
                        {getSetupQuality(setupRules) && (
                          <div style={{ 
                            padding: "2px 8px", 
                            borderRadius: 6, 
                            fontSize: 10, 
                            fontWeight: 800, 
                            fontFamily: "'JetBrains Mono',monospace",
                            color: getSetupQuality(setupRules).color,
                            background: getSetupQuality(setupRules).bg,
                            border: `1px solid ${getSetupQuality(setupRules).color}33`,
                            animation: "fadeUp 0.3s ease both"
                          }}>
                            QUALITY: {getSetupQuality(setupRules).label}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748B", fontFamily: "'Plus Jakarta Sans',sans-serif", marginTop: 4 }}>
                        Tick the rules you actually followed on this trade.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearSetupRules}
                      style={{
                        fontSize: 10,
                        fontFamily: "'JetBrains Mono',monospace",
                        letterSpacing: "0.08em",
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: "1px solid #E2E8F0",
                        background: "#F8FAFC",
                        color: "#64748B",
                        cursor: "pointer",
                      }}
                    >
                      CLEAR TICKS
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {setupRules.length === 0 ? (
                      <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                        No rules for this setup. Add your own rules below.
                      </div>
                    ) : (
                      setupRules.map(rule => (
                        <div
                          key={rule.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 10px",
                            borderRadius: 10,
                            background: rule.followed ? "rgba(13,158,110,0.04)" : "transparent",
                            border: "1px solid #E2E8F0",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSetupRule(rule.id)}
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 5,
                              border: rule.followed ? "1.5px solid #0D9E6E" : "1.5px solid #CBD5E1",
                              background: rule.followed ? "linear-gradient(135deg,#0D9E6E,#22C78E)" : "#FFFFFF",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              flexShrink: 0,
                            }}
                          >
                            {rule.followed && (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.4">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                          <input
                            type="text"
                            value={rule.label}
                            onChange={e => updateSetupRuleLabel(rule.id, e.target.value)}
                            placeholder="Add setup rule..."
                            style={{
                              flex: 1,
                              border: "none",
                              outline: "none",
                              background: "transparent",
                              fontSize: 12,
                              fontFamily: "'Plus Jakarta Sans',sans-serif",
                              color: "#0F1923",
                            }}
                          />
                        </div>
                      ))
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={addSetupRule}
                    style={{
                      marginTop: 8,
                      fontSize: 11,
                      fontFamily: "'JetBrains Mono',monospace",
                      letterSpacing: "0.08em",
                      color: "#0D9E6E",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    + ADD RULE
                  </button>
                </>
              ) : (
                <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                  Select a setup above to load its checklist, or add your own rules.
                </div>
              )}
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 22 }}>
              <label style={labelStyle}>NOTES</label>
              <textarea
                name="notes"
                placeholder={isInd ? "Why you took this options trade, context, emotions..." : "Trade observations, emotions, lessons..."}
                value={trade?.notes || ""}
                onChange={handleChange}
                rows={4}
                onFocus={e => {
                  e.currentTarget.style.borderColor = "#0D9E6E";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(13,158,110,0.10)";
                  e.currentTarget.style.background = "#F0FDF9";
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = "#E2E8F0";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.background = "#F8FAFC";
                }}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  fontSize: 13,
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  color: "#0F1923",
                  background: "#F8FAFC",
                  border: "1.5px solid #E2E8F0",
                  borderRadius: 8,
                  outline: "none",
                  resize: "vertical",
                  transition: "all 0.2s ease"
                }}
              />
            </div>

            {/* Error banner (form level) */}
            {error && (
              <div style={{ marginBottom: 16, padding: "12px 16px", background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D63B3B" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <span style={{ fontSize: 12, color: "#D63B3B", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 500 }}>{error}</span>
              </div>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: "#F1F5F9", margin: "4px 0 18px" }} />

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>

              {/* Save */}
              <button onClick={saveTrade}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "12px 28px", fontSize: 12, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, letterSpacing: "0.12em", color: "#FFFFFF", background: saved ? "#0D9E6E" : "linear-gradient(135deg,#0D9E6E,#22C78E)", border: "none", borderRadius: 10, cursor: "pointer", transition: "all 0.25s ease", boxShadow: "0 4px 16px rgba(13,158,110,0.30)", position: "relative", overflow: "hidden" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(13,158,110,0.40)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(13,158,110,0.30)"; }}
              >
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.14) 50%,transparent 60%)", animation: "shimmer 2.5s linear infinite" }} />
                {saved ? (
                  <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>SAVED! REDIRECTING...</>
                ) : (
                  <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>SAVE TRADE</>
                )}
              </button>

              {/* Re-upload */}
              <button onClick={() => { setTrade(null); setTrades([]); setSavedTrades([]); setFile(null); setError(null); setExtractedText(""); }}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 22px", fontSize: 12, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, letterSpacing: "0.1em", color: "#4A5568", background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 10, cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#F0EEE9"; e.currentTarget.style.borderColor = "#CBD5E1"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#F8FAFC"; e.currentTarget.style.borderColor = "#E2E8F0"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.27" /></svg>
                RE-UPLOAD
              </button>
            </div>
          </SectionCard>
        )}
      </main>

      <style>{`
        @keyframes blink   { 0%,100%{opacity:1}  50%{opacity:0.2} }
        @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
        @keyframes ticker  { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing:border-box; margin:0; padding:0; }
        a:hover { opacity:0.9; }
        input::placeholder, textarea::placeholder { color:#CBD5E1; font-family:'JetBrains Mono',monospace; font-size:12px; }
        @media (max-width: 640px) { main { padding: 16px 12px !important; } }
      `}</style>
    </div>
  );
}

export default function UploadTrade() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading extractor...</div>}>
      <UploadTradeContent />
    </Suspense>
  );
}