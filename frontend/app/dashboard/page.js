"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSummary } from "@/services/analyticsApi";
import Link from "next/link";
import MarketSwitcher from "@/components/MarketSwitcher";
import LoadingSpinner from "@/components/LoadingSpinner";
import InstallPWA from "@/components/InstallPWA";

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
    const canvas = document.getElementById("dash-bg-canvas");
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
  return <canvas id="dash-bg-canvas" style={{ position: "fixed", inset: 0, width: "100%", height: "100%", opacity: 1, zIndex: 0, pointerEvents: "none" }} />;
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
   EQUITY CURVE
───────────────────────────────────────── */
function EquityCurve({ bull }) {
  const bullPts = "0,52 20,46 40,48 60,36 80,38 100,24 120,28 140,14 160,18 180,8";
  const bearPts = "0,8  20,12 40,10 60,22 80,18 100,32 120,28 140,40 160,36 180,52";
  const pts = bull ? bullPts : bearPts;
  const color = bull ? "#0D9E6E" : "#D63B3B";
  return (
    <svg width="100%" height="64" viewBox="0 0 180 60" preserveAspectRatio="none" fill="none">
      <defs>
        <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <polygon points={`0,52 ${pts} 180,60 0,60`} fill="url(#eqGrad)" />
      <polyline points={pts} stroke={color} strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {/* Dots at start & end */}
      <circle cx="0" cy="52" r="3" fill={color} opacity="0.4" />
      <circle cx="180" cy={bull ? "8" : "52"} r="4" fill={color} />
    </svg>
  );
}

