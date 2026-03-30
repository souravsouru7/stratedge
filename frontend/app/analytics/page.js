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
  getAIInsights,
  getPsychologyAnalytics
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
  
  // Fix negative currency formatting: "$-41.28" -> "-$41.28"
  const formattedValue = typeof value === "string" && value.startsWith("$-") 
    ? "-$" + value.substring(2) 
    : value;

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
        {formattedValue}
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
        {showPercent && !label?.includes("%") && <span style={{ fontSize: 11, color, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}>{percent.toFixed(1)}%</span>}
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
  // Fix negative currency formatting: "$-41.28" -> "-$41.28"
  const formattedValue = typeof value === "string" && value.startsWith("$-") 
    ? "-$" + value.substring(2) 
    : value;

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${colors.border}` }}>
      <div>
        <div style={{ fontSize: 12, color: colors.secondary, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: colors.muted }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color }}>{formattedValue}</div>
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

function shiftMonth(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function formatCalendarMonth(date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getCalendarModel(byDate = {}, activeMonth = new Date()) {
  const firstDay = new Date(activeMonth.getFullYear(), activeMonth.getMonth(), 1);
  const lastDay = new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const cells = [];
  const monthEntries = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push({ type: "empty", key: `empty-start-${i}` });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${activeMonth.getFullYear()}-${String(activeMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const entry = byDate?.[key] || null;
    if (entry) monthEntries.push(entry);
    cells.push({
      type: "day",
      key,
      day,
      entry,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ type: "empty", key: `empty-end-${cells.length}` });
  }

  const maxAbsProfit = monthEntries.length > 0
    ? Math.max(...monthEntries.map((entry) => Math.abs(Number(entry.profit) || 0)), 1)
    : 1;
  const totalProfit = monthEntries.reduce((sum, entry) => sum + (Number(entry.profit) || 0), 0);
  const totalTrades = monthEntries.reduce((sum, entry) => sum + (Number(entry.total) || 0), 0);

  return {
    cells,
    maxAbsProfit,
    totalProfit,
    totalTrades,
  };
}

function CalendarPnL({ byDate, activeMonth, onPrevMonth, onNextMonth, currency = "$" }) {
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const { cells, maxAbsProfit, totalProfit, totalTrades } = getCalendarModel(byDate, activeMonth);
  const summaryPositive = totalProfit >= 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: colors.primary }}>{formatCalendarMonth(activeMonth)}</div>
          <div style={{ fontSize: 10, color: colors.muted, fontFamily: "'JetBrains Mono',monospace", marginTop: 4 }}>
            {summaryPositive ? "+" : "-"}{currency}{Math.abs(totalProfit).toFixed(2)} · {totalTrades} trades
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" onClick={onPrevMonth} style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.card, color: colors.primary, cursor: "pointer", fontSize: 16 }}>
            ‹
          </button>
          <button type="button" onClick={onNextMonth} style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.card, color: colors.primary, cursor: "pointer", fontSize: 16 }}>
            ›
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8 }}>
        {weekDays.map((day) => (
          <div key={day} style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: colors.muted, textAlign: "center", fontFamily: "'JetBrains Mono',monospace", paddingBottom: 4 }}>
            {day}
          </div>
        ))}
        {cells.map((cell) => {
          if (cell.type === "empty") {
            return <div key={cell.key} style={{ minHeight: 86, borderRadius: 12, background: "rgba(148,163,184,0.06)" }} />;
          }

          const profit = Number(cell.entry?.profit || 0);
          const trades = Number(cell.entry?.total || 0);
          const intensity = cell.entry ? Math.max(0.12, Math.abs(profit) / maxAbsProfit) : 0;
          const background = !cell.entry
            ? "#FFFFFF"
            : profit >= 0
              ? `rgba(13, 158, 110, ${Math.min(0.82, intensity * 0.9)})`
              : `rgba(214, 59, 59, ${Math.min(0.82, intensity * 0.9)})`;
          const border = !cell.entry
            ? `1px solid ${colors.border}`
            : `1px solid ${profit >= 0 ? "rgba(13, 158, 110, 0.25)" : "rgba(214, 59, 59, 0.25)"}`;
          const textColor = cell.entry && intensity > 0.45 ? "#FFFFFF" : colors.primary;
          const mutedColor = cell.entry && intensity > 0.45 ? "rgba(255,255,255,0.8)" : colors.muted;

          return (
            <div key={cell.key} style={{ minHeight: 86, borderRadius: 12, background, border, padding: "10px 8px", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: cell.entry ? "0 8px 18px rgba(15,25,35,0.05)" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: textColor }}>{cell.day}</span>
                {trades > 0 && (
                  <span style={{ fontSize: 9, color: mutedColor, fontFamily: "'JetBrains Mono',monospace" }}>
                    {trades}T
                  </span>
                )}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: textColor, fontFamily: "'JetBrains Mono',monospace" }}>
                  {cell.entry ? `${profit >= 0 ? "+" : "-"}${currency}${Math.abs(profit).toFixed(0)}` : "—"}
                </div>
                <div style={{ fontSize: 9, color: mutedColor, marginTop: 3 }}>
                  {cell.entry ? `${cell.entry.winRate}% WR` : "No trades"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
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
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [data, setData] = useState({
    summary: null,
    riskReward: null,
    distribution: null,
    performance: null,
    timeAnalysis: null,
    quality: null,
    drawdown: null,
    aiInsights: null,
    psychology: null
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetchAllData();
  }, [router]);

  useEffect(() => {
    const dateKeys = Object.keys(data.timeAnalysis?.byDate || {});
    if (dateKeys.length === 0) return;
    const latestKey = [...dateKeys].sort().slice(-1)[0];
    const [year, month] = latestKey.split("-").map(Number);
    if (year && month) {
      setCalendarMonth(new Date(year, month - 1, 1));
    }
  }, [data.timeAnalysis]);

  const fetchAllData = async () => {
    try {
      const [summary, riskReward, distribution, performance, timeAnalysis, quality, drawdown, aiInsights, psychology] = await Promise.all([
        getSummary(),
        getRiskRewardAnalysis(),
        getTradeDistribution(),
        getPerformanceMetrics(),
        getTimeAnalysis(),
        getTradeQuality(),
        getDrawdownAnalysis(),
        getAIInsights(),
        getPsychologyAnalytics().catch(() => null)
      ]);

      setData({ summary, riskReward, distribution, performance, timeAnalysis, quality, drawdown, aiInsights, psychology });
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

  const { summary, riskReward, distribution, performance, timeAnalysis, quality, drawdown, aiInsights, psychology } = data;

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
            <div style={{ width: 48, height: 48, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}><img src="/mainlogo.png" alt="LOGNERA" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
            <div>
              <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 800, letterSpacing: "0.04em", color: colors.primary, lineHeight: 1 }}>
                LOGNERA
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
                {timeAnalysis?.bestSession?.name || "Need more data"}
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
                {timeAnalysis?.worstSession?.name || "Need more data"}
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
                {timeAnalysis?.bestSessionWR?.name || "Need more data"}
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

        {/* Calendar Heatmap */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <SectionCard title="Calendar Performance" subtitle="MONTHLY P&L CALENDAR" delay={0.5} accentColor={colors.bull}>
            <CalendarPnL
              byDate={timeAnalysis?.byDate || {}}
              activeMonth={calendarMonth}
              onPrevMonth={() => setCalendarMonth((prev) => shiftMonth(prev, -1))}
              onNextMonth={() => setCalendarMonth((prev) => shiftMonth(prev, 1))}
              currency="$"
            />
          </SectionCard>

          {/* Best/Worst Times */}
          <SectionCard title="Timing Insights" subtitle="OPTIMAL TRADING WINDOWS" delay={0.55} accentColor={colors.gold}>
            {timeAnalysis && (
              <div>
                <ListItem
                  label="🏆 Best Day (Profit)"
                  value={timeAnalysis.bestDay ? `$${timeAnalysis.bestDay.profit || 0}` : "—"}
                  color={colors.bull}
                  sub={timeAnalysis.bestDay ? timeAnalysis.bestDay.name : "Need more data"}
                />
                <ListItem
                  label="📉 Worst Day (Profit)"
                  value={timeAnalysis.worstDay && timeAnalysis.worstDay.name !== timeAnalysis.bestDay?.name ? `$${timeAnalysis.worstDay.profit || 0}` : "—"}
                  color={colors.bear}
                  sub={timeAnalysis.worstDay && timeAnalysis.worstDay.name !== timeAnalysis.bestDay?.name ? timeAnalysis.worstDay.name : "Need more data"}
                />
                <ListItem
                  label="🕐 Best Hour (Profit)"
                  value={timeAnalysis.bestHour ? `$${timeAnalysis.bestHour.profit || 0}` : "—"}
                  color={colors.bull}
                  sub={timeAnalysis.bestHour ? `${String(timeAnalysis.bestHour.hour).padStart(2, '0')}:00` : "Need more data"}
                />
                <ListItem
                  label="⚠️ Worst Hour (Profit)"
                  value={timeAnalysis.worstHour && timeAnalysis.worstHour.hour !== timeAnalysis.bestHour?.hour ? `$${timeAnalysis.worstHour.profit || 0}` : "—"}
                  color={colors.bear}
                  sub={timeAnalysis.worstHour && timeAnalysis.worstHour.hour !== timeAnalysis.bestHour?.hour ? `${String(timeAnalysis.worstHour.hour).padStart(2, '0')}:00` : "Need more data"}
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
                  .map(([pair, data]) => {
                    const pVal = parseFloat(data.profit);
                    const pFormatted = pVal >= 0 ? `+$${pVal.toFixed(2)}` : `-$${Math.abs(pVal).toFixed(2)}`;
                    return (
                      <div key={pair} style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{pair}</span>
                          <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: pVal >= 0 ? colors.bull : colors.bear }}>
                            {pFormatted}
                          </span>
                        </div>
                        <ProgressBar value={parseFloat(data.winRate)} max={100} color={parseFloat(data.winRate) >= 50 ? colors.bull : colors.bear} label={`${data.wins}W / ${data.losses}L • ${data.winRate}%`} />
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div style={{ color: colors.muted, textAlign: "center", padding: 20 }}>No pair data available</div>
            )}
          </SectionCard>

          {/* By Trade Type */}
          <SectionCard title="BUY vs SELL Performance" subtitle="TRADE TYPE ANALYSIS" delay={0.55} accentColor={colors.gold}>
            {distribution?.byType && (
              <div>
                {Object.entries(distribution.byType).map(([type, data]) => {
                  const pVal = parseFloat(data.profit);
                  const pFormatted = pVal >= 0 ? `$${pVal.toFixed(2)}` : `-$${Math.abs(pVal).toFixed(2)}`;
                  
                  return (
                    <div key={type} style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: type === "BUY" ? colors.bull : colors.bear }}>{type}</span>
                        <span style={{ fontSize: 11, color: colors.muted }}>{data.total} trades</span>
                      </div>
                      <ProgressBar value={parseFloat(data.winRate)} max={100} color={parseFloat(data.winRate) >= 50 ? colors.bull : colors.bear} label={`${data.winRate}% win rate`} />
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: colors.muted, marginTop: 4 }}>
                        <span>Profit: <span style={{ color: pVal >= 0 ? colors.bull : colors.bear }}>{pFormatted}</span></span>
                        <span>{data.wins}W / {data.losses}L</span>
                      </div>
                    </div>
                  );
                })}
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
        {/* 🧠 Psychology Analytics Section */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED", letterSpacing: "0.1em", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#7C3AED", animation: "pulse 2s infinite" }} />
            🧠 PSYCHOLOGY ANALYTICS
          </div>

          {psychology && psychology.totalTrackedTrades > 0 ? (
            <>
              {/* Psychology Score + Stats */}
              <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
                <StatCard
                  label="PSYCHOLOGY SCORE"
                  value={`${psychology.psychologyScore}/100`}
                  sub="Composite discipline rating"
                  color={psychology.psychologyScore >= 70 ? colors.bull : psychology.psychologyScore >= 40 ? colors.gold : colors.bear}
                  delay={0}
                  icon={<span style={{ fontSize: 16 }}>🧠</span>}
                />
                <StatCard
                  label="TRACKED TRADES"
                  value={psychology.totalTrackedTrades}
                  sub="With psychology data"
                  color={colors.primary}
                  delay={0.05}
                />
                {psychology.scoreBreakdown && (
                  <>
                    <StatCard
                      label="PLAN ADHERENCE"
                      value={`${psychology.scoreBreakdown.planAdherencePct}%`}
                      sub="Trades from plan"
                      color={parseFloat(psychology.scoreBreakdown.planAdherencePct) >= 70 ? colors.bull : colors.bear}
                      delay={0.1}
                    />
                    <StatCard
                      label="CALM TRADING"
                      value={`${psychology.scoreBreakdown.calmTradingPct}%`}
                      sub="Calm or Focused"
                      color={parseFloat(psychology.scoreBreakdown.calmTradingPct) >= 50 ? colors.bull : colors.gold}
                      delay={0.15}
                    />
                  </>
                )}
              </div>

              <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
                {/* Mood vs Performance */}
                <SectionCard title="Mood vs Performance" subtitle="WIN RATE BY EMOTIONAL STATE" delay={0.2} accentColor="#7C3AED">
                  {psychology.moodAnalysis && psychology.moodAnalysis.length > 0 ? (
                    <div>
                      {psychology.moodAnalysis.map(m => (
                        <div key={m.level} style={{ marginBottom: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{m.label}</span>
                            <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: parseFloat(m.avgProfit) >= 0 ? colors.bull : colors.bear }}>
                              ${parseFloat(m.avgProfit).toFixed(2)} avg
                            </span>
                          </div>
                          <ProgressBar value={parseFloat(m.winRate)} max={100} color={parseFloat(m.winRate) >= 50 ? colors.bull : colors.bear} label={`${m.trades} trades • ${m.winRate}% WR`} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: colors.muted, textAlign: "center", padding: 20, fontSize: 12 }}>Start tagging your mood when logging trades</div>
                  )}
                </SectionCard>

                {/* Confidence Calibration */}
                <SectionCard title="Confidence Calibration" subtitle="ARE YOU CALIBRATED?" delay={0.25} accentColor={colors.gold}>
                  {psychology.confidenceAnalysis && psychology.confidenceAnalysis.length > 0 ? (
                    <div>
                      {psychology.confidenceAnalysis.map(c => (
                        <div key={c.level} style={{ marginBottom: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: c.level === "Overconfident" ? colors.bear : colors.primary }}>
                              {c.level === "Overconfident" ? "🚩 " : ""}{c.level}
                            </span>
                            <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: parseFloat(c.avgProfit) >= 0 ? colors.bull : colors.bear }}>
                              ${parseFloat(c.avgProfit).toFixed(2)} avg
                            </span>
                          </div>
                          <ProgressBar value={parseFloat(c.winRate)} max={100} color={c.level === "Overconfident" && parseFloat(c.winRate) < 50 ? colors.bear : parseFloat(c.winRate) >= 50 ? colors.bull : colors.bear} label={`${c.trades} trades • ${c.winRate}% WR`} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: colors.muted, textAlign: "center", padding: 20, fontSize: 12 }}>Start tagging your confidence level</div>
                  )}
                </SectionCard>
              </div>

              <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
                {/* Emotional Tag Impact */}
                <SectionCard title="Emotional Tag Impact" subtitle="HOW EMOTIONS AFFECT YOUR P&L" delay={0.3} accentColor="#7C3AED">
                  {psychology.emotionalTagImpact && psychology.emotionalTagImpact.length > 0 ? (
                    <div>
                      {psychology.emotionalTagImpact.map(t => (
                        <ListItem
                          key={t.tag}
                          label={`${t.emoji} ${t.tag}`}
                          value={`${t.winRate}%`}
                          color={parseFloat(t.avgProfit) >= 0 ? colors.bull : colors.bear}
                          sub={`${t.trades} trades • Avg: $${t.avgProfit}`}
                        />
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: colors.muted, textAlign: "center", padding: 20, fontSize: 12 }}>Tag your emotions when logging trades to see their impact</div>
                  )}
                </SectionCard>

                {/* Would Retake Analysis */}
                <SectionCard title="Would Retake Analysis" subtitle="HINDSIGHT ACCURACY" delay={0.35} accentColor={colors.primary}>
                  {(psychology.wouldRetakeAnalysis?.yes || psychology.wouldRetakeAnalysis?.no) ? (
                    <div>
                      {psychology.wouldRetakeAnalysis.yes && (
                        <div style={{ padding: 14, borderRadius: 10, border: `2px solid ${colors.bull}`, background: "rgba(13,158,110,0.05)", marginBottom: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: colors.bull, marginBottom: 8 }}>✅ Would Retake</div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                            <span style={{ color: colors.muted }}>Trades</span>
                            <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>{psychology.wouldRetakeAnalysis.yes.trades}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                            <span style={{ color: colors.muted }}>Win Rate</span>
                            <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: parseFloat(psychology.wouldRetakeAnalysis.yes.winRate) >= 50 ? colors.bull : colors.bear }}>{psychology.wouldRetakeAnalysis.yes.winRate}%</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                            <span style={{ color: colors.muted }}>Avg P&L</span>
                            <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: parseFloat(psychology.wouldRetakeAnalysis.yes.avgProfit) >= 0 ? colors.bull : colors.bear }}>${psychology.wouldRetakeAnalysis.yes.avgProfit}</span>
                          </div>
                        </div>
                      )}
                      {psychology.wouldRetakeAnalysis.no && (
                        <div style={{ padding: 14, borderRadius: 10, border: `2px solid ${colors.bear}`, background: "rgba(214,59,59,0.05)" }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: colors.bear, marginBottom: 8 }}>❌ Would NOT Retake</div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                            <span style={{ color: colors.muted }}>Trades</span>
                            <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>{psychology.wouldRetakeAnalysis.no.trades}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                            <span style={{ color: colors.muted }}>Win Rate</span>
                            <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: parseFloat(psychology.wouldRetakeAnalysis.no.winRate) >= 50 ? colors.bull : colors.bear }}>{psychology.wouldRetakeAnalysis.no.winRate}%</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                            <span style={{ color: colors.muted }}>Avg P&L</span>
                            <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: parseFloat(psychology.wouldRetakeAnalysis.no.avgProfit) >= 0 ? colors.bull : colors.bear }}>${psychology.wouldRetakeAnalysis.no.avgProfit}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: colors.muted, textAlign: "center", padding: 20, fontSize: 12 }}>Use the "Would Retake" toggle when logging trades</div>
                  )}
                </SectionCard>
              </div>
            </>
          ) : (
            <div style={{
              padding: "24px", borderRadius: 14, border: `1px dashed #7C3AED44`,
              background: "rgba(124,58,237,0.03)", textAlign: "center",
              animation: "fadeUp 0.5s ease both"
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🧠</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: colors.primary, marginBottom: 4 }}>Psychology Tracker</div>
              <div style={{ fontSize: 12, color: colors.muted, maxWidth: 400, margin: "0 auto" }}>
                Start tagging your mood, confidence, and emotions when logging trades to unlock psychology insights and your discipline score.
              </div>
            </div>
          )}
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
