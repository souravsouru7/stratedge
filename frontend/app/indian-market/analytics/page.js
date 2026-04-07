"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getSummary,
  getRiskRewardAnalysis,
  getTradeDistribution,
  getPerformanceMetrics,
  getTimeAnalysis,
  getDrawdownAnalysis,
  getAIInsights,
  getTradeQuality,
  getPsychologyAnalytics,
  getPnLBreakdown
} from "@/services/analyticsApi";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  AreaChart,
  Area
} from "recharts";
import MarketSwitcher from "@/components/MarketSwitcher";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useMarket, MARKETS } from "@/context/MarketContext";

const theme = {
  bull: "#0D9E6E",
  bear: "#D63B3B",
  gold: "#B8860B",
  primary: "#0D9E6E",
  secondary: "#0F1923",
  muted: "#94A3B8",
  border: "#E2E8F0",
  bg: "#F0EEE9",
  card: "#FFFFFF"
};

function StatCard({ label, value, sub, color, delay = 0 }) {
  return (
    <div
      className="premium-card"
      style={{
        background: theme.card,
        borderRadius: 16,
        border: `1px solid ${theme.border}`,
        padding: "24px 20px",
        flex: "1 1 200px",
        animation: `fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s both`,
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "relative",
        overflow: "hidden"
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: theme.muted, letterSpacing: "0.12em", marginBottom: 10, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color, letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: theme.muted, marginTop: 6, fontWeight: 500 }}>{sub}</div>}
      <style jsx>{`
        .premium-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 20px -8px rgba(0, 0, 0, 0.08);
          border-color: ${theme.secondary}44;
        }
      `}</style>
    </div>
  );
}

