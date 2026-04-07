"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createTrade } from "@/services/tradeApi";
import Link from "next/link";
import { MARKETS } from "@/context/MarketContext";
import MarketSwitcher from "@/components/MarketSwitcher";
import { fetchSetups } from "@/services/setupApi";

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

const UNDERLYINGS = ["NIFTY", "BANK NIFTY", "FIN NIFTY", "MIDCPNIFTY", "SENSEX", "BANKEX", "Other"];
const LOT_SIZES = { "NIFTY": 25, "BANK NIFTY": 15, "FIN NIFTY": 25, "MIDCPNIFTY": 50, "SENSEX": 10, "BANKEX": 15, "Other": 1 };

export default function IndianOptionsAddTradePage() {
  const router = useRouter();
  const [trade, setTrade] = useState({
    underlying: "NIFTY",
    underlyingOther: "",
    strikePrice: "",
    optionType: "CE",
    type: "BUY",
    quantity: "",
    profit: "",
    entryPrice: "",
    exitPrice: "",
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
    mood: null,
    confidence: "",
    emotionalTags: [],
    wouldRetake: ""
  });
  const [loading, setLoading] = useState(false);
  const [strategies, setStrategies] = useState([]);
  const [setupsLoading, setSetupsLoading] = useState(false);
  const [setupRules, setSetupRules] = useState([]);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) router.push("/login");
  }, [router]);

  // Load saved setups/strategies for Indian market
  useEffect(() => {
    let cancelled = false;
    const loadSetups = async () => {
      try {
        setSetupsLoading(true);
        const serverStrategies = await fetchSetups(MARKETS.INDIAN_MARKET);
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
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTrade((prev) => ({ ...prev, [name]: value }));
  };

  const handleStrategyChange = (e) => {
    const value = e.target.value;
    setTrade(prev => ({ ...prev, strategy: value }));
    const selected = strategies.find(s => s.name === value);
    if (selected && Array.isArray(selected.rules) && selected.rules.length) {
      setSetupRules(selected.rules.map((r, idx) => ({ id: r.id ?? idx + 1, label: r.label || "", followed: false })));
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
    setSetupRules(prev => [...prev, { id: (prev[prev.length - 1]?.id || 0) + 1, label: "", followed: false }]);
  };
  const clearSetupRules = () => {
    setSetupRules(prev => prev.map(r => ({ ...r, followed: false })));
  };

  const getUnderlyingLabel = () => trade.underlying === "Other" ? trade.underlyingOther : trade.underlying;
  const getLotSize = () => LOT_SIZES[trade.underlying] || 1;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const underlyingLabel = getUnderlyingLabel();
    if (!underlyingLabel?.trim()) {
      alert("Select or enter underlying (e.g. NIFTY).");
      return;
    }
    const strike = trade.strikePrice?.trim();
    if (!strike || isNaN(parseFloat(strike))) {
      alert("Enter strike price.");
      return;
    }
    const qty = trade.quantity?.trim();
    if (!qty || isNaN(parseFloat(qty)) || parseFloat(qty) <= 0) {
      alert("Enter quantity (lots).");
      return;
    }
    const pnl = trade.profit?.trim();
    if (pnl === "" || pnl === undefined) {
      alert("Enter profit or loss (₹).");
      return;
    }

    const pair = `${underlyingLabel.trim()} ${strike} ${trade.optionType}`;
    const tradeData = {
      pair,
      underlying: underlyingLabel.trim(),
      strikePrice: parseFloat(strike),
      optionType: trade.optionType,
      type: trade.type,
      quantity: parseFloat(qty),
      lotSize: getLotSize(),
      profit: parseFloat(pnl),
      entryPrice: trade.entryPrice ? parseFloat(trade.entryPrice) : undefined,
      exitPrice: trade.exitPrice ? parseFloat(trade.exitPrice) : undefined,
      tradeType: trade.tradeType || "INTRADAY",
      strategy: trade.strategy === "Custom" ? (trade.strategyCustom?.trim() || "Custom") : (trade.strategy || undefined),
      expiryDate: trade.expiryDate || undefined,
      riskRewardRatio: trade.riskRewardRatio || "",
      riskRewardCustom: trade.riskRewardCustom || "",
      entryBasis: trade.entryBasis || "Plan",
      entryBasisCustom: trade.entryBasis === "Custom" ? trade.entryBasisCustom : "",
      notes: trade.notes || undefined,
      setup: trade.setup || undefined,
      mistakeTag: trade.mistakeTag || undefined,
      lesson: trade.lesson || undefined,
      brokerage: trade.brokerage ? parseFloat(trade.brokerage) : undefined,
      sttTaxes: trade.sttTaxes ? parseFloat(trade.sttTaxes) : undefined,
      mood: trade.mood ?? undefined,
      confidence: trade.confidence || undefined,
      emotionalTags: Array.isArray(trade.emotionalTags) ? trade.emotionalTags : undefined,
      wouldRetake: trade.wouldRetake || undefined
    };

    const activeRules = setupRules.filter(r => r.label && r.label.trim().length > 0);
    const followedCount = activeRules.filter(r => r.followed).length;
    const setupScore = activeRules.length > 0 ? Math.round((followedCount / activeRules.length) * 100) : null;
    tradeData.setupRules = activeRules.map(({ label, followed }) => ({ label: label.trim(), followed }));
    tradeData.setupScore = setupScore;

    setLoading(true);
    try {
      const result = await createTrade(tradeData, MARKETS.INDIAN_MARKET);
      if (result?._id) {
        alert("Trade saved!");
        router.push("/indian-market/dashboard");
      } else {
        throw new Error(result?.message || "Failed to save");
      }
    } catch (err) {
      alert(err.message || "Failed to save.");
    } finally {
      setLoading(false);
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
          <Link href="/indian-market/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 168, height: 48, position: "relative", display: "flex", alignItems: "center", justifyContent: "flex-start" }}><img src="/mainlogo1.png" alt="Edgecipline" style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "left center" }} /></div>
            <div>
              <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 800, letterSpacing: "0.04em", color: theme.secondary, lineHeight: 1 }}>
                {""}
              </div>
              <div style={{ fontSize: 9, letterSpacing: "0.18em", color: "#1B5E20", marginTop: 1, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>
                OPTIONS JOURNAL · NSE
              </div>
            </div>
          </Link>
        </div>

        <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { href: "/indian-market/trades", label: "Journal" },
            { href: "/indian-market/add-trade", label: "Log Option" },
            { href: "/indian-market/analytics", label: "Analytics" },
            { href: "/weekly-reports?market=Indian_Market", label: "Weekly AI" },
          ].map(n => (
            <Link
              key={n.href}
              href={n.href}
              style={{
                fontSize: 13,
                color: theme.primary,
                fontWeight: 700,
                textDecoration: "none",
                padding: "10px 16px",
                borderRadius: 999,
                transition: "all 0.2s",
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                background: "rgba(13,158,110,0.08)",
                border: "1.5px solid rgba(13,158,110,0.25)",
                minHeight: "44px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(13,158,110,0.18)";
                e.currentTarget.style.borderColor = "rgba(13,158,110,0.6)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(13,158,110,0.08)";
                e.currentTarget.style.borderColor = "rgba(13,158,110,0.25)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <MarketSwitcher currentMarket={MARKETS.INDIAN_MARKET} />
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
          Log New <span style={{ color: '#1B5E20' }}>Options Trade</span>
        </h1>
        <p style={{ fontSize: 12, color: theme.muted, marginBottom: 32, fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.06em" }}>
          NSE / BSE F&O MARKET ENTRY
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Underlying</label>
              <select name="underlying" value={trade.underlying} onChange={handleChange} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }}>
                {UNDERLYINGS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            {trade.underlying === "Other" && (
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Symbol</label>
                <input name="underlyingOther" placeholder="e.g. RELIANCE" value={trade.underlyingOther} onChange={handleChange} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} />
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Strike (₹)</label>
              <input name="strikePrice" placeholder="e.g. 26100" value={trade.strikePrice} onChange={handleChange} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>CE / PE</label>
                <select name="optionType" value={trade.optionType} onChange={handleChange} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }}>
                  <option value="CE">CE</option>
                  <option value="PE">PE</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>BUY / SELL</label>
                <select name="type" value={trade.type} onChange={handleChange} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }}>
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Qty (lots)</label>
              <input name="quantity" type="number" min="1" placeholder="e.g. 3" value={trade.quantity} onChange={handleChange} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Profit / Loss (₹)</label>
              <input name="profit" type="number" placeholder="e.g. 1500 or -500" value={trade.profit} onChange={handleChange} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14, fontWeight: 600 }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Entry premium (₹)</label>
                <input name="entryPrice" type="number" step="0.01" placeholder="e.g. 85.50" value={trade.entryPrice} onChange={handleChange} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Exit premium (₹)</label>
                <input name="exitPrice" type="number" step="0.01" placeholder="e.g. 120" value={trade.exitPrice} onChange={handleChange} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Trade type</label>
              <select name="tradeType" value={trade.tradeType} onChange={handleChange} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }}>
                <option value="INTRADAY">Intraday</option>
                <option value="DELIVERY">Delivery</option>
                <option value="SWING">Swing</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>
                Strategy / Setup{setupsLoading ? " (loading...)" : ""}
              </label>
              <select
                name="strategy"
                value={trade.strategy}
                onChange={handleStrategyChange}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }}
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
                  placeholder="Enter strategy name"
                  value={trade.strategyCustom}
                  onChange={handleChange}
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14, marginTop: 8 }}
                />
              )}
            </div>

            {/* Setup checklist */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: "0.12em", color: theme.muted, fontFamily: "'JetBrains Mono',monospace", fontWeight: 800 }}>
                    SETUP CHECKLIST
                  </div>
                  <div style={{ fontSize: 12, color: theme.muted, marginTop: 4 }}>
                    Tick the rules you followed for this setup.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearSetupRules}
                  style={{ padding: "8px 10px", borderRadius: 999, border: `1px solid ${theme.border}`, background: "#F8FAFC", cursor: "pointer", fontSize: 11, fontWeight: 700, color: theme.muted }}
                >
                  CLEAR
                </button>
              </div>

              {setupRules.length === 0 ? (
                <div style={{ fontSize: 12, color: theme.muted }}>
                  Select a setup above to load its checklist, or add your own rules.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {setupRules.map(rule => (
                    <div key={rule.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, border: `1px solid ${theme.border}`, background: theme.card }}>
                      <button
                        type="button"
                        onClick={() => toggleSetupRule(rule.id)}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 6,
                          border: rule.followed ? `1.5px solid ${theme.bull}` : "1.5px solid #CBD5E1",
                          background: rule.followed ? `linear-gradient(135deg, ${theme.bull}, #22C78E)` : "#FFFFFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                        aria-label="Toggle rule followed"
                      >
                        {rule.followed && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.8">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                      <input
                        value={rule.label}
                        onChange={e => updateSetupRuleLabel(rule.id, e.target.value)}
                        placeholder="Add setup rule..."
                        style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14 }}
                      />
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={addSetupRule}
                style={{ marginTop: 10, background: "transparent", border: "none", color: theme.bull, fontWeight: 800, cursor: "pointer" }}
              >
                + ADD RULE
              </button>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Setup / Pattern</label>
              <input name="setup" placeholder="e.g. Breakout above 26200" value={trade.setup} onChange={handleChange} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Expiry date</label>
              <input name="expiryDate" type="date" value={trade.expiryDate} onChange={handleChange} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Planned Risk : Reward</label>
              <select
                name="riskRewardRatio"
                value={trade.riskRewardRatio}
                onChange={handleChange}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }}
              >
                <option value="">Select...</option>
                <option value="1:1">1 : 1</option>
                <option value="1:1.5">1 : 1.5</option>
                <option value="1:2">1 : 2</option>
                <option value="1:3">1 : 3</option>
                <option value="1:4">1 : 4</option>
                <option value="1:5">1 : 5</option>
                <option value="custom">Custom</option>
              </select>
              {trade.riskRewardRatio === "custom" && (
                <input
                  name="riskRewardCustom"
                  placeholder="e.g. 1:2.5"
                  value={trade.riskRewardCustom}
                  onChange={handleChange}
                  style={{ marginTop: 8, width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 13 }}
                />
              )}
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Entry Basis</label>
              <select
                name="entryBasis"
                value={trade.entryBasis}
                onChange={handleChange}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }}
              >
                <option value="Plan">Rule Based / Plan</option>
                <option value="Emotion">Emotional</option>
                <option value="Impulsive">Impulsive</option>
                <option value="Custom">Custom Basis</option>
              </select>
              {trade.entryBasis === "Custom" && (
                <input
                  name="entryBasisCustom"
                  placeholder="e.g. News-driven scalp, FOMO, etc."
                  value={trade.entryBasisCustom}
                  onChange={handleChange}
                  style={{ marginTop: 8, width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 13 }}
                />
              )}
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Mistake (if any)</label>
              <select name="mistakeTag" value={trade.mistakeTag} onChange={handleChange} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }}>
                <option value="">None</option>
                <option value="Overtraded">Overtraded</option>
                <option value="Held too long">Held too long</option>
                <option value="Exited early">Exited early</option>
                <option value="Wrong strike">Wrong strike</option>
                <option value="Revenge trade">Revenge trade</option>
                <option value="No stop">No stop</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Lesson (one line)</label>
              <input name="lesson" placeholder="e.g. Never add to a losing position" value={trade.lesson} onChange={handleChange} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Notes</label>
              <textarea name="notes" placeholder="Setup, context, emotions..." value={trade.notes} onChange={handleChange} rows={3} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14, resize: "vertical" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Brokerage (₹)</label>
                <input name="brokerage" type="number" step="0.01" placeholder="0" value={trade.brokerage} onChange={handleChange} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>STT / Taxes (₹)</label>
                <input name="sttTaxes" type="number" step="0.01" placeholder="0" value={trade.sttTaxes} onChange={handleChange} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }} />
              </div>
            </div>

            {/* Psychology Section */}
            <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0F1923", marginBottom: 16, display: "flex", alignItems: "center", gap: 8, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                <span>🧠</span> TRADE PSYCHOLOGY
                <span style={{ fontSize: 9, color: "#94A3B8", fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.08em", background: "#F8FAFC", padding: "2px 6px", borderRadius: 4 }}>OPTIONAL</span>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: theme.muted, marginBottom: 8, fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: "0.05em" }}>HOW ARE YOU FEELING?</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { emoji: "😰", val: 1, label: "Stressed" },
                    { emoji: "😟", val: 2, label: "Anxious" },
                    { emoji: "😐", val: 3, label: "Neutral" },
                    { emoji: "😊", val: 4, label: "Good" },
                    { emoji: "🔥", val: 5, label: "Peak" }
                  ].map(m => (
                    <button
                      key={m.val}
                      type="button"
                      onClick={() => setTrade(prev => ({ ...prev, mood: prev.mood === m.val ? null : m.val }))}
                      style={{
                        flex: 1,
                        padding: "10px 4px",
                        borderRadius: 10,
                        cursor: "pointer",
                        textAlign: "center",
                        transition: "all 0.2s",
                        border: trade.mood === m.val ? "1.5px solid #0D9E6E" : "1px solid #E2E8F0",
                        background: trade.mood === m.val ? "rgba(13,158,110,0.06)" : "#F8FAFC",
                        transform: trade.mood === m.val ? "scale(1.04)" : "scale(1)"
                      }}
                    >
                      <div style={{ fontSize: 20 }}>{m.emoji}</div>
                      <div style={{ fontSize: 10, color: trade.mood === m.val ? "#0D9E6E" : "#64748B", fontWeight: 700, marginTop: 4, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{m.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: theme.muted, marginBottom: 6, fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: "0.05em" }}>CONFIDENCE LEVEL</label>
                <select
                  name="confidence"
                  value={trade.confidence}
                  onChange={handleChange}
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }}
                >
                  <option value="">Select confidence...</option>
                  <option value="Low">Low — Unsure about this setup</option>
                  <option value="Medium">Medium — Decent setup</option>
                  <option value="High">High — Strong conviction</option>
                  <option value="Overconfident">Overconfident — Can't lose 🚩</option>
                </select>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: theme.muted, marginBottom: 8, fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: "0.05em" }}>EMOTIONAL TAGS</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {["FOMO", "Revenge", "Fear", "Greed", "Calm", "Bored", "Focused", "Frustrated"].map(tag => {
                    const selected = (trade.emotionalTags || []).includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setTrade(prev => ({
                          ...prev,
                          emotionalTags: selected
                            ? (prev.emotionalTags || []).filter(x => x !== tag)
                            : [...(prev.emotionalTags || []), tag]
                        }))}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s",
                          fontFamily: "'Plus Jakarta Sans',sans-serif",
                          border: selected ? "1px solid #0D9E6E" : "1px solid #E2E8F0",
                          background: selected ? "rgba(13,158,110,0.08)" : "#FFFFFF",
                          color: selected ? "#0D9E6E" : "#64748B"
                        }}
                      >
                        {tag === "FOMO" ? "😨" : tag === "Revenge" ? "😡" : tag === "Fear" ? "😰" : tag === "Greed" ? "🤑" : tag === "Calm" ? "🧘" : tag === "Bored" ? "😴" : tag === "Focused" ? "🎯" : "😤"} {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: theme.muted, marginBottom: 8, fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: "0.05em" }}>WOULD YOU TAKE THIS TRADE AGAIN?</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {[
                    { val: "Yes", icon: "✅", label: "Yes" },
                    { val: "No", icon: "❌", label: "No" }
                  ].map(option => (
                    <button
                      key={option.val}
                      type="button"
                      onClick={() => setTrade(prev => ({ ...prev, wouldRetake: prev.wouldRetake === option.val ? "" : option.val }))}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: 10,
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 700,
                        transition: "all 0.2s",
                        fontFamily: "'Plus Jakarta Sans',sans-serif",
                        border: trade.wouldRetake === option.val ? `1.5px solid ${option.val === "Yes" ? "#0D9E6E" : "#D63B3B"}` : "1px solid #E2E8F0",
                        background: trade.wouldRetake === option.val ? (option.val === "Yes" ? "rgba(13,158,110,0.06)" : "rgba(214,59,59,0.06)") : "#F8FAFC",
                        color: trade.wouldRetake === option.val ? (option.val === "Yes" ? "#0D9E6E" : "#D63B3B") : "#64748B"
                      }}
                    >
                      {option.icon} {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} style={{
            padding: "14px 24px",
            borderRadius: 12,
            border: "none",
            background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
            color: "#fff",
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.8 : 1
          }}>
            {loading ? "Saving…" : "Save"}
          </button>
        </form>
      </main>
    </div>
  );
}