/* ─────────────────────────────────────────
   STAT CARD
───────────────────────────────────────── */
function StatCard({ label, value, sub, accentColor, icon, delay = 0 }) {
  // Ensure value is never undefined or NaN
  const displayValue = value !== undefined && value !== null && !isNaN(value) ? value : (value || 0);

  return (
    <div style={{
      background: "#FFFFFF", borderRadius: 12,
      border: "1px solid #E2E8F0",
      flex: "1 1 160px", overflow: "hidden",
      boxShadow: "0 2px 12px rgba(15,25,35,0.06), 0 1px 3px rgba(15,25,35,0.04)",
      animation: `fadeUp 0.5s ease ${delay}s both`,
      position: "relative",
    }}>
      <div style={{ height: 3, background: `linear-gradient(90deg,${accentColor},${accentColor}22)` }} />
      <div style={{ padding: "20px 20px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <span style={{ fontSize: 10, color: "#94A3B8", letterSpacing: "0.12em", fontFamily: "'JetBrains Mono',monospace", fontWeight: 500 }}>
            {label}
          </span>
          {icon && (
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: `${accentColor}12`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: accentColor,
            }}>
              {icon}
            </div>
          )}
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: accentColor, lineHeight: 1, marginBottom: 6 }}>
          {displayValue}
        </div>
        {sub && (
          <div style={{ fontSize: 10, color: "#94A3B8", letterSpacing: "0.06em", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   NAV CARD
───────────────────────────────────────── */
function NavCard({ href, label, sub, icon, accentColor = "#0D9E6E", delay = 0 }) {
  return (
    <Link href={href} style={{ textDecoration: "none", flex: "1 1 140px" }}>
      <div
        style={{
          background: "#FFFFFF", borderRadius: 12, padding: "18px",
          border: "1px solid #E2E8F0", cursor: "pointer",
          transition: "all 0.2s ease",
          boxShadow: "0 2px 8px rgba(15,25,35,0.05)",
          animation: `fadeUp 0.5s ease ${delay}s both`,
          position: "relative", overflow: "hidden",
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 8px 24px ${accentColor}22`; e.currentTarget.style.borderColor = `${accentColor}55`; e.currentTarget.style.transform = "translateY(-3px)"; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(15,25,35,0.05)"; e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.transform = "translateY(0)"; }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 9, marginBottom: 12,
          background: `${accentColor}12`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: accentColor,
        }}>
          {icon}
        </div>
        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: "#0F1923", marginBottom: 4, letterSpacing: "-0.01em" }}>
          {label}
        </div>
        <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{sub}</div>
        <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: `${accentColor}55`, fontSize: 18, fontWeight: 300 }}>›</div>
      </div>
    </Link>
  );
}

/* ─────────────────────────────────────────
   SECONDARY PILL
───────────────────────────────────────── */
function SecondaryPill({ label, value, color, delay = 0 }) {
  // Ensure value is never undefined or NaN
  const displayValue = value !== undefined && value !== null && !isNaN(value) ? value : 0;

  return (
    <div style={{
      flex: "1 1 100px", background: "#FFFFFF",
      border: "1px solid #E2E8F0", borderRadius: 10,
      padding: "14px 16px", textAlign: "center",
      boxShadow: "0 1px 4px rgba(15,25,35,0.04)",
      animation: `fadeUp 0.5s ease ${delay}s both`,
    }}>
      <div style={{ fontSize: 9, color: "#94A3B8", letterSpacing: "0.12em", marginBottom: 6, fontFamily: "'JetBrains Mono',monospace" }}>{label}</div>
      <div style={{ fontSize: 20, color, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>{displayValue}</div>
    </div>
  );
}

/* ─────────────────────────────────────────
   LOADING STATE
───────────────────────────────────────── */
// LoadingState removed in favor of LoadingSpinner

/* ─────────────────────────────────────────
   CREATE TRADE DROPDOWN BUTTON
───────────────────────────────────────── */
function CreateTradeButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleOptionClick = (path) => {
    setIsOpen(false);
    router.push(path);
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "linear-gradient(135deg, #0F1923 0%, #1a2d3d 100%)",
          color: "#22C78E",
          borderRadius: 10,
          padding: "12px 20px",
          fontSize: 12,
          fontFamily: "'JetBrains Mono',monospace",
          fontWeight: 700,
          letterSpacing: "0.08em",
          boxShadow: "0 4px 16px rgba(15,25,35,0.25), 0 0 20px rgba(34,199,142,0.15)",
          border: "1px solid rgba(34,199,142,0.3)",
          cursor: "pointer",
          transition: "all 0.25s ease",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 6px 24px rgba(15,25,35,0.3), 0 0 30px rgba(34,199,142,0.25)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(15,25,35,0.25), 0 0 20px rgba(34,199,142,0.15)";
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
        CREATE JOURNAL
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{
          position: "absolute",
          top: "100%",
          right: 0,
          marginTop: 8,
          background: "#FFFFFF",
          borderRadius: 12,
          border: "1px solid #E2E8F0",
          boxShadow: "0 8px 32px rgba(15,25,35,0.15)",
          overflow: "hidden",
          minWidth: 220,
          zIndex: 100,
          animation: "fadeDown 0.2s ease",
        }}>
          {/* Option 1: Add Manually */}
          <button
            onClick={() => handleOptionClick("/add-trade")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              padding: "14px 18px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#F0EEE9"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "rgba(13,158,110,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0D9E6E",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
            <div>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#0F1923",
                fontFamily: "'Plus Jakarta Sans',sans-serif",
              }}>
                Add Entry Manually
              </div>
              <div style={{
                fontSize: 10,
                color: "#94A3B8",
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                marginTop: 2,
              }}>
                Fill in trade details by hand
              </div>
            </div>
          </button>

          {/* Divider */}
          <div style={{ height: 1, background: "#E2E8F0", margin: "0 12px" }} />

          {/* Option 2: Upload Screenshot */}
          <button
            onClick={() => handleOptionClick("/upload-trade")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              padding: "14px 18px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#F0EEE9"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "rgba(184,134,11,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#B8860B",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <div>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#0F1923",
                fontFamily: "'Plus Jakarta Sans',sans-serif",
              }}>
                Upload Screenshot
              </div>
              <div style={{
                fontSize: 10,
                color: "#94A3B8",
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                marginTop: 2,
              }}>
                AI will extract trade data
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50 }}
          onClick={() => setIsOpen(false)}
        />
      )}

      <style>{`
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN DASHBOARD
───────────────────────────────────────── */
export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState("");

  const fetchStats = async () => {
    const data = await getSummary();
    setStats(data);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    setMounted(true);
    fetchStats();
    const tick = () => setTime(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [router]);

  const profitBull = stats ? parseFloat(stats.totalProfit) >= 0 : true;
  const winBull = stats ? parseFloat(stats.winRate) >= 50 : true;

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

      {/* Candlestick BG */}
      <CandlestickBackground />

      {/* Subtle overlay to unify bg */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
        background: "linear-gradient(135deg, rgba(240,238,233,0.82) 0%, rgba(240,238,233,0.75) 100%)"
      }} />

      {/* ── HEADER ── */}
      <header style={{
        position: "relative", zIndex: 20,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 24px", minHeight: 60, flexWrap: "wrap", gap: 10,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid #E2E8F0",
        boxShadow: "0 1px 12px rgba(15,25,35,0.06)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}><img src="/logo.png" alt="Stratedge" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
          <div>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 800, letterSpacing: "0.04em", color: "#0F1923", lineHeight: 1 }}>
              STRATEDGE
            </div>
            <div style={{ fontSize: 9, letterSpacing: "0.18em", color: "#0D9E6E", marginTop: 1, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>
              FOREX AI JOURNAL
            </div>
          </div>
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <MarketSwitcher />

          <div style={{
            fontFamily: "'JetBrains Mono',monospace", fontSize: 12,
            color: "#4A5568", letterSpacing: "0.06em",
            background: "#F8F6F2", border: "1px solid #E2E8F0",
            borderRadius: 6, padding: "4px 10px",
          }}>
            {time}
          </div>

          <nav style={{ display: "flex", gap: 4 }}>
            {[
              { href: "/trades", label: "Journal" },
              { href: "/add-trade", label: "Log Trade" },
              { href: "/analytics", label: "Analytics" },
            ].map(n => (
              <Link key={n.href} href={n.href} style={{
                fontSize: 12, color: "#4A5568", fontWeight: 600,
                textDecoration: "none", padding: "5px 10px",
                borderRadius: 6, transition: "all 0.15s",
                fontFamily: "'Plus Jakarta Sans',sans-serif",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = "#F0EEE9"; e.currentTarget.style.color = "#0F1923"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#4A5568"; }}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
            <Link
              href="/profile"
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "#0F1923",
                border: "2px solid #E2E8F0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                textDecoration: "none"
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C78E" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      <TickerTape />

      {/* ── MAIN ── */}
      <main style={{
        position: "relative", zIndex: 5, padding: "28px 20px",
        maxWidth: 1080, margin: "0 auto",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(16px)",
        transition: "all 0.55s cubic-bezier(0.22,1,0.36,1)",
      }}>
        {!stats ? (
          <LoadingSpinner message="ANALYZING FOREX DATA..." />
        ) : (
          <>
            {/* Page Title */}
            <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 28, fontWeight: 800, color: "#0F1923", margin: 0, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
                  Trading <span style={{ color: "#0D9E6E" }}>Dashboard</span>
                </h1>
                <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 5, fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.06em" }}>
                  WELCOME BACK — YOUR AI JOURNAL OVERVIEW
                </p>
              </div>
              <CreateTradeButton />
            </div>

            {/* ── HERO STAT CARDS ── */}
            <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
              <StatCard
                label="TOTAL TRADES"
                value={stats.totalTrades}
                sub="All-time journal entries"
                accentColor="#0F1923"
                delay={0}
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>}
              />
              <StatCard
                label="TOTAL PROFIT"
                value={`${profitBull ? "+" : ""}$${parseFloat(stats.totalProfit).toFixed(2)}`}
                sub={profitBull ? "Account in profit ↑" : "Drawdown period ↓"}
                accentColor={profitBull ? "#0D9E6E" : "#D63B3B"}
                delay={0.07}
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
              />
              <StatCard
                label="WIN RATE"
                value={`${parseFloat(stats.winRate).toFixed(1)}%`}
                sub={winBull ? "Above breakeven — edge confirmed" : "Below 50% — review strategy"}
                accentColor={winBull ? "#0D9E6E" : "#D63B3B"}
                delay={0.14}
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>}
              />
            </div>

            {/* ── EQUITY CURVE ── */}
            <div style={{
              background: "#FFFFFF", borderRadius: 14,
              border: "1px solid #E2E8F0",
              overflow: "hidden", marginBottom: 16,
              boxShadow: "0 2px 12px rgba(15,25,35,0.05)",
              animation: "fadeUp 0.5s ease 0.18s both",
            }}>
              <div style={{ height: 3, background: `linear-gradient(90deg,${profitBull ? "#0D9E6E" : "#D63B3B"},${profitBull ? "#0D9E6E22" : "#D63B3B22"})` }} />
              <div style={{ padding: "16px 20px 4px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0F1923", fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: "-0.01em" }}>
                    Equity Curve
                  </div>
                  <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2, fontFamily: "'JetBrains Mono',monospace" }}>
                    OVERALL ACCOUNT PERFORMANCE
                  </div>
                </div>
                <div style={{ display: "flex", gap: 20 }}>
                  {[
                    { label: "PEAK", val: `+$${(parseFloat(stats.totalProfit) * 1.3).toFixed(2)}`, col: "#0D9E6E" },
                    { label: "CURRENT", val: `${profitBull ? "+" : ""}$${parseFloat(stats.totalProfit).toFixed(2)}`, col: profitBull ? "#0D9E6E" : "#D63B3B" },
                  ].map(m => (
                    <div key={m.label} style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 9, color: "#94A3B8", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono',monospace", marginBottom: 2 }}>{m.label}</div>
                      <div style={{ fontSize: 13, color: m.col, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>{m.val}</div>
                    </div>
                  ))}
                </div>
              </div>
              <EquityCurve bull={profitBull} />
            </div>

            {/* ── SECONDARY STAT PILLS ── */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", animation: "fadeUp 0.5s ease 0.22s both" }}>
              <SecondaryPill label="WINNING TRADES" value={stats.totalTrades ? Math.round(stats.totalTrades * (stats.winRate / 100)) : 0} color="#0D9E6E" delay={0.20} />
              <SecondaryPill label="LOSING TRADES" value={stats.totalTrades ? stats.totalTrades - Math.round(stats.totalTrades * (stats.winRate / 100)) : 0} color="#D63B3B" delay={0.24} />
              <SecondaryPill label="AVG WIN" value={`$${(stats.totalProfit / Math.max(1, stats.totalTrades ? stats.totalTrades * (stats.winRate / 100) : 1)).toFixed(0)}`} color="#0D9E6E" delay={0.28} />
              <SecondaryPill label="AI INSIGHTS" value={stats.totalTrades ? stats.totalTrades * 3 : 0} color="#B8860B" delay={0.32} />
            </div>

            {/* ── WIN RATE PROGRESS ── */}
            <div style={{
              background: "#FFFFFF", borderRadius: 14,
              border: "1px solid #E2E8F0", padding: "20px 22px", marginBottom: 16,
              boxShadow: "0 2px 10px rgba(15,25,35,0.04)",
              animation: "fadeUp 0.5s ease 0.26s both",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0F1923", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                    Win Rate Breakdown
                  </div>
                  <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2, fontFamily: "'JetBrains Mono',monospace" }}>
                    50% BREAKEVEN THRESHOLD
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: winBull ? "#0D9E6E" : "#D63B3B", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>
                    {parseFloat(stats.winRate).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 10, color: winBull ? "#0D9E6E" : "#D63B3B", fontFamily: "'JetBrains Mono',monospace", marginTop: 2, fontWeight: 600 }}>
                    {winBull ? "EDGE CONFIRMED ◆" : "REVIEW STRATEGY ▼"}
                  </div>
                </div>
              </div>
              {/* Bar */}
              <div style={{ height: 10, background: "#F0EEE9", borderRadius: 10, overflow: "hidden", position: "relative" }}>
                {/* Breakeven marker */}
                <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, background: "#CBD5E1", zIndex: 2 }} />
                <div style={{
                  height: "100%", borderRadius: 10,
                  width: `${Math.min(100, parseFloat(stats.winRate))}%`,
                  background: `linear-gradient(90deg,${winBull ? "#0D9E6E,#22C78E" : "#D63B3B,#F87171"})`,
                  boxShadow: `0 0 10px ${winBull ? "rgba(13,158,110,0.35)" : "rgba(214,59,59,0.35)"}`,
                  transition: "width 1.2s cubic-bezier(0.22,1,0.36,1)",
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 9, color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace" }}>0%</span>
                <span style={{ fontSize: 9, color: "#64748B", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>50% BREAKEVEN</span>
                <span style={{ fontSize: 9, color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace" }}>100%</span>
              </div>
            </div>

            {/* ── QUICK NAV ── */}
            <div style={{ marginBottom: 16, animation: "fadeUp 0.5s ease 0.30s both" }}>
              <div style={{ fontSize: 12, color: "#64748B", letterSpacing: "0.1em", marginBottom: 12, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>
                QUICK ACCESS
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <NavCard href="/trades" label="Trade Journal" sub="View all logged trades" accentColor="#0D9E6E" delay={0.32}
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>}
                />
                <NavCard href="/add-trade" label="Log New Trade" sub="Record a new entry" accentColor="#0D9E6E" delay={0.36}
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>}
                />
                <NavCard href="/analytics" label="AI Analytics" sub="Deep pattern analysis" accentColor="#B8860B" delay={0.40}
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>}
                />
                <NavCard href="/settings" label="Settings" sub="Preferences & profile" accentColor="#4A5568" delay={0.44}
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>}
                />
              </div>
            </div>

            {/* ── AI ENGINE BANNER ── */}
            <div style={{
              background: "linear-gradient(135deg,#0F1923 0%,#1a2d3d 100%)",
              borderRadius: 14, padding: "20px 24px",
              display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
              boxShadow: "0 4px 20px rgba(15,25,35,0.15)",
              animation: "fadeUp 0.5s ease 0.46s both",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9,
                  background: "rgba(34,199,142,0.15)", border: "1px solid rgba(34,199,142,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22C78E", animation: "blink 1.2s ease-in-out infinite" }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#22C78E", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.1em", fontWeight: 700 }}>
                    AI ENGINE
                  </div>
                  <div style={{ fontSize: 9, color: "#4A5568", fontFamily: "'JetBrains Mono',monospace", marginTop: 1 }}>ACTIVE</div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.7, flex: 1, margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                Based on your journal data, the AI engine is ready to surface patterns, entry timing insights, and risk suggestions.
              </p>
              <Link href="/analytics" style={{
                fontSize: 10, letterSpacing: "0.1em", color: "#0F1923",
                background: "linear-gradient(135deg,#0D9E6E,#22C78E)",
                borderRadius: 8, padding: "9px 16px", textDecoration: "none",
                fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, whiteSpace: "nowrap",
                boxShadow: "0 0 18px rgba(13,158,110,0.3)",
                flexShrink: 0,
              }}>
                VIEW REPORT →
              </Link>
            </div>
          </>
        )}
      </main>

      <style>{`
        @keyframes blink  { 0%,100%{opacity:1}  50%{opacity:0.2} }
        @keyframes spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing:border-box; margin:0; padding:0; }
        a:hover { opacity:0.9; }
        @media (max-width: 640px) {
          main { padding: 16px 12px !important; }
        }
      `}</style>
    </div>
  );
}