function DistList({ title, data, currency = "₹", maxItems = 6 }) {
  if (!data || Object.keys(data).length === 0) return null;
  const entries = Object.entries(data)
    .filter(([_, v]) => v.total > 0)
    .sort((a, b) => parseFloat(b[1].profit) - parseFloat(a[1].profit))
    .slice(0, maxItems);
  if (entries.length === 0) return null;
  return (
    <div style={{ marginBottom: title ? 20 : 0 }}>
      {title && <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, letterSpacing: "0.08em", marginBottom: 10 }}>{title}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {entries.map(([name, v]) => (
          <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${theme.border}` }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{name}</span>
            <span style={{ fontSize: 11, color: theme.muted, marginRight: 8 }}>{v.winRate}% WR</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: parseFloat(v.profit) >= 0 ? theme.bull : theme.bear }}>
              {parseFloat(v.profit) >= 0 ? "+" : ""}{currency}{parseFloat(v.profit).toFixed(0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PathToAdvanced({ summary, ai, perf, quality, psychology, currency }) {
  const totalTrades = summary?.totalTrades ?? 0;
  const totalProfit = parseFloat(summary?.totalProfit || 0);
  const winRate = parseFloat(summary?.winRate || 0);
  const planPct = parseFloat(ai?.behaviorDiscipline?.ruleEmotion?.planPct || 0);
  const aiScore = parseFloat(ai?.score || 0);
  const profitFactor = parseFloat(perf?.profitFactor || 0);
  const qualityScore = parseFloat(quality?.qualityScore || 0);
  const psychologyScore = parseFloat(psychology?.psychologyScore || 0);

  const checks = [
    { label: "Log at least 5 trades with details (strategy, entry basis)", done: totalTrades >= 5, value: `${totalTrades} / 5` },
    { label: "Log at least 10 trades for advanced insights", done: totalTrades >= 10, value: `${totalTrades} / 10` },
    { label: "Win rate ≥ 50%", done: winRate >= 50, value: `${winRate}%` },
    { label: "Total P&L positive", done: totalProfit > 0, value: `${currency}${totalProfit.toFixed(0)}` },
    { label: "Plan-based entries ≥ 70%", done: planPct >= 70, value: `${planPct}%` },
    { label: "AI discipline score ≥ 60", done: aiScore >= 60, value: `${aiScore}` },
    { label: "Profit factor ≥ 1.2", done: profitFactor >= 1.2, value: profitFactor.toFixed(2) },
    { label: "Quality score ≥ 70", done: qualityScore >= 70, value: `${qualityScore}` },
    { label: "Psychology score ≥ 60", done: psychologyScore >= 60, value: `${psychologyScore}` }
  ];
  const doneCount = checks.filter((c) => c.done).length;
  const totalCount = checks.length;
  const percent = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
  const isAdvanced = doneCount >= 5 && totalProfit > 0 && winRate >= 50;

  return (
    <div
      style={{
        background: isAdvanced ? "linear-gradient(135deg, rgba(22,163,74,0.08), rgba(22,163,74,0.02))" : "linear-gradient(135deg, rgba(251,191,36,0.08), rgba(251,191,36,0.02))",
        border: `2px solid ${isAdvanced ? theme.bull : theme.gold}`,
        borderRadius: 16,
        padding: 24,
        marginBottom: 24
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: theme.primary }}>Path to Advanced & Profitable</div>
          <div style={{ fontSize: 11, color: theme.muted, marginTop: 4 }}>
            Complete these to unlock advanced-level analytics and build a profitable edge.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: isAdvanced ? theme.bull : theme.gold }}>{percent}%</div>
          <div style={{ width: 100, height: 10, background: theme.border, borderRadius: 5, overflow: "hidden" }}>
            <div style={{ width: `${percent}%`, height: "100%", background: isAdvanced ? theme.bull : theme.gold, borderRadius: 5, transition: "width 0.5s ease" }} />
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {checks.map((c, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              background: c.done ? "rgba(22,163,74,0.08)" : "rgba(0,0,0,0.02)",
              borderRadius: 10,
              border: `1px solid ${c.done ? theme.bull + "44" : theme.border}`
            }}
          >
            <span style={{ fontSize: 18, flexShrink: 0 }}>{c.done ? "✓" : "○"}</span>
            <span style={{ fontSize: 12, color: theme.primary, flex: 1 }}>{c.label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: c.done ? theme.bull : theme.muted }}>{c.value}</span>
          </div>
        ))}
      </div>
      {isAdvanced && (
        <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(22,163,74,0.15)", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🏆</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: theme.bull }}>Advanced level unlocked</div>
            <div style={{ fontSize: 11, color: theme.secondary }}>You’re building a data-driven edge. Keep journaling and reviewing analytics to stay profitable.</div>
          </div>
        </div>
      )}
    </div>
  );
}

function InsightTag({ text, type = "info" }) {
  const map = {
    info: { bg: "#EFF6FF", border: "#93C5FD", text: "#1D4ED8" },
    success: { bg: "#ECFDF5", border: "#6EE7B7", text: "#059669" },
    warning: { bg: "#FEF3C7", border: "#FCD34D", text: "#D97706" },
    danger: { bg: "#FEE2E2", border: "#FCA5A5", text: "#DC2626" }
  };
  const c = map[type] || map.info;
  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 8,
        padding: "10px 14px",
        display: "flex",
        alignItems: "flex-start",
        gap: 10
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: c.text,
          marginTop: 5,
          flexShrink: 0
        }}
      />
      <span style={{ fontSize: 12, color: c.text, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

function ProgressBar({ value, max = 100, color = theme.bull, label }) {
  const safeMax = max || 1;
  const pct = Math.min(100, Math.max(0, (Number(value) / safeMax) * 100));

  return (
    <div style={{ marginBottom: 12 }}>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: theme.muted, fontWeight: 700 }}>{label}</span>
          <span style={{ fontSize: 11, color, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace" }}>{pct.toFixed(1)}%</span>
        </div>
      )}
      <div style={{ height: 8, background: "#F0EEE9", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}88)`, borderRadius: 4, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

function ListItem({ label, value, color = theme.primary, sub }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${theme.border}` }}>
      <div style={{ maxWidth: "70%" }}>
        <div style={{ fontSize: 12, color: theme.secondary, fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: theme.muted, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 13, fontWeight: 900, color, fontFamily: "'JetBrains Mono',monospace" }}>{value}</div>
    </div>
  );
}

export default function IndianAnalyticsPage() {
  const router = useRouter();
  const { currentMarket } = useMarket();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    summary: null,
    rr: null,
    perf: null,
    time: null,
    drawdown: null,
    ai: null,
    breakdown: null,
    distribution: null,
    quality: null,
    psychology: null
  });
  const [timeFilter, setTimeFilter] = useState("daily"); // daily, weekly, monthly

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchData();
  }, [router]);

  const runInBatches = async (tasks, batchSize = 3, pauseMs = 200) => {
    const results = [];
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map((task) => task()));
      results.push(...batchResults);
      if (i + batchSize < tasks.length) {
        await new Promise((resolve) => setTimeout(resolve, pauseMs));
      }
    }
    return results;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summary, rr, perf, time, drawdown, ai, breakdown, distribution, quality, psychology] = await runInBatches([
        () => getSummary(MARKETS.INDIAN_MARKET),
        () => getRiskRewardAnalysis(MARKETS.INDIAN_MARKET),
        () => getPerformanceMetrics(MARKETS.INDIAN_MARKET),
        () => getTimeAnalysis(MARKETS.INDIAN_MARKET),
        () => getDrawdownAnalysis(MARKETS.INDIAN_MARKET),
        () => getAIInsights(MARKETS.INDIAN_MARKET),
        () => getPnLBreakdown(MARKETS.INDIAN_MARKET),
        () => getTradeDistribution(MARKETS.INDIAN_MARKET),
        () => getTradeQuality(MARKETS.INDIAN_MARKET),
        () => getPsychologyAnalytics(MARKETS.INDIAN_MARKET)
      ]);
      setData({ summary, rr, perf, time, drawdown, ai, breakdown, distribution, quality, psychology });
    } catch (error) {
      console.error("Failed to fetch Indian analytics data:", error);
    } finally {
      setLoading(false);
    }
  };

  const currency = "₹";
  const totalTrades = parseFloat(data.summary?.totalTrades || 0);
  const hasAnyTrades = totalTrades > 0;
  const hasEnoughTrades = totalTrades >= 5;
  const tradesWithRR = parseFloat(data.quality?.tradesWithRR || 0);
  const hasRRFields = hasEnoughTrades && tradesWithRR > 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.bg,
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        color: theme.primary
      }}
    >
      <header
        style={{
          background: "#FFFFFF",
          borderBottom: `1px solid ${theme.border}`,
          minHeight: 60,
          padding: "10px 24px",
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
          <Link
            href="/indian-market/dashboard"
            style={{ textDecoration: "none", color: theme.primary, display: "flex", alignItems: "center", gap: 12 }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <img src="/mainlogo1.png" alt="Edgecipline" style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "left center" }} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  color: theme.primary,
                  lineHeight: 1
                }}
              >
                {""}
              </div>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  color: theme.secondary,
                  marginTop: 1,
                  fontFamily: "'JetBrains Mono',monospace",
                  fontWeight: 600
                }}
              >
                INDIAN MARKET · ANALYTICS
              </div>
            </div>
          </Link>
        </div>

        <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { href: "/indian-market/trades", label: "Journal" },
            { href: "/indian-market/add-trade", label: "Log option" },
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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <MarketSwitcher />
        </div>
      </header>

      <main style={{ padding: "28px 20px", maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>
          Advanced <span style={{ color: theme.secondary }}>Options Analytics</span>
        </h1>

        {loading ? (
          <LoadingSpinner message="Analyzing Indian options performance..." fullPage />
        ) : (
          <>
            {/* TOP SUMMARY ROW */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
              <StatCard
                label="TOTAL P&L"
                value={hasAnyTrades ? `${currency}${parseFloat(data.summary?.totalProfit || 0).toLocaleString("en-IN")}` : "—"}
                color={hasAnyTrades ? (parseFloat(data.summary?.totalProfit || 0) >= 0 ? theme.bull : theme.bear) : theme.secondary}
                sub={hasAnyTrades ? "Lifetime profit / loss" : "Log trades to compute"}
              />
              <StatCard
                label="NET AFTER COSTS"
                value={hasAnyTrades ? `${currency}${parseFloat(data.summary?.netProfit || 0).toLocaleString("en-IN")}` : "—"}
                color={hasAnyTrades ? (parseFloat(data.summary?.netProfit || 0) >= 0 ? theme.bull : theme.bear) : theme.secondary}
                sub={
                  hasAnyTrades
                    ? `Brokerage & taxes: ${currency}${parseFloat(data.summary?.totalCosts || 0).toLocaleString("en-IN")}`
                    : "Log trades to compute"
                }
              />
              <StatCard
                label="WIN RATE"
                value={hasAnyTrades ? `${data.summary?.winRate || 0}%` : "—"}
                color={hasAnyTrades ? (parseFloat(data.summary?.winRate || 0) >= 50 ? theme.bull : theme.bear) : theme.secondary}
                sub={hasAnyTrades ? `${data.summary?.winningTrades || 0} Wins / ${data.summary?.losingTrades || 0} Losses` : "Log trades to compute win rate"}
              />
              <StatCard
                label="AI SCORE"
                value={
                  hasEnoughTrades
                    ? (data.ai?.score != null ? data.ai.score : "—")
                    : "—"
                }
                color={hasEnoughTrades ? theme.gold : theme.muted}
                sub={hasEnoughTrades ? "Model-based discipline score" : "Unlock after logging 5 trades"}
              />
            </div>

            {/* P&L BREAKDOWN CHART */}
            <div
              style={{
                background: theme.card,
                borderRadius: 14,
                border: `1px solid ${theme.border}`,
                padding: 24,
                marginBottom: 24,
                boxShadow: "0 2px 10px rgba(15,23,42,0.05)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>P&L Breakdown</div>
                  <div style={{ fontSize: 11, color: theme.muted }}>Analyze your performance over time.</div>
                </div>
                <div style={{ display: "flex", gap: 4, background: theme.bg, padding: 4, borderRadius: 10 }}>
                  {["daily", "weekly", "monthly"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setTimeFilter(f)}
                      style={{
                        padding: "6px 14px",
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: 8,
                        border: "none",
                        cursor: "pointer",
                        background: timeFilter === f ? theme.card : "transparent",
                        color: timeFilter === f ? theme.primary : theme.muted,
                        boxShadow: timeFilter === f ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                        transition: "all 0.2s"
                      }}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ position: "relative", height: 350, width: "100%", marginTop: 10 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.breakdown?.[timeFilter] || []} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.bull} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={theme.bull} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.bear} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={theme.bear} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="0" vertical={false} stroke="#E2E8F0" strokeOpacity={0.4} />
                    <XAxis
                      dataKey={timeFilter === "daily" ? "date" : timeFilter === "weekly" ? "week" : "month"}
                      fontSize={11}
                      fontWeight={600}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                      tick={{ fill: theme.muted }}
                      tickFormatter={(val) => (timeFilter === "daily" ? val.split("-").slice(2).join("/") : val)}
                    />
                    <YAxis 
                      fontSize={11} 
                      fontWeight={600} 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: theme.muted }}
                      tickFormatter={(val) => `₹${Math.abs(val) >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} 
                    />
                    <Tooltip
                      cursor={{ stroke: theme.primary, strokeWidth: 1, strokeDasharray: '6 6', opacity: 0.3 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const val = payload[0].value;
                          const label = payload[0].payload[timeFilter === "daily" ? "date" : timeFilter === "weekly" ? "week" : "month"];
                          return (
                            <div
                              style={{
                                background: "rgba(255, 255, 255, 0.9)",
                                backdropFilter: "blur(12px)",
                                border: `1px solid rgba(255, 255, 255, 0.5)`,
                                padding: "14px 20px",
                                borderRadius: 16,
                                boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.15)",
                                display: "flex",
                                flexDirection: "column",
                                gap: 4
                              }}
                            >
                              <div style={{ fontSize: 10, color: theme.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
                              <div style={{ fontSize: 22, fontWeight: 900, color: val >= 0 ? theme.bull : theme.bear }}>
                                {val >= 0 ? "+" : ""}₹{Math.abs(val).toLocaleString("en-IN")}
                              </div>
                              <div style={{ fontSize: 9, color: theme.muted, fontStyle: "italic" }}>Model-verified performance</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine y={0} stroke={theme.border} strokeWidth={2} strokeDasharray="4 4" />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      stroke={theme.bull}
                      strokeWidth={4}
                      fillOpacity={1}
                      fill="url(#colorProfit)"
                      connectNulls
                      activeDot={{ 
                        r: 8, 
                        fill: theme.bull, 
                        stroke: "#FFF", 
                        strokeWidth: 3,
                        style: { filter: `drop-shadow(0 4px 8px ${theme.bull}44)` }
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* RISK / REWARD + DRAWDOWN */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
              <div
                style={{
                  flex: "1 1 280px",
                  background: theme.card,
                  borderRadius: 14,
                  border: `1px solid ${theme.border}`,
                  padding: 20
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Risk / Reward Model</div>
                <div style={{ fontSize: 11, color: theme.muted, marginBottom: 12 }}>
                  Based on your options trades (planned and realized).
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
                  <div>
                    <div style={{ color: theme.muted }}>Average R:R</div>
                    <div style={{ fontWeight: 700 }}>1:{data.rr?.avgRR || "0.0"}</div>
                  </div>
                  <div>
                    <div style={{ color: theme.muted }}>Realized R:R</div>
                    <div style={{ fontWeight: 700 }}>1:{data.rr?.actualRR || "0.0"}</div>
                  </div>
                  <div>
                    <div style={{ color: theme.muted }}>Expectancy</div>
                    <div style={{ fontWeight: 700 }}>{data.rr?.expectancy || "0.00"} R / trade</div>
                  </div>
                  <div>
                    <div style={{ color: theme.muted }}>Risk / Trade</div>
                    <div style={{ fontWeight: 700 }}>
                      {currency}
                      {parseFloat(data.rr?.riskPerTrade || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 12, fontSize: 11, color: theme.muted }}>
                  Risk-adjusted return:{" "}
                  <span style={{ fontWeight: 700, color: parseFloat(data.rr?.riskAdjustedReturn || 0) >= 0 ? theme.bull : theme.bear }}>
                    {data.rr?.riskAdjustedReturn}
                  </span>
                </div>
              </div>

              <div
                style={{
                  flex: "1 1 280px",
                  background: theme.card,
                  borderRadius: 14,
                  border: `1px solid ${theme.border}`,
                  padding: 20
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Drawdown & Equity</div>
                <div style={{ fontSize: 11, color: theme.muted, marginBottom: 12 }}>
                  How deep your options P&L dipped from peak.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
                  <div>
                    <div style={{ color: theme.muted }}>Max Drawdown</div>
                    <div style={{ fontWeight: 700, color: theme.bear }}>
                      {currency}
                      {parseFloat(data.drawdown?.maxDrawdown || 0).toFixed(2)} ({data.drawdown?.maxDrawdownPercent || "0.0"}%)
                    </div>
                  </div>
                  <div>
                    <div style={{ color: theme.muted }}>Current Drawdown</div>
                    <div style={{ fontWeight: 700, color: theme.bear }}>
                      {currency}
                      {parseFloat(data.drawdown?.currentDrawdown || 0).toFixed(2)} (
                      {data.drawdown?.currentDrawdownPercent || "0.0"}%)
                    </div>
                  </div>
                  <div>
                    <div style={{ color: theme.muted }}>Recovery Factor</div>
                    <div style={{ fontWeight: 700 }}>{data.drawdown?.recoveryFactor || "0.00"}</div>
                  </div>
                  <div>
                    <div style={{ color: theme.muted }}>Peak vs Current</div>
                    <div style={{ fontWeight: 700 }}>
                      {currency}
                      {parseFloat(data.drawdown?.peakBalance || 0).toFixed(0)} → {currency}
                      {parseFloat(data.drawdown?.currentBalance || 0).toFixed(0)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* TRADE QUALITY */}
            <div
              style={{
                background: theme.card,
                borderRadius: 14,
                border: `1px solid ${theme.border}`,
                padding: 24,
                marginBottom: 24,
                boxShadow: "0 2px 10px rgba(15,23,42,0.05)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900 }}>Trade Quality</div>
                  <div style={{ fontSize: 11, color: theme.muted, marginTop: 4 }}>
                    RR distribution + breakeven calibration from your journal.
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
                <StatCard
                  label="QUALITY SCORE"
                  value={hasRRFields ? `${data.quality?.qualityScore || 0}/100` : "—"}
                  color={
                    hasRRFields
                      ? parseFloat(data.quality?.qualityScore || 0) >= 70
                        ? theme.bull
                        : parseFloat(data.quality?.qualityScore || 0) >= 40
                          ? theme.gold
                          : theme.bear
                      : theme.muted
                  }
                  sub={hasRRFields ? "Overall trade quality rating" : "Add RR fields (entry + SL + TP)"}
                />
                <StatCard
                  label="BREAKEVEN RATE"
                  value={hasRRFields ? `${data.quality?.breakevenRate || 0}%` : "—"}
                  color={hasRRFields ? (parseFloat(data.quality?.breakevenRate || 0) <= 30 ? theme.bull : theme.bear) : theme.muted}
                  sub={hasRRFields ? "Trades near flat (|P&L| < 5)" : "Need RR trades to calibrate breakeven"}
                />
                <StatCard
                  label="TRADES WITH RR"
                  value={hasRRFields ? data.quality?.tradesWithRR || 0 : "—"}
                  color={hasRRFields ? theme.primary : theme.muted}
                  sub={hasRRFields ? "Has SL/TP + entryPrice" : "No RR-ready trades yet"}
                />
              </div>

              <div style={{ fontSize: 12, fontWeight: 900, color: theme.secondary, marginBottom: 10 }}>
                RR Buckets (Win Rate)
              </div>
              {Array.isArray(data.quality?.rrAnalysis) && data.quality.rrAnalysis.length > 0 ? (
                <div style={{ border: `1px solid ${theme.border}`, borderRadius: 14, background: "#fff", overflow: "hidden" }}>
                  {data.quality.rrAnalysis.slice(0, 6).map((r) => {
                    const winRate = parseFloat(r.winRate || 0);
                    const c = winRate >= 50 ? theme.bull : theme.bear;
                    return (
                      <ListItem
                        key={r.label}
                        label={r.label}
                        value={`${winRate}%`}
                        color={c}
                        sub={`${r.total} trades • Avg: ${currency}${parseFloat(r.avgProfit || 0).toFixed(2)}`}
                      />
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.6 }}>
                  Add trades with <code>entryPrice</code>, <code>stopLoss</code> and <code>takeProfit</code> to unlock RR quality analytics.
                </div>
              )}
            </div>

            {/* TIME EDGE & AI INSIGHTS */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div
                style={{
                  flex: "1 1 320px",
                  background: theme.card,
                  borderRadius: 14,
                  border: `1px solid ${theme.border}`,
                  padding: 20
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 900 }}>Timing Edge</div>
                    <div style={{ fontSize: 11, color: theme.muted, marginTop: 4, lineHeight: 1.5 }}>
                      Best-performing day/hour/session from your NIFTY / BANKNIFTY journal.
                    </div>
                  </div>
                  <div style={{ background: `${theme.bull}14`, border: `1px solid ${theme.bull}44`, color: theme.primary, fontSize: 10, fontWeight: 900, padding: "6px 10px", borderRadius: 999 }}>
                    {data.time?.bestHour?.hour != null ? `${data.time.bestHour.hour}:00` : "—"} Peak Hour
                  </div>
                </div>

                {data.time ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ background: "#F8FAFC", border: `1px solid ${theme.border}`, borderRadius: 12, padding: 12, minHeight: 106 }}>
                      <div style={{ fontSize: 10, fontWeight: 900, color: theme.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Best Day</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: theme.primary, fontFamily: "'JetBrains Mono',monospace", marginTop: 6 }}>
                        {data.time.bestDay?.name || "—"}
                      </div>
                      <div style={{ fontSize: 11, color: theme.muted, marginTop: 4, lineHeight: 1.4 }}>
                        Avg Profit:{" "}
                        {data.time.bestDay?.profit != null ? `${currency}${parseFloat(data.time.bestDay.profit).toFixed(0)}` : "—"}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 900, color: parseFloat(data.time.bestDay?.winRate || 0) >= 50 ? theme.bull : theme.bear, marginTop: 6 }}>
                        {data.time.bestDay?.winRate != null ? `${data.time.bestDay.winRate}% WR` : "—"}
                      </div>
                    </div>

                    <div style={{ background: "#F8FAFC", border: `1px solid ${theme.border}`, borderRadius: 12, padding: 12, minHeight: 106 }}>
                      <div style={{ fontSize: 10, fontWeight: 900, color: theme.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Best Hour</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: theme.primary, fontFamily: "'JetBrains Mono',monospace", marginTop: 6 }}>
                        {data.time.bestHour?.hour != null ? `${data.time.bestHour.hour}h` : "—"}
                      </div>
                      <div style={{ fontSize: 11, color: theme.muted, marginTop: 4, lineHeight: 1.4 }}>
                        Avg Profit:{" "}
                        {data.time.bestHour?.profit != null ? `${currency}${parseFloat(data.time.bestHour.profit).toFixed(0)}` : "—"}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 900, color: parseFloat(data.time.bestHour?.winRate || 0) >= 50 ? theme.bull : theme.bear, marginTop: 6 }}>
                        {data.time.bestHour?.winRate != null ? `${data.time.bestHour.winRate}% WR` : "—"}
                      </div>
                    </div>

                    <div style={{ background: "#F8FAFC", border: `1px solid ${theme.border}`, borderRadius: 12, padding: 12, minHeight: 106 }}>
                      <div style={{ fontSize: 10, fontWeight: 900, color: theme.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Best Session</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: theme.primary, fontFamily: "'JetBrains Mono',monospace", marginTop: 6 }}>
                        {data.time.bestSession?.name || "—"}
                      </div>
                      <div style={{ fontSize: 11, color: theme.muted, marginTop: 4, lineHeight: 1.4 }}>
                        Trades: {data.time.bestSession?.trades != null ? data.time.bestSession.trades : "—"}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 900, color: parseFloat(data.time.bestSession?.winRate || 0) >= 50 ? theme.bull : theme.bear, marginTop: 6 }}>
                        {data.time.bestSession?.winRate != null ? `${data.time.bestSession.winRate}% WR` : "—"}
                      </div>
                    </div>

                    <div style={{ background: `${theme.bear}08`, border: `1px solid ${theme.bear}44`, borderRadius: 12, padding: 12, minHeight: 106 }}>
                      <div style={{ fontSize: 10, fontWeight: 900, color: theme.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Worst Day</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: theme.bear, fontFamily: "'JetBrains Mono',monospace", marginTop: 6 }}>
                        {data.time.worstDay?.name || "—"}
                      </div>
                      <div style={{ fontSize: 11, color: theme.muted, marginTop: 4, lineHeight: 1.4 }}>
                        Avg Profit:{" "}
                        {data.time.worstDay?.profit != null ? `${currency}${parseFloat(data.time.worstDay.profit).toFixed(0)}` : "—"}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 900, color: parseFloat(data.time.worstDay?.winRate || 0) >= 50 ? theme.bull : theme.bear, marginTop: 6 }}>
                        {data.time.worstDay?.winRate != null ? `${data.time.worstDay.winRate}% WR` : "—"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.6 }}>Not enough data to compute timing edge yet.</div>
                )}
              </div>

              <div
                style={{
                  flex: "1 1 320px",
                  background: theme.card,
                  borderRadius: 14,
                  border: `1px solid ${theme.border}`,
                  padding: 24,
                  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800 }}>Model Intelligence</div>
                    <div style={{ fontSize: 11, color: theme.muted }}>AI-derived notes from your Nifty/BankNifty journal.</div>
                  </div>
                  <div style={{ 
                    background: `${theme.gold}22`, 
                    color: theme.gold, 
                    fontSize: 10, 
                    fontWeight: 800, 
                    padding: "4px 8px", 
                    borderRadius: 6,
                    border: `1px solid ${theme.gold}44`
                  }}>
                    BETA MODEL V2
                  </div>
                </div>
                {data.ai?.weeklyNarrative && (
                  <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.6, marginBottom: 12 }}>
                    {data.ai.weeklyNarrative}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {data.ai?.insights?.length ? (
                    data.ai.insights.slice(0, 5).map((txt, idx) => (
                      <InsightTag
                        key={idx}
                        text={txt}
                        type={
                          txt.includes("⚠️") || txt.toLowerCase().includes("drawdown")
                            ? "warning"
                            : txt.includes("Excellent") || txt.includes("Great")
                            ? "success"
                            : "info"
                        }
                      />
                    ))
                  ) : (
                    <div style={{ fontSize: 12, color: theme.muted }}>Not enough data yet.</div>
                  )}
                </div>

                {data.ai?.behaviorDiscipline?.ruleEmotion && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
                    <div style={{ background: `${theme.bull}08`, border: `1px solid ${theme.bull}44`, borderRadius: 12, padding: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: theme.muted, letterSpacing: "0.08em" }}>PLAN VS EMOTION</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: theme.primary, fontFamily: "'JetBrains Mono',monospace", marginTop: 6 }}>
                        {parseFloat(data.ai.behaviorDiscipline.ruleEmotion.planPct || 0).toFixed(1)}%
                      </div>
                      <div style={{ fontSize: 10, color: theme.muted, marginTop: 2 }}>
                        Emotion: {parseFloat(data.ai.behaviorDiscipline.ruleEmotion.emotionPct || 0).toFixed(1)}%
                      </div>
                    </div>

                    <div style={{ background: `${theme.bear}08`, border: `1px solid ${theme.bear}44`, borderRadius: 12, padding: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: theme.muted, letterSpacing: "0.08em" }}>REVENGE TRADES</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: theme.primary, fontFamily: "'JetBrains Mono',monospace", marginTop: 6 }}>
                        {data.ai.behaviorDiscipline.revengeTradesCount || 0}
                      </div>
                      <div style={{ fontSize: 10, color: theme.muted, marginTop: 2 }}>
                        Count of size-up right after a loss
                      </div>
                    </div>
                  </div>
                )}

                {Array.isArray(data.ai?.recommendations) && data.ai.recommendations.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${theme.border}` }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: theme.secondary, marginBottom: 10 }}>
                      Next Actions
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {data.ai.recommendations.slice(0, 4).map((rec, i) => (
                        <InsightTag
                          key={i}
                          text={rec}
                          type={rec.includes("⚠️") || rec.toLowerCase().includes("avoid") ? "warning" : "success"}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(data.ai?.nextWeekChecklist) && data.ai.nextWeekChecklist.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${theme.border}` }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: theme.secondary, marginBottom: 10 }}>
                      Next Week Checklist
                    </div>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 12, lineHeight: 1.7 }}>
                      {data.ai.nextWeekChecklist.slice(0, 3).map((item, idx) => (
                        <li key={idx} style={{ color: theme.muted }}>
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* PERFORMANCE DEEP DIVE */}
            <div
              style={{
                background: theme.card,
                borderRadius: 14,
                border: `1px solid ${theme.border}`,
                padding: 24,
                marginBottom: 24,
                boxShadow: "0 2px 10px rgba(15,23,42,0.05)"
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>Performance Deep Dive</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
                <div>
                  <div style={{ fontSize: 11, color: theme.muted, marginBottom: 4 }}>PROFIT FACTOR</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: theme.gold }}>{data.perf?.profitFactor || "0.00"}</div>
                  <div style={{ fontSize: 10, color: theme.muted }}>Gross Profit / Gross Loss</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: theme.muted, marginBottom: 4 }}>MAX STREAKS</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    <span style={{ color: theme.bull }}>{data.perf?.maxWinStreak || 0} Wins</span> / <span style={{ color: theme.bear }}>{data.perf?.maxLossStreak || 0} Losses</span>
                  </div>
                  <div style={{ fontSize: 10, color: theme.muted }}>Consecutive wins vs losses</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: theme.muted, marginBottom: 4 }}>LARGEST WIN</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: theme.bull }}>₹{parseFloat(data.perf?.largestWin || 0).toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: theme.muted }}>Single best trade</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: theme.muted, marginBottom: 4 }}>LARGEST LOSS</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: theme.bear }}>₹{parseFloat(data.perf?.largestLoss || 0).toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: theme.muted }}>Single worst trade</div>
                </div>
              </div>
            </div>

            {/* Distribution by new Indian form fields */}
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, marginTop: 8 }}>Performance by your journal fields</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, marginBottom: 24 }}>
              {data.distribution?.byStrategy && Object.keys(data.distribution.byStrategy).length > 0 && (
                <div style={{ background: theme.card, borderRadius: 14, border: `1px solid ${theme.border}`, padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12, color: theme.primary }}>By Strategy</div>
                  <DistList title="" data={data.distribution.byStrategy} currency={currency} maxItems={6} />
                </div>
              )}
              {data.distribution?.byTradeType && Object.keys(data.distribution.byTradeType).filter(k => data.distribution.byTradeType[k].total > 0).length > 0 && (
                <div style={{ background: theme.card, borderRadius: 14, border: `1px solid ${theme.border}`, padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12, color: theme.primary }}>By Trade Type</div>
                  <DistList title="" data={data.distribution.byTradeType} currency={currency} maxItems={5} />
                </div>
              )}
              {data.distribution?.byEntryBasis && Object.keys(data.distribution.byEntryBasis).filter(k => data.distribution.byEntryBasis[k].total > 0).length > 0 && (
                <div style={{ background: theme.card, borderRadius: 14, border: `1px solid ${theme.border}`, padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12, color: theme.primary }}>By Entry Basis</div>
                  <DistList title="" data={data.distribution.byEntryBasis} currency={currency} maxItems={5} />
                </div>
              )}
              {data.distribution?.byUnderlying && Object.keys(data.distribution.byUnderlying).filter(k => data.distribution.byUnderlying[k].total > 0).length > 0 && (
                <div style={{ background: theme.card, borderRadius: 14, border: `1px solid ${theme.border}`, padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12, color: theme.primary }}>By Underlying</div>
                  <DistList title="" data={data.distribution.byUnderlying} currency={currency} maxItems={6} />
                </div>
              )}
              {data.distribution?.byMistakeTag && Object.keys(data.distribution.byMistakeTag).filter(k => k !== "None" && data.distribution.byMistakeTag[k].total > 0).length > 0 && (
                <div style={{ background: theme.card, borderRadius: 14, border: `1px solid ${theme.border}`, padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12, color: theme.primary }}>By Mistake Tag</div>
                  <DistList title="" data={data.distribution.byMistakeTag} currency={currency} maxItems={6} />
                </div>
              )}
            </div>

            {/* PSYCHOLOGY ANALYTICS */}
            <div
              style={{
                background: theme.card,
                borderRadius: 14,
                border: `1px solid ${theme.border}`,
                padding: 24,
                marginBottom: 24,
                boxShadow: "0 2px 10px rgba(15,23,42,0.05)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900 }}>Psychology Analytics</div>
                  <div style={{ fontSize: 11, color: theme.muted, marginTop: 4 }}>
                    Discipline + mood calibration from your option journal.
                  </div>
                </div>
                {data.psychology?.totalTrackedTrades ? (
                  <div style={{ fontSize: 12, color: theme.secondary, fontWeight: 900, padding: "8px 12px", borderRadius: 999, border: `1px solid ${theme.border}`, background: theme.bg }}>
                    {data.psychology.totalTrackedTrades} tracked trades
                  </div>
                ) : null}
              </div>

              {data.psychology && data.psychology.totalTrackedTrades > 0 ? (
                <>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
                    <StatCard
                      label="PSYCHOLOGY SCORE"
                      value={`${data.psychology.psychologyScore}/100`}
                      color={
                        parseFloat(data.psychology.psychologyScore || 0) >= 70
                          ? theme.bull
                          : parseFloat(data.psychology.psychologyScore || 0) >= 40
                            ? theme.gold
                            : theme.bear
                      }
                      sub="Composite discipline rating"
                    />
                    <StatCard
                      label="PLAN ADHERENCE"
                      value={`${data.psychology.scoreBreakdown?.planAdherencePct || 0}%`}
                      color={parseFloat(data.psychology.scoreBreakdown?.planAdherencePct || 0) >= 70 ? theme.bull : theme.bear}
                      sub="Trades executed from plan"
                      delay={0}
                    />
                    <StatCard
                      label="CALM TRADING"
                      value={`${data.psychology.scoreBreakdown?.calmTradingPct || 0}%`}
                      color={parseFloat(data.psychology.scoreBreakdown?.calmTradingPct || 0) >= 50 ? theme.bull : theme.gold}
                      sub="Calm / focused behavior"
                      delay={0}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
                    <div style={{ flex: "1 1 320px", background: theme.card, borderRadius: 14, border: `1px solid ${theme.border}`, padding: 20 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 10 }}>Mood vs Performance</div>
                      {Array.isArray(data.psychology.moodAnalysis) && data.psychology.moodAnalysis.length > 0 ? (
                        data.psychology.moodAnalysis.map((m) => {
                          const winRate = parseFloat(m.winRate || 0);
                          const c = winRate >= 50 ? theme.bull : theme.bear;
                          return (
                            <div key={m.level} style={{ marginBottom: 10 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                <div style={{ fontSize: 12, fontWeight: 900, color: theme.secondary }}>{m.label}</div>
                                <div style={{ fontSize: 11, fontWeight: 900, color: c, fontFamily: "'JetBrains Mono',monospace" }}>
                                  {currency}{parseFloat(m.avgProfit || 0).toFixed(2)} avg
                                </div>
                              </div>
                              <ProgressBar value={winRate} max={100} color={c} label={`${m.trades} trades`} />
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.6 }}>
                          Start tagging your mood when logging trades to unlock this section.
                        </div>
                      )}
                    </div>

                    <div style={{ flex: "1 1 320px", background: theme.card, borderRadius: 14, border: `1px solid ${theme.border}`, padding: 20 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 10 }}>Confidence Calibration</div>
                      {Array.isArray(data.psychology.confidenceAnalysis) && data.psychology.confidenceAnalysis.length > 0 ? (
                        data.psychology.confidenceAnalysis.map((c) => {
                          const winRate = parseFloat(c.winRate || 0);
                          const isOver = String(c.level).toLowerCase().includes("over");
                          const barColor = isOver ? theme.bear : winRate >= 50 ? theme.bull : theme.bear;
                          return (
                            <div key={c.level} style={{ marginBottom: 10 }}>
                              <ProgressBar value={winRate} max={100} color={barColor} label={`${c.level} • ${c.trades} trades`} />
                              <div style={{ fontSize: 11, color: theme.muted, marginTop: -2 }}>
                                Avg: {currency}{parseFloat(c.avgProfit || 0).toFixed(2)}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.6 }}>
                          Start tagging your confidence level to unlock this section.
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
                    <div style={{ flex: "1 1 520px", background: theme.card, borderRadius: 14, border: `1px solid ${theme.border}`, padding: 20 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 10 }}>Emotional Tag Impact</div>
                      {Array.isArray(data.psychology.emotionalTagImpact) && data.psychology.emotionalTagImpact.length > 0 ? (
                        <div>
                          {data.psychology.emotionalTagImpact.slice(0, 8).map((t) => {
                            const winRate = parseFloat(t.winRate || 0);
                            const c = winRate >= 50 ? theme.bull : theme.bear;
                            return (
                              <ListItem
                                key={t.tag}
                                label={`${t.emoji || ""} ${t.tag}`}
                                value={`${winRate}%`}
                                color={c}
                                sub={`${t.trades} trades • Avg: ${currency}${parseFloat(t.avgProfit || 0).toFixed(2)}`}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.6 }}>
                          Tag your emotions when logging trades to see their impact.
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 320px", background: theme.card, borderRadius: 14, border: `1px solid ${theme.border}`, padding: 20 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 10 }}>Would Retake (✅)</div>
                      {data.psychology.wouldRetakeAnalysis?.yes ? (
                        <div style={{ background: `${theme.bull}08`, border: `1px solid ${theme.bull}44`, borderRadius: 12, padding: 14 }}>
                          <div style={{ fontSize: 12, fontWeight: 900, color: theme.bull, marginBottom: 8 }}>Would Retake</div>
                          <div style={{ fontSize: 11, color: theme.muted, display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span>Trades</span>
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 900, color: theme.secondary }}>{data.psychology.wouldRetakeAnalysis.yes.trades}</span>
                          </div>
                          <div style={{ fontSize: 11, color: theme.muted, display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span>Win Rate</span>
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 900, color: theme.bull }}>{data.psychology.wouldRetakeAnalysis.yes.winRate}%</span>
                          </div>
                          <div style={{ fontSize: 11, color: theme.muted, display: "flex", justifyContent: "space-between" }}>
                            <span>Avg P&L</span>
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 900, color: theme.secondary }}>
                              {currency}{parseFloat(data.psychology.wouldRetakeAnalysis.yes.avgProfit || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.6 }}>Use the "Would Retake" toggle when logging trades.</div>
                      )}
                    </div>

                    <div style={{ flex: "1 1 320px", background: theme.card, borderRadius: 14, border: `1px solid ${theme.border}`, padding: 20 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 10 }}>Would NOT Retake (❌)</div>
                      {data.psychology.wouldRetakeAnalysis?.no ? (
                        <div style={{ background: `${theme.bear}08`, border: `1px solid ${theme.bear}44`, borderRadius: 12, padding: 14 }}>
                          <div style={{ fontSize: 12, fontWeight: 900, color: theme.bear, marginBottom: 8 }}>Would NOT Retake</div>
                          <div style={{ fontSize: 11, color: theme.muted, display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span>Trades</span>
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 900, color: theme.secondary }}>{data.psychology.wouldRetakeAnalysis.no.trades}</span>
                          </div>
                          <div style={{ fontSize: 11, color: theme.muted, display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span>Win Rate</span>
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 900, color: theme.bear }}>{data.psychology.wouldRetakeAnalysis.no.winRate}%</span>
                          </div>
                          <div style={{ fontSize: 11, color: theme.muted, display: "flex", justifyContent: "space-between" }}>
                            <span>Avg P&L</span>
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 900, color: theme.secondary }}>
                              {currency}{parseFloat(data.psychology.wouldRetakeAnalysis.no.avgProfit || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.6 }}>Use the "Would Retake" toggle when logging trades.</div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ padding: 18, borderRadius: 12, border: `1px dashed ${theme.border}`, background: "#F8FAFC", color: theme.muted, fontSize: 12, lineHeight: 1.6 }}>
                  Psychology analytics unlocks after you log trades with mood, confidence, emotional tags, and the “Would Retake” toggle.
                </div>
              )}
            </div>

            {/* Path to Advanced / Profitable */}
            <PathToAdvanced
              summary={data.summary}
              ai={data.ai}
              perf={data.perf}
              quality={data.quality}
              psychology={data.psychology}
              currency={currency}
            />
          </>
        )}
      </main>
      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
