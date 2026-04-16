"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen, BarChart2, Cpu, CheckSquare, Target, FileText,
} from "lucide-react";
import CandlestickBackground from "@/features/shared/components/CandlestickBackground";
import TickerTape            from "@/features/shared/components/TickerTape";
import PageHeader            from "@/features/shared/components/PageHeader";
import { useClock }          from "@/features/shared/hooks/useClock";
import StatCard              from "@/features/dashboard/components/StatCard";
import EquityCurve           from "@/features/dashboard/components/EquityCurve";
import CreateTradeButton     from "@/features/dashboard/components/CreateTradeButton";
import WelcomeGuide          from "@/features/dashboard/components/WelcomeGuide";
import { useDashboard }      from "@/features/dashboard/hooks/useDashboard";
import { Skeleton }          from "@/features/shared";

// ── Feature cards ─────────────────────────────────────────────────────────────
const NAV_CARDS = [
  {
    href: "/trades",
    Icon: BookOpen,
    label: "Journal",
    sub: "Browse all logged trades",
    color: "#0D9E6E",
    bg: "#F0FDF4",
  },
  {
    href: "/analytics",
    Icon: BarChart2,
    label: "Analytics",
    sub: "In-depth performance charts",
    color: "#B8860B",
    bg: "#FFFBEB",
  },
  {
    href: "/upload-trade",
    Icon: Cpu,
    label: "AI Extractor",
    sub: "Import from screenshot",
    color: "#EC4899",
    bg: "#FDF2F8",
  },
  {
    href: "/checklist",
    Icon: CheckSquare,
    label: "Checklist",
    sub: "Pre-trade rule check",
    color: "#6366F1",
    bg: "#EEF2FF",
  },
  {
    href: "/setups",
    Icon: Target,
    label: "Setups",
    sub: "Strategies & playbooks",
    color: "#14B8A6",
    bg: "#F0FDFA",
  },
  {
    href: "/weekly-reports?market=Forex",
    Icon: FileText,
    label: "AI Reports",
    sub: "Weekly coaching insights",
    color: "#0D9E6E",
    bg: "#F0FDF4",
  },
];

// ── Build KPI cards from API response ─────────────────────────────────────────
function buildStats(s) {
  const total   = s?.totalTrades   ?? 0;
  const winRate = s?.winRate       ?? 0;
  const netPnl  = s?.netPnL       ?? s?.totalProfit ?? 0;
  const streak  = s?.currentStreak ?? 0;

  return [
    {
      label: "Total Trades",
      value: total,
      sub: "trades logged",
      accentColor: "#0D9E6E",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      ),
    },
    {
      label: "Win Rate",
      value: `${winRate}%`,
      sub: "of trades profitable",
      accentColor: winRate >= 50 ? "#0D9E6E" : "#D63B3B",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ),
    },
    {
      label: "Net P&L",
      value: `${netPnl >= 0 ? "+" : ""}$${Math.abs(Number(netPnl)).toFixed(2)}`,
      sub: "total return",
      accentColor: netPnl >= 0 ? "#0D9E6E" : "#D63B3B",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      ),
    },
    {
      label: "Win Streak",
      value: streak,
      sub: "consecutive wins",
      accentColor: "#B8860B",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ),
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────

