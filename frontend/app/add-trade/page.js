"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { createTrade } from "@/services/tradeApi";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMarket, MARKETS } from "@/context/MarketContext";
import InstallPWA from "@/components/InstallPWA";
import { fetchSetups } from "@/services/setupApi";

function AddTradePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentMarket, getCurrencySymbol, isIndianMarket } = useMarket();
  const fileInputRef = useRef(null);

  const theme = {
    bull: "#0D9E6E",
    bear: "#D63B3B",
    primary: "#0D9E6E",
    secondary: "#0F1923",
    muted: "#94A3B8",
    border: "#E2E8F0",
    bg: "#F0EEE9",
    card: "#FFFFFF"
  };

  // Get market from query param or context
  const marketType = searchParams.get('market') || currentMarket;

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  const [trade, setTrade] = useState({
    pair: "",
    type: "BUY",
    lotSize: "",
    entryPrice: "",
    exitPrice: "",
    stopLoss: "",
    takeProfit: "",
    profit: "",
    commission: "",
    swap: "",
    balance: "",
    strategy: "",
    strategyCustom: "",
    session: "",
    notes: "",
    riskRewardRatio: "",
    riskRewardCustom: "",
    screenshot: "",
    // Indian Market Fields
    segment: "Equity",
    instrumentType: "EQUITY",
    quantity: "",
    strikePrice: "",
    expiryDate: "",
    tradeType: "INTRADAY",
    brokerage: "",
    sttTaxes: "",
    entryBasis: "Plan",
    entryBasisCustom: "",
  });

  const [showCustomRR, setShowCustomRR] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [strategies, setStrategies] = useState([]);
  const [setupsLoading, setSetupsLoading] = useState(false);
  const [setupRules, setSetupRules] = useState([]);

  useEffect(() => {
    // Automatic session detection based on current time
    const now = new Date();
    const hour = now.getUTCHours();

    if (isIndianMarket) {
      // Indian Market (NSE/BSE) typically 9:15 AM - 3:30 PM IST
      // Simplified session detection could be added here if needed
      setTrade(prev => ({ ...prev, session: "Morning Session" }));
    } else {
      let detectedSession = "Asian";
      if (hour >= 8 && hour < 13) detectedSession = "London";
      else if (hour >= 13 && hour < 21) detectedSession = "New York";
      setTrade(prev => ({ ...prev, session: detectedSession }));
    }
  }, [isIndianMarket]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "riskRewardRatio") {
      setShowCustomRR(value === "custom");
    }
    if (name === "entryBasis") {
      setTrade(prev => ({ ...prev, entryBasisCustom: value === "Custom" ? prev.entryBasisCustom : "" }));
    }
    setTrade(prev => ({ ...prev, [name]: value }));
  };

  // Load saved setups/strategies for current market
  useEffect(() => {
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
  }, [marketType]);

  const handleStrategyChange = (e) => {
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
      setSetupRules([]);
    }
  };

  const toggleSetupRule = (id) => {
    setSetupRules(prev => prev.map(r => (r.id === id ? { ...r, followed: !r.followed } : r)));
  };

  const updateSetupRuleLabel = (id, value) => {
    setSetupRules(prev => prev.map(r => (r.id === id ? { ...r, label: value } : r)));
  };

  const addSetupRule = () => {
    setSetupRules(prev => [
      ...prev,
      { id: (prev[prev.length - 1]?.id || 0) + 1, label: "", followed: false },
    ]);
  };

  const clearSetupRules = () => {
    setSetupRules(prev => prev.map(r => ({ ...r, followed: false })));
  };

  const handleScreenshotChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setScreenshotPreview(reader.result);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setTrade(prev => ({ ...prev, screenshot: data.url }));
      } else {
        alert("Failed to upload screenshot");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload screenshot");
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!trade.pair) {
      alert(`Please enter a ${isIndianMarket ? "Symbol" : "Pair"}`);
      return;
    }

    const tradeData = {
      pair: trade.pair,
      type: trade.type.toUpperCase(),
      entryPrice: trade.entryPrice ? parseFloat(trade.entryPrice) : undefined,
      exitPrice: trade.exitPrice ? parseFloat(trade.exitPrice) : undefined,
      stopLoss: trade.stopLoss ? parseFloat(trade.stopLoss) : undefined,
      takeProfit: trade.takeProfit ? parseFloat(trade.takeProfit) : undefined,
      profit: trade.profit ? parseFloat(trade.profit) : undefined,
      balance: trade.balance ? parseFloat(trade.balance) : undefined,
      session: trade.session || undefined,
      strategy: trade.strategy === "Custom" ? (trade.strategyCustom?.trim() || "Custom") : (trade.strategy || undefined),
      notes: trade.notes || undefined,
      riskRewardRatio: trade.riskRewardRatio || undefined,
      riskRewardCustom: trade.riskRewardCustom || undefined,
      screenshot: trade.screenshot || undefined,
      // Forex specific
      lotSize: !isIndianMarket && trade.lotSize ? parseFloat(trade.lotSize) : undefined,
      commission: !isIndianMarket && trade.commission ? parseFloat(trade.commission) : undefined,
      swap: !isIndianMarket && trade.swap ? parseFloat(trade.swap) : undefined,
      // Indian Market specific
      segment: isIndianMarket ? trade.segment : undefined,
      instrumentType: isIndianMarket ? trade.instrumentType : undefined,
      strikePrice: isIndianMarket && trade.strikePrice ? parseFloat(trade.strikePrice) : undefined,
      expiryDate: isIndianMarket && trade.expiryDate ? trade.expiryDate : undefined,
      quantity: isIndianMarket && trade.quantity ? parseFloat(trade.quantity) : undefined,
      tradeType: isIndianMarket ? trade.tradeType : undefined,
      brokerage: isIndianMarket && trade.brokerage ? parseFloat(trade.brokerage) : undefined,
      sttTaxes: isIndianMarket && trade.sttTaxes ? parseFloat(trade.sttTaxes) : undefined,
      entryBasis: trade.entryBasis || "Plan",
      entryBasisCustom: trade.entryBasis === "Custom" ? trade.entryBasisCustom : undefined,
    };

    const activeRules = setupRules.filter(r => r.label && r.label.trim().length > 0);
    const followedCount = activeRules.filter(r => r.followed).length;
    const setupScore = activeRules.length > 0 ? Math.round((followedCount / activeRules.length) * 100) : null;
    tradeData.setupRules = activeRules.map(({ label, followed }) => ({ label: label.trim(), followed }));
    tradeData.setupScore = setupScore;

    try {
      const result = await createTrade(tradeData, marketType);
      if (result && result._id) {
        alert("Trade saved successfully!");
        router.push(marketType === MARKETS.INDIAN_MARKET ? "/indian-market/dashboard" : "/dashboard");
      } else {
        throw new Error(result?.message || "Failed to save trade");
      }
    } catch (err) {
      console.error("Save error:", err);
      alert(err.message || "Failed to save trade. Please try again.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, fontFamily: "'Plus Jakarta Sans',sans-serif", color: theme.secondary }}>
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 24px", minHeight: 60, flexWrap: "wrap", gap: 10,
        background: theme.card,
        backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${theme.border}`,
        boxShadow: "0 1px 12px rgba(15,25,35,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href={isIndianMarket ? "/indian-market/dashboard" : "/dashboard"} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}><img src="/logo.png" alt="Stratedge" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
            <div>
              <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 800, letterSpacing: "0.04em", color: theme.secondary, lineHeight: 1 }}>
                STRATEDGE
              </div>
              <div style={{ fontSize: 9, letterSpacing: "0.18em", color: isIndianMarket ? "#1B5E20" : theme.primary, marginTop: 1, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>
                {isIndianMarket ? "OPTIONS JOURNAL · NSE" : "FOREX AI JOURNAL"}
              </div>
            </div>
          </Link>
        </div>

        <nav style={{ display: "flex", gap: 6 }}>
          {(isIndianMarket ? [
            { href: "/indian-market/trades", label: "Journal" },
            { href: "/indian-market/add-trade", label: "Log Option" },
            { href: "/indian-market/analytics", label: "Analytics" },
            { href: "/weekly-reports?market=Indian_Market", label: "Weekly AI" },
          ] : [
            { href: "/trades", label: "Journal" },
            { href: "/add-trade", label: "Log Trade" },
            { href: "/analytics", label: "Analytics" },
            { href: "/weekly-reports?market=Forex", label: "Weekly AI" },
          ]).map(n => (
            <Link key={n.href} href={n.href} style={{
              fontSize: 11,
              color: theme.primary,
              fontWeight: 600,
              textDecoration: "none",
              padding: "6px 12px",
              borderRadius: 999,
              transition: "all 0.15s",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              background: "rgba(13,158,110,0.05)",
              border: "1px solid rgba(13,158,110,0.2)"
            }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(13,158,110,0.15)";
                e.currentTarget.style.borderColor = "rgba(13,158,110,0.5)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(13,158,110,0.05)";
                e.currentTarget.style.borderColor = "rgba(13,158,110,0.2)";
              }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <InstallPWA />
          <button
            onClick={() => {
              localStorage.removeItem("token");
              router.push("/login");
            }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(214,59,59,0.1)", border: "1px solid rgba(214,59,59,0.3)",
              borderRadius: 6, padding: "6px 12px",
              cursor: "pointer", fontSize: 10, letterSpacing: "0.1em",
              color: theme.bear, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600,
              transition: "all 0.2s",
            }}
          >
            LOGOUT
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "40px 24px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4, color: theme.secondary }}>
          Log New <span style={{ color: isIndianMarket ? '#1B5E20' : theme.primary }}>{isIndianMarket ? "Indian Trade" : "Forex Trade"}</span>
        </h1>
        <p style={{ fontSize: 12, color: theme.muted, marginBottom: 32, fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.06em" }}>
          {isIndianMarket ? "NSE / BSE / F&O MARKET ENTRY" : "GLOBAL CURRENCY MARKET ENTRY"}
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Market-Specific Fields First */}
            {isIndianMarket && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Segment</label>
                  <select name="segment" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} onChange={handleChange} value={trade.segment}>
                    <option value="Equity">Equity (Cash)</option>
                    <option value="F&O">F&O (Derivatives)</option>
                    <option value="Commodity">Commodity</option>
                    <option value="Currency">Currency (India)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Trade Type</label>
                  <select name="tradeType" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} onChange={handleChange} value={trade.tradeType}>
                    <option value="INTRADAY">Intraday</option>
                    <option value="DELIVERY">Delivery/Swing</option>
                  </select>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Instrument</label>
                  <select name="instrumentType" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} onChange={handleChange} value={trade.instrumentType}>
                    <option value="EQUITY">Equity</option>
                    <option value="FUTURE">Future</option>
                    <option value="OPTION">Option</option>
                  </select>
                </div>
              </div>
            )}

            {/* Core Fields */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>{isIndianMarket ? "Symbol" : "Pair"}</label>
              <input name="pair" placeholder={isIndianMarket ? "e.g. RELIANCE" : "e.g. XAUUSD"} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} onChange={handleChange} value={trade.pair} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Action</label>
                <select name="type" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} onChange={handleChange} value={trade.type}>
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>{isIndianMarket ? "Quantity" : "Lot Size"}</label>
                <input name={isIndianMarket ? "quantity" : "lotSize"} placeholder={isIndianMarket ? "100" : "0.01"} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} onChange={handleChange} value={isIndianMarket ? trade.quantity : trade.lotSize} />
              </div>
            </div>

            {/* Price Fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Entry Price</label>
                <input name="entryPrice" type="number" step="0.00001" placeholder="0.00" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} onChange={handleChange} value={trade.entryPrice} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Exit Price</label>
                <input name="exitPrice" type="number" step="0.00001" placeholder="0.00" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} onChange={handleChange} value={trade.exitPrice} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Net Profit ({getCurrencySymbol()})</label>
              <input name="profit" type="number" step="0.01" placeholder="0.00" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14, fontWeight: 700, color: trade.profit >= 0 ? theme.bull : theme.bear }} onChange={handleChange} value={trade.profit} />
            </div>

            {/* Conditional F&O Fields */}
            {isIndianMarket && (trade.instrumentType === "OPTION" || trade.instrumentType === "FUTURE") && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Strike Price</label>
                  <input name="strikePrice" type="number" placeholder="e.g. 22000" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} onChange={handleChange} value={trade.strikePrice} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Expiry Date</label>
                  <input type="date" name="expiryDate" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} onChange={handleChange} value={trade.expiryDate} />
                </div>
              </div>
            )}

            {/* Risk Management */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Stop Loss</label>
                <input name="stopLoss" type="number" step="0.00001" placeholder="0.00" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} onChange={handleChange} value={trade.stopLoss} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Take Profit</label>
                <input name="takeProfit" type="number" step="0.00001" placeholder="0.00" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} onChange={handleChange} value={trade.takeProfit} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>RR Ratio</label>
              <select name="riskRewardRatio" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} onChange={handleChange} value={trade.riskRewardRatio}>
                <option value="">Select Ratio</option>
                <option value="1:1">1:1</option>
                <option value="1:2">1:2</option>
                <option value="1:3">1:3</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {/* Cost Fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {isIndianMarket ? (
                <>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Brokerage</label>
                    <input name="brokerage" type="number" step="0.01" placeholder="₹20" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} onChange={handleChange} value={trade.brokerage} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>STT & Other Taxes</label>
                    <input name="sttTaxes" type="number" step="0.01" placeholder="₹15" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} onChange={handleChange} value={trade.sttTaxes} />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Commission</label>
                    <input name="commission" type="number" step="0.01" placeholder="0.00" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} onChange={handleChange} value={trade.commission} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Swap</label>
                    <input name="swap" type="number" step="0.01" placeholder="0.00" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} onChange={handleChange} value={trade.swap} />
                  </div>
                </>
              )}
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>
                Strategy / Setup{setupsLoading ? " (loading...)" : ""}
              </label>
              <select
                name="strategy"
                style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }}
                onChange={handleStrategyChange}
                value={trade.strategy}
              >
                <option value="">Select setup...</option>
                {strategies
                  .filter(s => s.name && s.name.trim().length > 0)
                  .map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                <option value="Custom">Custom</option>
              </select>
              {trade.strategy === "Custom" && (
                <input
                  name="strategyCustom"
                  placeholder="Enter setup name"
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14, marginTop: 8 }}
                  onChange={handleChange}
                  value={trade.strategyCustom}
                />
              )}
            </div>

            {/* Setup checklist */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted }}>Setup checklist</label>
                <button
                  type="button"
                  onClick={clearSetupRules}
                  style={{ background: "transparent", border: "none", color: theme.muted, fontSize: 11, cursor: "pointer", fontWeight: 700 }}
                >
                  Clear ticks
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {setupRules.length === 0 ? (
                  <div style={{ fontSize: 13, color: theme.muted }}>
                    Select a setup above to load its checklist, or add your own rules.
                  </div>
                ) : (
                  setupRules.map(rule => (
                    <div key={rule.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card }}>
                      <button
                        type="button"
                        onClick={() => toggleSetupRule(rule.id)}
                        style={{
                          width: 20, height: 20, borderRadius: 6,
                          border: rule.followed ? `1.5px solid ${theme.primary}` : "1.5px solid #CBD5E1",
                          background: rule.followed ? `linear-gradient(135deg, ${theme.primary}, #22C78E)` : "#FFFFFF",
                          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                        }}
                      >
                        {rule.followed && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.8">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                      <input
                        type="text"
                        value={rule.label}
                        onChange={e => updateSetupRuleLabel(rule.id, e.target.value)}
                        placeholder="Add setup rule..."
                        style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, flex: 1 }}
                      />
                    </div>
                  ))
                )}
              </div>
              <button
                type="button"
                onClick={addSetupRule}
                style={{ background: "transparent", border: "none", color: theme.primary, fontSize: 12, fontWeight: 800, marginTop: 12, cursor: "pointer" }}
              >
                + Add rule
              </button>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Entry Basis</label>
              <select name="entryBasis" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} onChange={handleChange} value={trade.entryBasis}>
                <option value="Plan">Rule Based / Plan</option>
                <option value="Emotion">Emotional</option>
                <option value="Impulsive">Impulsive</option>
                <option value="Custom">Custom Basis</option>
              </select>
            </div>

            {trade.entryBasis === "Custom" && (
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Custom Basis Detail</label>
                <input name="entryBasisCustom" placeholder="Describe basis..." style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} onChange={handleChange} value={trade.entryBasisCustom} />
              </div>
            )}
            
            {/* Screenshot & Notes Section */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Visual Evidence</label>
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleScreenshotChange} className="hidden" style={{ display: "none" }} />
              <div onClick={triggerFileInput} style={{ border: `2px dashed ${theme.border}`, borderRadius: 12, padding: 32, textAlign: "center", cursor: "pointer", background: "rgba(255,255,255,0.5)" }}>
                {screenshotPreview ? (
                  <div>
                    <img src={screenshotPreview} alt="Trade Evidence" style={{ maxHeight: 200, margin: "0 auto", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                    <p style={{ fontSize: 10, color: theme.muted, fontWeight: 700, marginTop: 12 }}>CLICK TO UPDATE</p>
                  </div>
                ) : (
                  <div>
                    <div style={{ width: 40, height: 40, background: theme.bg, borderRadius: 20, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.muted} strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                    </div>
                    <p style={{ fontSize: 13, color: theme.secondary, fontWeight: 600 }}>{uploading ? "Uploading..." : "Drop trade screenshot here"}</p>
                    <p style={{ fontSize: 10, color: theme.muted, marginTop: 4 }}>PNG, JPG up to 10MB</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Trade Execution Notes</label>
              <textarea name="notes" placeholder="Describe your thought process, emotions, and execution details..." style={{ width: "100%", padding: "16px", borderRadius: 12, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14, minHeight: 120, resize: "vertical" }} onChange={handleChange} value={trade.notes} />
            </div>

          </div>

          <button type="submit" disabled={uploading} style={{
            width: "100%", padding: "18px", borderRadius: 14, border: "none", cursor: uploading ? "not-allowed" : "pointer",
            background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`, color: "#fff",
            fontSize: 13, fontWeight: 800, letterSpacing: "0.08em", marginTop: 16
          }}>
            {uploading ? "SYNCING..." : "COMMIT TRADE TO DASHBOARD"}
          </button>
        </form>
      </main>
    </div>
  );
}
export default function AddTradePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading form...</div>}>
      <AddTradePageContent />
    </Suspense>
  );
}
