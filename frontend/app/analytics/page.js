"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MarketSwitcher from "@/components/MarketSwitcher";
import LoadingSpinner from "@/components/LoadingSpinner";
import InstallPWA from "@/components/InstallPWA";
import {
  getSummary,
  getRiskRewardAnalysis,
  getTradeDistribution,
  getPerformanceMetrics,
  getTimeAnalysis,
  getTradeQuality,
  getDrawdownAnalysis,
  getAIInsights
} from "@/services/analyticsApi";

/* ─────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────── */
const colors = {
  bull: "#0D9E6E",
  bear: "#D63B3B",
  gold: "#B8860B",
  primary: "#0F1923",
  secondary: "#4A5568",
  muted: "#94A3B8",
  bg: "#F0EEE9",
  card: "#FFFFFF",
  border: "#E2E8F0"
};

/* ─────────────────────────────────────────
   LOADING SKELETON
───────────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div style={{ padding: "40px 20px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ height: 40, width: 300, background: "#E2E8F0", borderRadius: 8, marginBottom: 24, animation: "pulse 1.5s infinite" }} />
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ flex: "1 1 200px", height: 120, background: "#E2E8F0", borderRadius: 12, animation: "pulse 1.5s infinite", animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   STAT CARD
───────────────────────────────────────── */
function StatCard({ label, value, sub, color = colors.primary, icon, delay = 0 }) {
  const cleanValue = typeof value === "string" ? value.replace(/[$,%]/g, "") : value;
  const isInfinite = cleanValue === "∞";
  const valueColor = color;

  return (
    <div style={{
      background: colors.card, borderRadius: 12, border: `1px solid ${colors.border}`,
      padding: "20px", boxShadow: "0 2px 12px rgba(15,25,35,0.06)",
      animation: `fadeUp 0.5s ease ${delay}s both`, flex: "1 1 180px", minWidth: 160
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <span style={{ fontSize: 10, color: colors.muted, letterSpacing: "0.12em", fontFamily: "'JetBrains Mono',monospace", fontWeight: 500 }}>
          {label}
        </span>
        {icon && <div style={{ width: 28, height: 28, borderRadius: 6, background: `${valueColor}12`, display: "flex", alignItems: "center", justifyContent: "center", color: valueColor }}>{icon}</div>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: valueColor, lineHeight: 1.2, marginBottom: 6 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: label.toLowerCase().includes("profit factor") && isInfinite ? colors.bull : colors.muted, letterSpacing: "0.06em", fontWeight: isInfinite ? 600 : 400 }}>
          {label.toLowerCase().includes("profit factor") && isInfinite ? "Perfect Edge" : sub}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   SECTION CARD
───────────────────────────────────────── */
function SectionCard({ title, subtitle, children, delay = 0, accentColor = colors.primary }) {
  return (
    <div style={{
      background: colors.card, borderRadius: 14, border: `1px solid ${colors.border}`,
      overflow: "hidden", boxShadow: "0 2px 12px rgba(15,25,35,0.05)",
      animation: `fadeUp 0.5s ease ${delay}s both`, flex: "1 1 350px", minWidth: 300
    }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accentColor}, ${accentColor}22)` }} />
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: colors.primary, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 10, color: colors.muted, marginTop: 2, fontFamily: "'JetBrains Mono',monospace" }}>{subtitle}</div>}
      </div>
      <div style={{ padding: "16px 20px" }}>{children}</div>
    </div>
  );
}

/* ─────────────────────────────────────────
   PROGRESS BAR
───────────────────────────────────────── */
function ProgressBar({ value, max = 100, color = colors.bull, label, showPercent = true }) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: colors.secondary, fontFamily: "'JetBrains Mono',monospace" }}>{label}</span>
        {showPercent && <span style={{ fontSize: 11, color, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}>{percent.toFixed(1)}%</span>}
      </div>
      <div style={{ height: 8, background: "#F0EEE9", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${percent}%`, background: `linear-gradient(90deg, ${color}, ${color}88)`, borderRadius: 4, transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   LIST ITEM
───────────────────────────────────────── */
function ListItem({ label, value, color = colors.primary, sub }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${colors.border}` }}>
      <div>
        <div style={{ fontSize: 12, color: colors.secondary, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: colors.muted }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color }}>{value}</div>
    </div>
  );
}

/* ─────────────────────────────────────────
   HEATMAP CELL
───────────────────────────────────────── */
function HeatMapCell({ value, maxValue, label, subLabel }) {
  const intensity = maxValue > 0 ? Math.abs(value) / maxValue : 0;
  const isPositive = value >= 0;
  const bgColor = isPositive
    ? `rgba(13, 158, 110, ${Math.max(0.15, intensity * 0.8)})`
    : `rgba(214, 59, 59, ${Math.max(0.15, intensity * 0.8)})`;
  const textColor = intensity > 0.5 ? "#fff" : colors.primary;

  return (
    <div style={{
      flex: 1, minWidth: 45, height: 60, background: bgColor, borderRadius: 6, margin: 2,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4px"
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: textColor, fontFamily: "'JetBrains Mono',monospace" }}>
        {value >= 0 ? "+" : ""}{typeof value === "number" ? value.toFixed(0) : value}
      </div>
      <div style={{ fontSize: 9, color: textColor, opacity: 0.9, marginTop: 2 }}>{label}</div>
      {subLabel && <div style={{ fontSize: 8, color: textColor, opacity: 0.7 }}>{subLabel}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────
   SESSION CARD
───────────────────────────────────────── */
function SessionCard({ name, data, isBest, isWorst }) {
  const profit = parseFloat(data.profit) || 0;
  const winRate = parseFloat(data.winRate) || 0;
  const isPositive = profit >= 0;

  let borderColor = colors.border;
  if (isBest) borderColor = colors.bull;
  if (isWorst) borderColor = colors.bear;

  return (
    <div style={{
      background: isBest ? "rgba(13, 158, 110, 0.05)" : isWorst ? "rgba(214, 59, 59, 0.05)" : colors.card,
      border: `2px solid ${borderColor}`,
      borderRadius: 10, padding: "14px", flex: "1 1 150px", minWidth: 140,
      position: "relative"
    }}>
      {isBest && <div style={{ position: "absolute", top: -8, right: 8, background: colors.bull, color: "#fff", fontSize: 8, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>BEST</div>}
      {isWorst && <div style={{ position: "absolute", top: -8, right: 8, background: colors.bear, color: "#fff", fontSize: 8, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>WORST</div>}
      <div style={{ fontSize: 11, fontWeight: 600, color: colors.primary, marginBottom: 8 }}>{name}</div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: colors.muted }}>Profit</span>
        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: isPositive ? colors.bull : colors.bear }}>
          {isPositive ? "+" : ""}${profit.toFixed(2)}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, color: colors.muted }}>Win Rate</span>
        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: winRate >= 50 ? colors.bull : colors.bear }}>
          {winRate}%
        </span>
      </div>
      <div style={{ fontSize: 9, color: colors.muted, marginTop: 6 }}>{data.total || 0} trades</div>
    </div>
  );
}

/* ─────────────────────────────────────────
   AI INSIGHT TAG
───────────────────────────────────────── */
function InsightTag({ text, type = "info" }) {
  const colorsMap = {
    info: { bg: "#EFF6FF", border: "#93C5FD", text: "#1D4ED8" },
    success: { bg: "#ECFDF5", border: "#6EE7B7", text: "#059669" },
    warning: { bg: "#FEF3C7", border: "#FCD34D", text: "#D97706" },
    danger: { bg: "#FEE2E2", border: "#FCA5A5", text: "#DC2626" }
  };
  const c = colorsMap[type] || colorsMap.info;

  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: "10px 14px",
      display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8
    }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.text, marginTop: 5, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: c.text, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN ANALYTICS PAGE
───────────────────────────────────────── */
export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    summary: null,
    riskReward: null,
    distribution: null,
    performance: null,
    timeAnalysis: null,
    quality: null,
    drawdown: null,
    aiInsights: null
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetchAllData();
  }, [router]);

  const fetchAllData = async () => {
    try {
      const [summary, riskReward, distribution, performance, timeAnalysis, quality, drawdown, aiInsights] = await Promise.all([
        getSummary(),
        getRiskRewardAnalysis(),
        getTradeDistribution(),
        getPerformanceMetrics(),
        getTimeAnalysis(),
        getTradeQuality(),
        getDrawdownAnalysis(),
        getAIInsights()
      ]);

      setData({ summary, riskReward, distribution, performance, timeAnalysis, quality, drawdown, aiInsights });
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <LoadingSpinner message="CRUNCHING STATISTICS..." fullPage />
    </div>
  );

  const { summary, riskReward, distribution, performance, timeAnalysis, quality, drawdown, aiInsights } = data;

  // Calculate max values for heatmaps
  const dayMaxProfit = timeAnalysis?.byDay ? Math.max(...Object.values(timeAnalysis.byDay).map(d => Math.abs(parseFloat(d.profit) || 0)), 100) : 100;
  const sessionMaxProfit = timeAnalysis?.bySession ? Math.max(...Object.values(timeAnalysis.bySession).map(s => Math.abs(parseFloat(s.profit) || 0)), 100) : 100;

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, fontFamily: "'Plus Jakarta Sans',sans-serif", color: colors.primary, paddingBottom: 40 }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>

      {/* Header */}
      <header style={{
        background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${colors.border}`,
        padding: "10px 24px", minHeight: 60, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 1px 12px rgba(15,25,35,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/dashboard" style={{ textDecoration: "none", color: colors.primary, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}><img src="/logo.png" alt="Stratedge" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
            <div>
              <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 800, letterSpacing: "0.04em", color: colors.primary, lineHeight: 1 }}>
                STRATEDGE
              </div>
              <div style={{ fontSize: 9, letterSpacing: "0.18em", color: colors.bull, marginTop: 1, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>
                FOREX AI JOURNAL
              </div>
            </div>
          </Link>
        </div>

        <nav style={{ display: "flex", gap: 4 }}>
          {[
            { href: "/trades", label: "Journal" },
            { href: "/add-trade", label: "Log Trade" },
            { href: "/analytics", label: "Analytics" },
            { href: "/weekly-reports?market=Forex", label: "Weekly AI" },
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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <InstallPWA />
          <MarketSwitcher />
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
              color: colors.bear, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600,
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

      <div style={{ padding: "24px 20px", maxWidth: 1200, margin: "0 auto" }}>

        {/* AI Insights Section */}
        {aiInsights && (
          <div style={{ marginBottom: 24, animation: "fadeUp 0.5s ease both" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: colors.gold, letterSpacing: "0.1em", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors.gold, animation: "pulse 2s infinite" }} />
              AI POWERED INSIGHTS
            </div>

            {/* Textual bullets from backend */}
            {aiInsights.insights && aiInsights.insights.length > 0 && aiInsights.insights.slice(0, 4).map((insight, i) => (
              <InsightTag
                key={i}
                text={insight}
                type={insight.includes("🔥") || insight.includes("💰") || insight.includes("🌏") ? "success" : insight.includes("⚠️") ? "warning" : "info"}
              />
            ))}

            {/* Behavior & discipline quick view */}
            {aiInsights.behaviorDiscipline && (
              <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <StatCard
                  label="PLAN VS EMOTION"
                  value={`${aiInsights.behaviorDiscipline.ruleEmotion?.planPct || 0}%`}
                  sub={`Plan trades • Emotion: ${aiInsights.behaviorDiscipline.ruleEmotion?.emotionPct || 0}%`}
                  color={parseFloat(aiInsights.behaviorDiscipline.ruleEmotion?.planPct || 0) >= 70 ? colors.bull : colors.bear}
                  delay={0.05}
                />
                <StatCard
                  label="REVENGE TRADES"
                  value={aiInsights.behaviorDiscipline.revengeTradesCount || 0}
                  sub="Size increased right after a loss"
                  color={(aiInsights.behaviorDiscipline.revengeTradesCount || 0) > 0 ? colors.bear : colors.bull}
                  delay={0.1}
                />
              </div>
            )}

            {/* If advanced analytics are not available yet (too few trades) */}
            {!aiInsights.behaviorDiscipline && (
              <div style={{
                marginTop: 12,
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px dashed ${colors.border}`,
                background: "#F8FAFC",
                fontSize: 11,
                color: colors.secondary
              }}>
                Advanced behavior, session and weekly coaching analytics unlock after you log at least 5 Forex trades with proper details (plan tag, session, strategy). Keep journaling a few more trades to see those sections.
              </div>
            )}
          </div>
        )}

        {/* Core Metrics Row */}
        <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
          <StatCard
            label="TOTAL PROFIT"
            value={`$${parseFloat(summary?.totalProfit || 0).toFixed(2)}`}
            sub={summary?.netProfit ? `Net: $${summary.netProfit}` : "After costs"}
            color={parseFloat(summary?.totalProfit || 0) >= 0 ? colors.bull : colors.bear}
            delay={0}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
          />
          <StatCard
            label="WIN RATE"
            value={`${summary?.winRate || 0}%`}
            sub={`${summary?.winningTrades || 0}W / ${summary?.losingTrades || 0}L`}
            color={parseFloat(summary?.winRate || 0) >= 50 ? colors.bull : colors.bear}
            delay={0.05}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>}
          />
          <StatCard
            label="AVG WIN"
            value={`$${summary?.avgWin || 0}`}
            sub="Per winning trade"
            color={colors.bull}
            delay={0.1}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /></svg>}
          />
          <StatCard
            label="AVG LOSS"
            value={`$${summary?.avgLoss || 0}`}
            sub="Per losing trade"
            color={colors.bear}
            delay={0.15}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /></svg>}
          />
        </div>

        {/* Session Performance Cards - Best/Worst/Highest WR */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: colors.gold, letterSpacing: "0.1em", marginBottom: 12 }}>
            📊 SESSION PERFORMANCE
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {/* Best Session */}
            <div style={{
              background: colors.card, borderRadius: 12, border: `2px solid ${colors.bull}`,
              padding: "16px", flex: "1 1 200px", minWidth: 180,
              animation: "fadeUp 0.5s ease 0.2s both"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 10, color: colors.bull, fontWeight: 700, letterSpacing: "0.1em" }}>🏆 BEST SESSION</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: colors.bull, marginBottom: 8 }}>
                {timeAnalysis?.bestSession?.name || "0"}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 10, color: colors.muted }}>Profit</div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: parseFloat(timeAnalysis?.bestSession?.profit || 0) >= 0 ? colors.bull : colors.bear }}>
                    {parseFloat(timeAnalysis?.bestSession?.profit || 0) >= 0 ? "+" : ""}${parseFloat(timeAnalysis?.bestSession?.profit || 0).toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: colors.muted }}>Win Rate</div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: parseFloat(timeAnalysis?.bestSession?.winRate || 0) >= 50 ? colors.bull : colors.bear }}>
                    {timeAnalysis?.bestSession?.winRate || 0}%
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 10, color: colors.muted, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${colors.border}` }}>
                {timeAnalysis?.bestSession?.trades || 0} trades
              </div>
            </div>

            {/* Worst Session */}
            <div style={{
              background: colors.card, borderRadius: 12, border: `2px solid ${colors.bear}`,
              padding: "16px", flex: "1 1 200px", minWidth: 180,
              animation: "fadeUp 0.5s ease 0.25s both"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 10, color: colors.bear, fontWeight: 700, letterSpacing: "0.1em" }}>📉 WORST SESSION</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: colors.bear, marginBottom: 8 }}>
                {timeAnalysis?.worstSession?.name || "0"}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 10, color: colors.muted }}>Profit</div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: parseFloat(timeAnalysis?.worstSession?.profit || 0) >= 0 ? colors.bull : colors.bear }}>
                    {parseFloat(timeAnalysis?.worstSession?.profit || 0) >= 0 ? "+" : ""}${parseFloat(timeAnalysis?.worstSession?.profit || 0).toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: colors.muted }}>Win Rate</div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: parseFloat(timeAnalysis?.worstSession?.winRate || 0) >= 50 ? colors.bull : colors.bear }}>
                    {timeAnalysis?.worstSession?.winRate || 0}%
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 10, color: colors.muted, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${colors.border}` }}>
                {timeAnalysis?.worstSession?.trades || 0} trades
              </div>
            </div>

            {/* Highest Win Rate */}
            <div style={{
              background: colors.card, borderRadius: 12, border: `2px solid ${colors.gold}`,
              padding: "16px", flex: "1 1 200px", minWidth: 180,
              animation: "fadeUp 0.5s ease 0.3s both"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 10, color: colors.gold, fontWeight: 700, letterSpacing: "0.1em" }}>📈 HIGHEST WIN RATE</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: colors.primary, marginBottom: 8 }}>
                {timeAnalysis?.bestSessionWR?.name || "0"}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 10, color: colors.muted }}>Win Rate</div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: parseFloat(timeAnalysis?.bestSessionWR?.winRate || 0) >= 50 ? colors.bull : colors.bear }}>
                    {timeAnalysis?.bestSessionWR?.winRate || 0}%
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: colors.muted }}>Trades</div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: colors.secondary }}>
                    {timeAnalysis?.bestSessionWR?.trades || 0}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 10, color: colors.muted, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${colors.border}` }}>
                {timeAnalysis?.bestSessionWR?.name?.includes("Asia") ? "🌏" : timeAnalysis?.bestSessionWR?.name?.includes("London") ? "🌍" : timeAnalysis?.bestSessionWR?.name?.includes("NY") ? "🌎" : "⏰"} Session
              </div>
            </div>
          </div>
        </div>

        {/* Day of Week Heatmap */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <SectionCard title="Day of Week Performance" subtitle="PROFIT BY DAY (CLICK FOR DETAILS)" delay={0.5} accentColor={colors.bull}>
            {timeAnalysis?.byDay && (
              <div style={{ display: "flex", gap: 4 }}>
                {Object.entries(timeAnalysis.byDay).map(([day, data]) => (
                  <HeatMapCell
                    key={day}
                    value={parseFloat(data.profit) || 0}
                    maxValue={dayMaxProfit}
                    label={day.substring(0, 3)}
                    subLabel={`${data.winRate}%`}
                  />
                ))}
              </div>
            )}
          </SectionCard>

          {/* Best/Worst Times */}
          <SectionCard title="Timing Insights" subtitle="OPTIMAL TRADING WINDOWS" delay={0.55} accentColor={colors.gold}>
            {timeAnalysis && (
              <div>
                <ListItem
                  label="🏆 Best Day (Profit)"
                  value={timeAnalysis.bestDay?.name && timeAnalysis.bestDay?.name !== "0" ? `$${timeAnalysis.bestDay?.profit || 0}` : "0"}
                  color={colors.bull}
                  sub={timeAnalysis.bestDay?.name && timeAnalysis.bestDay?.name !== "0" ? timeAnalysis.bestDay?.name : "Need more data"}
                />
                <ListItem
                  label="📉 Worst Day (Profit)"
                  value={timeAnalysis.worstDay?.name && timeAnalysis.worstDay?.name !== "0" ? `$${timeAnalysis.worstDay?.profit || 0}` : "0"}
                  color={colors.bear}
                  sub={timeAnalysis.worstDay?.name && timeAnalysis.worstDay?.name !== "0" ? timeAnalysis.worstDay?.name : "Need more data"}
                />
                <ListItem
                  label="🕐 Best Hour (Profit)"
                  value={timeAnalysis.bestHour?.hour !== undefined && timeAnalysis.bestHour?.hour !== 0 ? `$${timeAnalysis.bestHour?.profit || 0}` : "0"}
                  color={colors.bull}
                  sub={timeAnalysis.bestHour?.hour !== undefined && timeAnalysis.bestHour?.hour !== 0 ? `${timeAnalysis.bestHour?.hour}:00` : "Need more data"}
                />
                <ListItem
                  label="⚠️ Worst Hour (Profit)"
                  value={timeAnalysis.worstHour?.hour !== undefined && timeAnalysis.worstHour?.hour !== 0 ? `$${timeAnalysis.worstHour?.profit || 0}` : "0"}
                  color={colors.bear}
                  sub={timeAnalysis.worstHour?.hour !== undefined && timeAnalysis.worstHour?.hour !== 0 ? `${timeAnalysis.worstHour?.hour}:00` : "Need more data"}
                />
              </div>
            )}
          </SectionCard>

          {/* Session Summary */}
          <SectionCard title="Session Summary" subtitle="BEST & WORST SESSIONS" delay={0.6} accentColor={colors.primary}>
            {timeAnalysis && timeAnalysis.bestSession && (
              <div>
                <ListItem
                  label="🌟 Best Session"
                  value={`$${timeAnalysis.bestSession?.profit || 0}`}
                  color={colors.bull}
                  sub={`${timeAnalysis.bestSession?.name} • ${timeAnalysis.bestSession?.winRate}% WR • ${timeAnalysis.bestSession?.trades} trades`}
                />
                <ListItem
                  label="📉 Worst Session"
                  value={`$${timeAnalysis.worstSession?.profit || 0}`}
                  color={colors.bear}
                  sub={`${timeAnalysis.worstSession?.name} • ${timeAnalysis.worstSession?.winRate}% WR • ${timeAnalysis.worstSession?.trades} trades`}
                />
                <ListItem
                  label="📈 Highest Win Rate"
                  value={`${timeAnalysis.bestSessionWR?.winRate || 0}%`}
                  color={colors.gold}
                  sub={timeAnalysis.bestSessionWR?.name}
                />
              </div>
            )}
          </SectionCard>
        </div>

        {/* Performance & Risk Row */}
        <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
          <StatCard
            label="PROFIT FACTOR"
            value={performance?.profitFactor || "0.00"}
            sub={performance?.profitFactor === "∞" ? "Healthy ratio" : (parseFloat(performance?.profitFactor || 0) >= 1.5 ? "Healthy ratio" : "Needs improvement")}
            color={performance?.profitFactor === "∞" || parseFloat(performance?.profitFactor || 0) >= 1.5 ? colors.bull : colors.bear}
            delay={0.2}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" /></svg>}
          />
          <StatCard
            label="EXPECTANCY"
            value={`$${performance?.expectancy || 0}`}
            sub="Per trade"
            color={parseFloat(performance?.expectancy || 0) >= 0 ? colors.bull : colors.bear}
            delay={0.25}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>}
          />
          <StatCard
            label="AVG R:R"
            value={`1:${riskReward?.avgRR || 0}`}
            sub={riskReward?.tradesWithRR > 0 ? `Planned R:R` : `Realized R:R (from P/L)`}
            color={parseFloat(riskReward?.avgRR || 0) >= 1.5 ? colors.bull : colors.secondary}
            delay={0.3}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>}
          />
          <StatCard
            label="MAX DRAWDOWN"
            value={`$${drawdown?.maxDrawdown || 0}`}
            sub={`${drawdown?.maxDrawdownPercent || 0}% from peak`}
            color={colors.bear}
            delay={0.35}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></svg>}
          />
        </div>

        {/* Streaks & Quality Row */}
        <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
          <StatCard
            label="WIN STREAK"
            value={performance?.maxWinStreak || 0}
            sub="Consecutive wins"
            color={colors.bull}
            delay={0.4}
          />
          <StatCard
            label="LOSS STREAK"
            value={performance?.maxLossStreak || 0}
            sub="Consecutive losses"
            color={colors.bear}
            delay={0.45}
          />
          <StatCard
            label="QUALITY SCORE"
            value={`${quality?.qualityScore || 0}/100`}
            sub="Trade quality rating"
            color={parseInt(quality?.qualityScore || 0) >= 70 ? colors.bull : colors.gold}
            delay={0.5}
          />
          <StatCard
            label="TOTAL COSTS"
            value={`$${summary?.totalCosts || 0}`}
            sub="Commissions + Swaps"
            color={colors.secondary}
            delay={0.55}
          />
        </div>

        {/* Distribution Charts */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>

          {/* By Currency Pair */}
          <SectionCard title="Performance by Pair" subtitle="WIN RATE DISTRIBUTION" delay={0.5} accentColor={colors.bull}>
            {distribution?.byPair && Object.entries(distribution.byPair).length > 0 ? (
              <div>
                {Object.entries(distribution.byPair)
                  .sort((a, b) => parseFloat(b[1].profit) - parseFloat(a[1].profit))
                  .slice(0, 6)
                  .map(([pair, data]) => (
                    <div key={pair} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{pair}</span>
                        <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: parseFloat(data.profit) >= 0 ? colors.bull : colors.bear }}>
                          {parseFloat(data.profit) >= 0 ? "+" : ""}${parseFloat(data.profit).toFixed(2)}
                        </span>
                      </div>
                      <ProgressBar value={parseFloat(data.winRate)} max={100} color={parseFloat(data.winRate) >= 50 ? colors.bull : colors.bear} label={`${data.wins}W / ${data.losses}L • ${data.winRate}%`} />
                    </div>
                  ))}
              </div>
            ) : (
              <div style={{ color: colors.muted, textAlign: "center", padding: 20 }}>No pair data available</div>
            )}
          </SectionCard>

          {/* By Trade Type */}
          <SectionCard title="BUY vs SELL Performance" subtitle="TRADE TYPE ANALYSIS" delay={0.55} accentColor={colors.gold}>
            {distribution?.byType && (
              <div>
                {Object.entries(distribution.byType).map(([type, data]) => (
                  <div key={type} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: type === "BUY" ? colors.bull : colors.bear }}>{type}</span>
                      <span style={{ fontSize: 11, color: colors.muted }}>{data.total} trades</span>
                    </div>
                    <ProgressBar value={parseFloat(data.winRate)} max={100} color={parseFloat(data.winRate) >= 50 ? colors.bull : colors.bear} label={`${data.winRate}% win rate`} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: colors.muted, marginTop: 4 }}>
                      <span>Profit: <span style={{ color: parseFloat(data.profit) >= 0 ? colors.bull : colors.bear }}>${parseFloat(data.profit).toFixed(2)}</span></span>
                      <span>{data.wins}W / {data.losses}L</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* By Strategy */}
          <SectionCard title="Strategy Performance" subtitle="BEST PERFORMERS" delay={0.6} accentColor={colors.primary}>
            {distribution?.byStrategy && Object.keys(distribution.byStrategy).length > 0 ? (
              <div>
                {Object.entries(distribution.byStrategy)
                  .sort((a, b) => parseFloat(b[1].profit) - parseFloat(a[1].profit))
                  .slice(0, 5)
                  .map(([strategy, data]) => (
                    <ListItem
                      key={strategy}
                      label={strategy}
                      value={`${data.winRate}%`}
                      color={parseFloat(data.winRate) >= 50 ? colors.bull : colors.bear}
                      sub={`$${parseFloat(data.profit).toFixed(2)} • ${data.total} trades`}
                    />
                  ))}
              </div>
            ) : (
              <div style={{ color: colors.muted, textAlign: "center", padding: 20 }}>No strategy data</div>
            )}
          </SectionCard>
        </div>

        {/* Trade Quality & Drawdown */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>

          {/* Drawdown Details */}
          <SectionCard title="Drawdown Analysis" subtitle="RISK METRICS" delay={0.8} accentColor={colors.bear}>
            {drawdown && (
              <div>
                <ListItem label="Current Drawdown" value={`$${drawdown.currentDrawdown}`} color={colors.bear} sub={`${drawdown.currentDrawdownPercent}%`} />
                <ListItem label="Maximum Drawdown" value={`$${drawdown.maxDrawdown}`} color={colors.bear} sub={`${drawdown.maxDrawdownPercent}% peak loss`} />
                <ListItem label="Recovery Factor" value={drawdown.recoveryFactor} color={parseFloat(drawdown.recoveryFactor) >= 1 ? colors.bull : colors.gold} sub="Profit / Max DD" />
                <ListItem label="Peak Balance" value={`$${drawdown.peakBalance}`} color={colors.primary} />
                <ListItem label="Current Balance" value={`$${drawdown.currentBalance}`} color={colors.primary} />
              </div>
            )}
          </SectionCard>

          {/* AI Recommendations + Weekly Coaching */}
          <SectionCard title="AI Recommendations" subtitle="ACTIONABLE INSIGHTS" delay={0.85} accentColor={colors.gold}>
            {aiInsights?.recommendations && aiInsights.recommendations.length > 0 ? (
              <div style={{ marginBottom: 12 }}>
                {aiInsights.recommendations.slice(0, 5).map((rec, i) => (
                  <InsightTag key={i} text={rec} type={rec.includes("⚠️") ? "warning" : "success"} />
                ))}
              </div>
            ) : (
              <div style={{ color: colors.muted, textAlign: "center", padding: 12 }}>Keep trading to get recommendations</div>
            )}

            {/* Next week checklist from backend (weekly narrative hidden) */}
            {Array.isArray(aiInsights?.nextWeekChecklist) && aiInsights.nextWeekChecklist.length > 0 && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: colors.secondary, marginBottom: 4 }}>
                  Next Week Checklist
                </div>
                <ul style={{ paddingLeft: 18, margin: 0 }}>
                  {aiInsights.nextWeekChecklist.slice(0, 3).map((item, idx) => (
                    <li key={idx} style={{ fontSize: 11, color: colors.muted, marginBottom: 2 }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </SectionCard>

          {/* Quick Stats */}
          <SectionCard title="Quick Stats" subtitle="KEY NUMBERS" delay={0.9} accentColor={colors.primary}>
            {performance && (
              <div>
                <ListItem label="Largest Win" value={`$${performance.largestWin}`} color={colors.bull} />
                <ListItem label="Largest Loss" value={`$${performance.largestLoss}`} color={colors.bear} />
                <ListItem label="Total Wins" value={performance.totalWins} color={colors.bull} sub={`${performance.winningTradesCount} trades`} />
                <ListItem label="Total Losses" value={performance.totalLosses} color={colors.bear} sub={`${performance.losingTradesCount} trades`} />
                <ListItem label="Risk-Adjusted" value={riskReward?.riskAdjustedReturn || 0} color={colors.gold} sub="Return/StdDev" />
              </div>
            )}
          </SectionCard>
        </div>

        {/* Back to Dashboard */}
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <Link href="/dashboard" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: colors.primary, color: "#fff", padding: "12px 24px",
            borderRadius: 8, textDecoration: "none", fontSize: 12, fontWeight: 600,
            fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.08em",
            boxShadow: "0 4px 16px rgba(15,25,35,0.2)"
          }}>
            ← BACK TO DASHBOARD
          </Link>
        </div>

      </div>
    </div>
  );
}
