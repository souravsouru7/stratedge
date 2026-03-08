"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createTrade } from "@/services/tradeApi";
import Link from "next/link";
import { MARKETS } from "@/context/MarketContext";
import InstallPWA from "@/components/InstallPWA";
import MarketSwitcher from "@/components/MarketSwitcher";

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
    sttTaxes: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) router.push("/login");
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTrade((prev) => ({ ...prev, [name]: value }));
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
      sttTaxes: trade.sttTaxes ? parseFloat(trade.sttTaxes) : undefined
    };

    setLoading(true);
    try {
      const result = await createTrade(tradeData, MARKETS.INDIAN_MARKET);
      if (result?._id) {
        alert("Trade saved!");
        router.push("/indian-market/trades");
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
    <div style={{ minHeight: "100vh", background: theme.bg, fontFamily: "'Plus Jakarta Sans',sans-serif", color: theme.primary }}>
      <header style={{
        background: theme.card,
        borderBottom: `1px solid ${theme.border}`,
        minHeight: 60,
        padding: "10px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Global back button */}
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              width: 32,
              height: 32,
              borderRadius: "999px",
              border: `1px solid ${theme.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 8,
              cursor: "pointer",
              background: "#FFFFFF",
              padding: 0
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="2.2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <Link href="/indian-market/dashboard" style={{ textDecoration: "none", color: theme.primary, display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/logo.png" alt="Stratedge" style={{ width: 38, height: 38, objectFit: "contain" }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "0.04em", color: theme.primary }}>STRATEDGE</div>
              <div style={{ fontSize: 9, letterSpacing: "0.18em", color: theme.secondary, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>OPTIONS JOURNAL</div>
            </div>
          </Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/indian-market/trades" style={{ fontSize: 12, color: theme.primary, fontWeight: 600, textDecoration: "none" }}>← JOURNAL</Link>
          <MarketSwitcher />
          <InstallPWA />
        </div>
      </header>

      <main style={{ maxWidth: 480, margin: "0 auto", padding: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4, color: theme.primary }}>Log option trade</h1>
        <p style={{ fontSize: 12, color: theme.muted, marginBottom: 24 }}>NSE / BSE — only what you need</p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Strategy / Setup</label>
              <select name="strategy" value={trade.strategy} onChange={handleChange} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, fontSize: 14 }}>
                <option value="">Select...</option>
                <option value="Naked CE">Naked CE</option>
                <option value="Naked PE">Naked PE</option>
                <option value="Straddle">Straddle</option>
                <option value="Spread">Spread</option>
                <option value="Breakout">Breakout</option>
                <option value="Support/Resistance">Support / Resistance</option>
                <option value="IV crush">IV crush</option>
                <option value="Other">Other</option>
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