function DashboardContent() {
  const { stats, mounted, loading, showWelcome, closeWelcome } = useDashboard();
  const clock     = useClock();
  const statCards = buildStats(stats);
  const netPnl    = stats?.netPnL ?? stats?.totalProfit ?? 0;
  const showSkeleton = mounted && loading;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F4F2EE",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Plus Jakarta Sans',sans-serif",
      color: "#0F1923",
      position: "relative",
    }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <CandlestickBackground canvasId="dash-bg-canvas" />

      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <PageHeader showMarketSwitcher showClock clock={clock} />
        <TickerTape />

        <main style={{
          flex: 1,
          maxWidth: 1200, width: "100%",
          margin: "0 auto",
          padding: "28px 24px",
          boxSizing: "border-box",
        }}>

          {/* ── Page title ───────────────────────────────────────── */}
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24, flexWrap: "wrap", gap: 10,
            opacity: mounted ? 1 : 0, transition: "opacity 0.4s",
          }}>
            <div>
              <h1 style={{
                fontSize: 20, fontWeight: 800, color: "#0F1923",
                letterSpacing: "-0.02em", margin: 0,
              }}>
                Dashboard
              </h1>
              <p style={{
                fontSize: 12, color: "#94A3B8",
                fontFamily: "'JetBrains Mono',monospace",
                margin: "4px 0 0", letterSpacing: "0.04em",
              }}>
                Overview of your trading activity
              </p>
            </div>
            <CreateTradeButton />
          </div>

          {/* ── KPI stat cards ───────────────────────────────────── */}
          <div className="dash-kpi-grid" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 14, marginBottom: 20,
          }}>
            {statCards.map((s, i) => (
              <StatCard key={s.label} {...s} loading={loading} delay={i * 0.07} />
            ))}
          </div>

          {/* ── Equity curve (full width) ────────────────────────── */}
          <div style={{
            background: "#FFFFFF",
            borderRadius: 14,
            border: "1px solid #E2E8F0",
            overflow: "hidden",
            boxShadow: "0 2px 12px rgba(15,25,35,0.05)",
            marginBottom: 20,
          }}>
            <div style={{
              height: 3,
              background: `linear-gradient(90deg, ${netPnl >= 0 ? "#0D9E6E" : "#D63B3B"}, transparent)`,
            }} />
            <div style={{ padding: "18px 22px" }}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: 16,
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0F1923" }}>
                    Equity Curve
                  </div>
                  <div style={{
                    fontSize: 11, color: "#94A3B8",
                    fontFamily: "'JetBrains Mono',monospace", marginTop: 2,
                  }}>
                    Account growth over time
                  </div>
                </div>
                {showSkeleton ? (
                  <Skeleton width="60px" height="12px" />
                ) : (
                  <span style={{
                    fontSize: 11,
                    color: netPnl >= 0 ? "#0D9E6E" : "#D63B3B",
                    fontFamily: "'JetBrains Mono',monospace",
                    fontWeight: 700,
                    background: netPnl >= 0 ? "rgba(13,158,110,0.08)" : "rgba(214,59,59,0.08)",
                    border: `1px solid ${netPnl >= 0 ? "rgba(13,158,110,0.2)" : "rgba(214,59,59,0.2)"}`,
                    borderRadius: 6, padding: "3px 10px",
                  }}>
                    {netPnl >= 0 ? "▲ BULLISH" : "▼ BEARISH"}
                  </span>
                )}
              </div>
              <div style={{ height: 220, position: "relative" }}>
                {showSkeleton ? (
                  <Skeleton width="100%" height="100%" variant="rect" />
                ) : (
                  <EquityCurve bull={netPnl >= 0} />
                )}
              </div>
            </div>
          </div>

          {/* ── Feature cards grid ───────────────────────────────── */}
          <div className="dash-nav-grid" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 14,
          }}>
            {NAV_CARDS.map((c, i) => (
              <Link key={c.href} href={c.href}
                className="feat-card"
                style={{
                  background: "#FFFFFF",
                  borderRadius: 12,
                  border: "1px solid #E2E8F0",
                  padding: "18px 16px",
                  textDecoration: "none",
                  boxShadow: "0 1px 6px rgba(15,25,35,0.04)",
                  transition: "all 0.2s",
                  animation: `fadeUp 0.35s ease ${0.3 + i * 0.05}s both`,
                  display: "flex", flexDirection: "column", gap: 12,
                }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: c.bg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: c.color,
                }}>
                  <c.Icon size={20} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0F1923", marginBottom: 3 }}>
                    {c.label}
                  </div>
                  <div style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.4 }}>
                    {c.sub}
                  </div>
                </div>
              </Link>
            ))}
          </div>

        </main>
      </div>

      {showWelcome && <WelcomeGuide onClose={closeWelcome} />}

      <style jsx global>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .feat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(15,25,35,0.08) !important;
          border-color: #CBD5E0 !important;
        }
        @media (max-width: 640px) {
          main { padding: 16px !important; }
          .dash-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .dash-nav-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 360px) {
          .dash-kpi-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export default function DashboardPage() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return null;
  }

  return <Suspense><DashboardContent /></Suspense>;
}
