"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTrades, deleteTrade } from "@/services/tradeApi";
import Link from "next/link";
import MarketSwitcher from "@/components/MarketSwitcher";

/* ─────────────────────────────────────────
   DESIGN TOKENS — Light Trading Theme
   Base: warm white #F5F3EE
   Cards: #FFFFFF
   Bull: #0D9E6E (deep green)
   Bear: #D63B3B (deep red)
   Gold: #B8860B
   Text primary: #0F1923
   Text secondary: #4A5568
   Text muted: #94A3B8
   Border: #E2E8F0
───────────────────────────────────────── */

/* ─────────────────────────────────────────
   CANDLESTICK BACKGROUND (subtle, light)
───────────────────────────────────────── */
function CandlestickBackground() {
  useEffect(() => {
    const canvas = document.getElementById("trade-bg-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const draw = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const count = Math.floor(W / 32);
      const candles = [];
      let price = 200;
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

      // Subtle grid
      ctx.strokeStyle = "rgba(0,0,0,0.04)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 7; i++) {
        ctx.beginPath(); ctx.moveTo(0, (H / 7) * i); ctx.lineTo(W, (H / 7) * i); ctx.stroke();
      }

      candles.forEach((c, i) => {
        const x = i * 32 + 16, bull = c.close >= c.open;
        const col = bull ? "rgba(13,158,110,0.18)" : "rgba(214,59,59,0.15)";
        const bTop = toY(Math.max(c.open, c.close)), bBot = toY(Math.min(c.open, c.close));
        ctx.strokeStyle = bull ? "rgba(13,158,110,0.25)" : "rgba(214,59,59,0.22)";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, toY(c.high)); ctx.lineTo(x, toY(c.low)); ctx.stroke();
        ctx.fillStyle = col;
        ctx.fillRect(x - 8, bTop, 16, Math.max(bBot - bTop, 1));
      });

      // MA line
      const ma = candles.map((_, i) => {
        const sl = candles.slice(Math.max(0, i - 5), i + 1);
        return sl.reduce((a, c) => a + c.close, 0) / sl.length;
      });
      ctx.strokeStyle = "rgba(184,134,11,0.3)";
      ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ma.forEach((p, i) => { const x = i * 32 + 16, y = toY(p); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
      ctx.stroke(); ctx.setLineDash([]);
    };
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, []);
  return <canvas id="trade-bg-canvas" style={{ position: "fixed", inset: 0, width: "100%", height: "100%", opacity: 1, zIndex: 0, pointerEvents: "none" }} />;
}

/* ─────────────────────────────────────────
   TICKER TAPE — dark strip on light bg
───────────────────────────────────────── */
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
    <div style={{
      overflow: "hidden", background: "#0F1923",
      borderBottom: "3px solid #0D9E6E",
      padding: "7px 0", whiteSpace: "nowrap", position: "relative", zIndex: 10,
    }}>
      <div style={{ display: "inline-flex", gap: "48px", animation: "ticker 32s linear infinite" }}>
        {items.map((t, i) => (
          <span key={i} style={{ fontSize: "11px", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.04em" }}>
            <span style={{ color: "#94A3B8", marginRight: 6 }}>{t.sym}</span>
            <span style={{ color: t.bull ? "#22C78E" : "#F87171" }}>
              {t.bull ? "▲" : "▼"} {t.val}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   CONFIRM DELETE MODAL
───────────────────────────────────────── */
function DeleteModal({ trade, onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(15,25,35,0.6)", backdropFilter: "blur(6px)" }} onClick={onCancel} />
      <div style={{
        position: "relative", background: "#FFFFFF", border: "1px solid #E2E8F0",
        borderRadius: 12, padding: "28px", maxWidth: 340, width: "100%",
        boxShadow: "0 8px 32px rgba(15,25,35,0.15)",
      }}>
        <div style={{ height: 3, background: "linear-gradient(90deg,#D63B3B,transparent)", marginBottom: 20, borderRadius: 2 }} />
        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 18, fontWeight: 800, color: "#0F1923", marginBottom: 8 }}>
          DELETE TRADE?
        </div>
        <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace", marginBottom: 6, letterSpacing: "0.08em" }}>
          TRADE TO DELETE
        </div>
        <div style={{ fontSize: 13, color: "#0F1923", fontFamily: "'JetBrains Mono',monospace", marginBottom: 20, fontWeight: 600 }}>
          {trade?.pair} — {trade?.type?.toUpperCase()}
        </div>
        <div style={{ fontSize: 9, color: "#94A3B8", letterSpacing: "0.06em", marginBottom: 22, lineHeight: 1.6 }}>
          THIS ACTION CANNOT BE UNDONE. THE TRADE WILL BE PERMANENTLY REMOVED FROM YOUR JOURNAL.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: "10px", background: "#F8F6F2", border: "1px solid #E2E8F0",
            borderRadius: 6, color: "#4A5568", fontSize: 10, fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: "0.12em", cursor: "pointer",
          }}>CANCEL</button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: "10px", background: "linear-gradient(135deg,#D63B3B,#F87171)",
            border: "none", borderRadius: 6, color: "#FFFFFF", fontSize: 10,
            fontFamily: "'JetBrains Mono',monospace", fontWeight: 700,
            letterSpacing: "0.12em", cursor: "pointer",
            boxShadow: "0 4px 12px rgba(214,59,59,0.3)",
          }}>DELETE TRADE</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TRADE ROW — desktop table row
───────────────────────────────────────── */
function TradeRow({ trade, onDelete, idx }) {
  const bull = parseFloat(trade.profit) >= 0;
  return (
    <tr style={{
      borderBottom: "1px solid #E2E8F0",
      animation: `fadeUp 0.4s ease ${idx * 0.05}s both`,
      transition: "background 0.2s",
    }}
      onMouseEnter={e => e.currentTarget.style.background = "#F8F6F2"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      {/* Pair */}
      <td style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: bull ? "#0D9E6E" : "#D63B3B",
            boxShadow: bull ? "0 0 6px #0D9E6E" : "0 0 6px #D63B3B",
            flexShrink: 0,
          }} />
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#0F1923", fontWeight: 600 }}>
            {trade.pair}
          </span>
        </div>
      </td>
      {/* Type */}
      <td style={{ padding: "14px 16px" }}>
        <span style={{
          fontSize: 9, letterSpacing: "0.12em",
          color: trade.type?.toUpperCase() === "LONG" ? "#0D9E6E" : "#D63B3B",
          background: trade.type?.toUpperCase() === "LONG" ? "rgba(13,158,110,0.1)" : "rgba(214,59,59,0.1)",
          border: `1px solid ${trade.type?.toUpperCase() === "LONG" ? "rgba(13,158,110,0.3)" : "rgba(214,59,59,0.3)"}`,
          borderRadius: 20, padding: "3px 10px",
          fontFamily: "'JetBrains Mono',monospace",
        }}>
          {trade.type?.toUpperCase() === "LONG" ? "▲ LONG" : "▼ SHORT"}
        </span>
      </td>
      {/* Basis */}
      <td style={{ padding: "14px 16px" }}>
        <span style={{
          fontSize: 9, letterSpacing: "0.08em",
          color: trade.entryBasis === "Plan" ? "#4A5568" : trade.entryBasis === "Emotion" ? "#D63B3B" : "#B8860B",
          fontFamily: "'JetBrains Mono',monospace",
          fontWeight: 600,
          textTransform: "uppercase",
        }}>
          {trade.entryBasis === "Custom" ? trade.entryBasisCustom : trade.entryBasis || "Plan"}
        </span>
      </td>
      {/* Profit */}
      <td style={{ padding: "14px 16px" }}>
        <span style={{
          fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700,
          color: bull ? "#0D9E6E" : "#D63B3B",
        }}>
          {bull ? "+" : ""}{trade.profit}
        </span>
      </td>
      {/* Actions */}
      <td style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Link href={`/trades/view?id=${trade._id}`} style={{
            fontSize: 9, letterSpacing: "0.1em", fontFamily: "'JetBrains Mono',monospace",
            color: "#0D9E6E", border: "1px solid rgba(13,158,110,0.3)",
            background: "rgba(13,158,110,0.05)", borderRadius: 4,
            padding: "5px 12px", textDecoration: "none", transition: "all 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(13,158,110,0.12)" }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(13,158,110,0.05)" }}
          >
            VIEW →
          </Link>
          <button onClick={() => onDelete(trade)} style={{
            fontSize: 9, letterSpacing: "0.1em", fontFamily: "'JetBrains Mono',monospace",
            color: "#D63B3B", border: "1px solid rgba(214,59,59,0.3)",
            background: "rgba(214,59,59,0.05)", borderRadius: 4,
            padding: "5px 12px", cursor: "pointer", transition: "all 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(214,59,59,0.12)" }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(214,59,59,0.05)" }}
          >
            DELETE
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ─────────────────────────────────────────
   TRADE CARD — mobile card
───────────────────────────────────────── */
function TradeCard({ trade, onDelete, idx }) {
  const bull = parseFloat(trade.profit) >= 0;
  return (
    <div style={{
      background: "#FFFFFF", border: "1px solid #E2E8F0",
      borderRadius: 8, padding: "16px", marginBottom: 10, position: "relative",
      borderLeft: `3px solid ${bull ? "#0D9E6E" : "#D63B3B"}`,
      animation: `fadeUp 0.4s ease ${idx * 0.06}s both`,
      boxShadow: "0 2px 8px rgba(15,25,35,0.05)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, color: "#0F1923", fontWeight: 700, marginBottom: 4 }}>
            {trade.pair}
          </div>
          <span style={{
            fontSize: 8, letterSpacing: "0.12em",
            color: trade.type?.toUpperCase() === "LONG" ? "#0D9E6E" : "#D63B3B",
            background: trade.type?.toUpperCase() === "LONG" ? "rgba(13,158,110,0.1)" : "rgba(214,59,59,0.1)",
            border: `1px solid ${trade.type?.toUpperCase() === "LONG" ? "rgba(13,158,110,0.3)" : "rgba(214,59,59,0.3)"}`,
            borderRadius: 20, padding: "2px 8px",
            fontFamily: "'JetBrains Mono',monospace",
          }}>
            {trade.type?.toUpperCase() === "LONG" ? "▲ LONG" : "▼ SHORT"}
          </span>
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 700,
          color: bull ? "#0D9E6E" : "#D63B3B",
        }}>
          {bull ? "+" : ""}{trade.profit}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94A3B8", marginBottom: 12, fontFamily: "'JetBrains Mono',monospace" }}>
        <span>BASIS: <span style={{ color: trade.entryBasis === "Plan" ? "#4A5568" : trade.entryBasis === "Emotion" ? "#D63B3B" : "#B8860B", fontWeight: 700 }}>{trade.entryBasis === "Custom" ? trade.entryBasisCustom : trade.entryBasis || "Plan"}</span></span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Link href={`/trades/view?id=${trade._id}`} style={{
          flex: 1, textAlign: "center", fontSize: 9, letterSpacing: "0.1em",
          fontFamily: "'JetBrains Mono',monospace", color: "#0D9E6E",
          border: "1px solid rgba(13,158,110,0.3)", background: "rgba(13,158,110,0.05)",
          borderRadius: 4, padding: "8px", textDecoration: "none",
        }}>VIEW →</Link>
        <button onClick={() => onDelete(trade)} style={{
          flex: 1, fontSize: 9, letterSpacing: "0.1em",
          fontFamily: "'JetBrains Mono',monospace", color: "#D63B3B",
          border: "1px solid rgba(214,59,59,0.3)", background: "rgba(214,59,59,0.05)",
          borderRadius: 4, padding: "8px", cursor: "pointer",
        }}>DELETE</button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   EMPTY STATE — Enhanced for better onboarding
───────────────────────────────────────── */
function EmptyState() {
  return (
    <div style={{ 
      textAlign: "center", 
      padding: "80px 20px",
      background: "linear-gradient(135deg, rgba(13,158,110,0.03) 0%, rgba(240,238,233,0.5) 100%)",
      borderRadius: 14,
      margin: "20px",
      border: "1px dashed rgba(13,158,110,0.2)",
    }}>
      {/* Icon illustration */}
      <div style={{ marginBottom: 24, position: "relative" }}>
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" style={{ margin: "0 auto" }}>
          {/* Background circle */}
          <circle cx="40" cy="40" r="36" fill="rgba(13,158,110,0.08)" stroke="rgba(13,158,110,0.15)" strokeWidth="2" />
          
          {/* Chart bars */}
          <rect x="24" y="38" width="8" height="18" fill="rgba(13,158,110,0.6)" rx="2" />
          <rect x="36" y="32" width="8" height="24" fill="rgba(13,158,110,0.8)" rx="2" />
          <rect x="48" y="42" width="8" height="14" fill="rgba(214,59,59,0.5)" rx="2" />
          
          {/* Upward trend arrow */}
          <path d="M20 52 L32 42 L42 50 L60 28" stroke="rgba(13,158,110,0.9)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="52 28 60 28 60 36" fill="none" stroke="rgba(13,158,110,0.9)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      
      {/* Main message */}
      <div style={{ 
        fontFamily: "'Plus Jakarta Sans',sans-serif", 
        fontSize: 20, 
        fontWeight: 800, 
        color: "#0F1923", 
        marginBottom: 10,
        letterSpacing: "-0.02em",
      }}>
        Upload your first trade to get started
      </div>
      
      {/* Subtext */}
      <div style={{ 
        fontSize: 11, 
        color: "#64748B", 
        lineHeight: 1.6, 
        maxWidth: 420, 
        margin: "0 auto 24px",
        fontFamily: "'Plus Jakarta Sans',sans-serif",
      }}>
        Track your trades, analyze performance, and improve discipline with detailed analytics and insights.
      </div>
      
      {/* CTA Button */}
      <Link href="/upload-trade" style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        background: "linear-gradient(135deg, #0D9E6E 0%, #22C78E 100%)",
        color: "#FFFFFF",
        padding: "14px 28px",
        borderRadius: 12,
        textDecoration: "none",
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: "0.08em",
        boxShadow: "0 4px 14px rgba(13,158,110,0.3)",
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 6px 20px rgba(13,158,110,0.4)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 4px 14px rgba(13,158,110,0.3)";
      }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        UPLOAD TRADE
      </Link>
      
      {/* Quick tips */}
      <div style={{ 
        marginTop: 28, 
        paddingTop: 20, 
        borderTop: "1px solid rgba(13,158,110,0.15)",
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", 
        gap: 16,
        maxWidth: 520,
        margin: "28px auto 0",
      }}>
        {[
          { icon: "📊", text: "Track Performance" },
          { icon: "🎯", text: "Analyze Patterns" },
          { icon: "📈", text: "Improve Strategy" },
        ].map((tip, idx) => (
          <div key={idx} style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
          }}>
            <span style={{ fontSize: 20 }}>{tip.icon}</span>
            <span style={{ fontSize: 9, color: "#64748B", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600 }}>
              {tip.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function TradesPage() {
  const router = useRouter();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    setMounted(true);
    fetchTrades();
  }, [router]);

  const fetchTrades = async () => {
    setLoading(true);
    try {
      const data = await getTrades();
      setTrades(data);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteTrade(deleteTarget._id);
    setDeleteTarget(null);
    fetchTrades();
  };

  const filtered = trades.filter(t => {
    const matchFilter = filter === "ALL" || t.type?.toUpperCase() === filter;
    const matchSearch = t.pair?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  // Summary stats
  const totalPnl = trades.reduce((s, t) => s + (parseFloat(t.profit) || 0), 0);
  const winners = trades.filter(t => parseFloat(t.profit) >= 0).length;
  const winRate = trades.length ? ((winners / trades.length) * 100).toFixed(1) : "0.0";
  const totalBull = totalPnl >= 0;

  const summaryStats = [
    { label: "TOTAL TRADES", val: trades.length, bull: true },
    { label: "WIN RATE", val: `${winRate}%`, bull: parseFloat(winRate) >= 50 },
    { label: "TOTAL P&L", val: `${totalBull ? "+" : ""}$${Math.abs(totalPnl).toFixed(2)}`, bull: totalBull },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F0EEE9",
      fontFamily: "'Plus Jakarta Sans',sans-serif",
      color: "#0F1923",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Background */}
      <CandlestickBackground />
      <div style={{
        position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
        background: "linear-gradient(135deg, rgba(240,238,233,0.82) 0%, rgba(240,238,233,0.75) 100%)"
      }} />

      {/* Header */}
      <header style={{
        position: "relative",
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 24px",
        minHeight: 60,
        flexWrap: "wrap",
        gap: 10,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid #E2E8F0",
        boxShadow: "0 1px 12px rgba(15,25,35,0.06)",
      }}>
        <Link href="/dashboard" style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 48, height: 48, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}><img src="/mainlogo.png" alt="LOGNERA" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
          <div>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 800, letterSpacing: "0.04em", color: "#0F1923", lineHeight: 1 }}>
              LOGNERA
            </div>
            <div style={{ fontSize: 9, letterSpacing: "0.18em", color: "#0D9E6E", marginTop: 1, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>
              FOREX AI JOURNAL
            </div>
          </div>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <MarketSwitcher />

          <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { href: "/trades", label: "Journal" },
              { href: "/add-trade", label: "Log Trade" },
              { href: "/analytics", label: "Analytics" },
              { href: "/weekly-reports?market=Forex", label: "Weekly AI" },
            ].map(n => (
              <Link key={n.href} href={n.href} style={{
                fontSize: 13, color: "#4A5568", fontWeight: 700,
                textDecoration: "none", padding: "10px 16px",
                borderRadius: 999, transition: "all 0.2s",
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
                  e.currentTarget.style.color = "#0F1923";
                  e.currentTarget.style.borderColor = "rgba(13,158,110,0.6)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => { 
                  e.currentTarget.style.background = "rgba(13,158,110,0.08)"; 
                  e.currentTarget.style.color = "#4A5568";
                  e.currentTarget.style.borderColor = "rgba(13,158,110,0.25)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <button
            onClick={() => {
              localStorage.removeItem("token");
              window.location.href = "/login";
            }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(214,59,59,0.1)", border: "1px solid rgba(214,59,59,0.3)",
              borderRadius: 6, padding: "6px 12px",
              cursor: "pointer", fontSize: 10, letterSpacing: "0.1em",
              color: "#D63B3B", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600,
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(214,59,59,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(214,59,59,0.1)"; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            LOGOUT
          </button>
        </div>
      </header>

      <TickerTape />

      {/* Main */}
      <main style={{
        position: "relative",
        zIndex: 5,
        padding: "28px 20px",
        maxWidth: 960,
        margin: "0 auto",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(16px)",
        transition: "all 0.5s cubic-bezier(0.22,1,0.36,1)",
      }}>

        {/* Page title + Add button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: "0.04em", color: "#0F1923", lineHeight: 1.1 }}>
              Trade <span style={{ color: "#0D9E6E" }}>History</span>
            </div>
            <div style={{ fontSize: 12, color: "#94A3B8", letterSpacing: "0.06em", marginTop: 5, fontFamily: "'JetBrains Mono',monospace" }}>
              YOUR COMPLETE JOURNAL LOG
            </div>
          </div>
          <Link href="/add-trade" style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "linear-gradient(135deg, #0F1923 0%, #1a2d3d 100%)",
            borderRadius: 10,
            padding: "12px 20px",
            textDecoration: "none",
            color: "#22C78E",
            fontSize: 12,
            fontFamily: "'JetBrains Mono',monospace",
            fontWeight: 700,
            letterSpacing: "0.08em",
            boxShadow: "0 4px 16px rgba(15,25,35,0.25), 0 0 20px rgba(34,199,142,0.15)",
            border: "1px solid rgba(34,199,142,0.3)",
            position: "relative",
            overflow: "hidden",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            LOG TRADE
          </Link>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
          {summaryStats.map((s, i) => (
            <div key={s.label} style={{
              flex: "1 1 160px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: 12,
              padding: "18px 20px",
              textAlign: "center",
              boxShadow: "0 2px 12px rgba(15,25,35,0.06), 0 1px 3px rgba(15,25,35,0.04)",
              animation: `fadeUp 0.5s ease ${i * 0.07}s both`,
            }}>
              <div style={{ fontSize: 10, color: "#94A3B8", letterSpacing: "0.12em", marginBottom: 8, fontFamily: "'JetBrains Mono',monospace", fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontSize: 24, color: s.bull ? "#0D9E6E" : "#D63B3B", fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Search + Filter bar */}
        <div style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 16,
          boxShadow: "0 2px 8px rgba(15,25,35,0.05)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 160px", minWidth: 140 }}>
            <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", pointerEvents: "none" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              placeholder="Search pair..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "#F8F6F2",
                border: "1px solid #E2E8F0",
                borderRadius: 8,
                padding: "10px 12px 10px 38px",
                color: "#0F1923",
                fontSize: 12,
                fontFamily: "'JetBrains Mono',monospace",
                outline: "none",
              }}
            />
          </div>

          {/* Filter pills */}
          <div style={{ display: "flex", gap: 6 }}>
            {["ALL", "LONG", "SHORT"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                fontSize: 10,
                letterSpacing: "0.12em",
                fontFamily: "'JetBrains Mono',monospace",
                padding: "8px 16px",
                borderRadius: 20,
                cursor: "pointer",
                transition: "all 0.2s",
                background: filter === f
                  ? f === "SHORT" ? "rgba(214,59,59,0.15)" : "rgba(13,158,110,0.12)"
                  : "#F8F6F2",
                border: filter === f
                  ? f === "SHORT" ? "1px solid rgba(214,59,59,0.4)" : "1px solid rgba(13,158,110,0.35)"
                  : "1px solid #E2E8F0",
                color: filter === f
                  ? f === "SHORT" ? "#D63B3B" : "#0D9E6E"
                  : "#4A5568",
                fontWeight: 600,
              }}>{f === "LONG" ? "▲ " : f === "SHORT" ? "▼ " : ""}{f}</button>
            ))}
          </div>
        </div>

        {/* Table — card */}
        <div style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 2px 12px rgba(15,25,35,0.05)",
        }}>
          {/* Top accent */}
          <div style={{ height: 3, background: "linear-gradient(90deg, #0D9E6E 0%, transparent 45%, transparent 55%, #D63B3B 100%)" }} />

          {loading ? (
            <div style={{ padding: "60px", textAlign: "center" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0D9E6E" strokeWidth="2" style={{ animation: "spin 0.8s linear infinite", margin: "0 auto 12px", display: "block" }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <div style={{ fontSize: 11, color: "#94A3B8", letterSpacing: "0.14em", fontFamily: "'JetBrains Mono',monospace" }}>LOADING JOURNAL...</div>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* Desktop table — hidden on mobile via inline media logic using JS */}
              <div className="hidden-mobile" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                      {["PAIR", "TYPE", "BASIS", "P&L", "ACTIONS"].map((h, i) => (
                        <th key={h} style={{
                          padding: "14px 16px",
                          fontSize: 10,
                          letterSpacing: "0.14em",
                          color: "#94A3B8",
                          fontFamily: "'JetBrains Mono',monospace",
                          textAlign: i === 4 ? "right" : "left",
                          fontWeight: 600,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((trade, idx) => (
                      <TradeRow key={trade._id} trade={trade} onDelete={setDeleteTarget} idx={idx} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="show-mobile" style={{ padding: "14px" }}>
                {filtered.map((trade, idx) => (
                  <TradeCard key={trade._id} trade={trade} onDelete={setDeleteTarget} idx={idx} />
                ))}
              </div>
            </>
          )}

          {/* Footer row */}
          {filtered.length > 0 && !loading && (
            <div style={{
              padding: "12px 16px",
              borderTop: "1px solid #E2E8F0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#F8F6F2",
            }}>
              <span style={{ fontSize: 9, color: "#94A3B8", letterSpacing: "0.08em", fontFamily: "'JetBrains Mono',monospace" }}>
                SHOWING {filtered.length} OF {trades.length} TRADES
              </span>
              <span style={{ fontSize: 9, color: "#94A3B8", letterSpacing: "0.08em", fontFamily: "'JetBrains Mono',monospace" }}>
                LOGNERA AI JOURNAL
              </span>
            </div>
          )}
        </div>
      </main>

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteModal
          trade={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }

        input::placeholder { color: #94A3B8; font-size: 11px; }
        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* Responsive: show table on desktop, cards on mobile */
        .hidden-mobile { display: block; }
        .show-mobile { display: none; }

        @media (max-width: 640px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: block !important; }
          main { padding: 16px 12px !important; }
        }
      `}</style>
    </div>
  );
}
