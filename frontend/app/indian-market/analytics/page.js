"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getSummary,
  getRiskRewardAnalysis,
  getPerformanceMetrics,
  getTimeAnalysis,
  getDrawdownAnalysis,
  getAIInsights,
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
import InstallPWA from "@/components/InstallPWA";
import { useMarket, MARKETS } from "@/context/MarketContext";

const theme = {
  bull: "#16A34A",
  bear: "#DC2626",
  gold: "#FBBF24",
  primary: "#14532D",
  secondary: "#166534",
  muted: "#6B7280",
  border: "#E5E7EB",
  bg: "#F3F4F6",
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
    breakdown: null
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summary, rr, perf, time, drawdown, ai, breakdown] = await Promise.all([
        getSummary(MARKETS.INDIAN_MARKET),
        getRiskRewardAnalysis(MARKETS.INDIAN_MARKET),
        getPerformanceMetrics(MARKETS.INDIAN_MARKET),
        getTimeAnalysis(MARKETS.INDIAN_MARKET),
        getDrawdownAnalysis(MARKETS.INDIAN_MARKET),
        getAIInsights(MARKETS.INDIAN_MARKET),
        getPnLBreakdown(MARKETS.INDIAN_MARKET)
      ]);
      setData({ summary, rr, perf, time, drawdown, ai, breakdown });
    } finally {
      setLoading(false);
    }
  };

  const currency = "₹";

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
              <img src="/logo.png" alt="Stratedge" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
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
                STRATEDGE
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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <InstallPWA />
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
                value={`${currency}${parseFloat(data.summary?.totalProfit || 0).toLocaleString("en-IN")}`}
                color={parseFloat(data.summary?.totalProfit || 0) >= 0 ? theme.bull : theme.bear}
                sub="Lifetime profit / loss"
              />
              <StatCard
                label="NET AFTER COSTS"
                value={`${currency}${parseFloat(data.summary?.netProfit || 0).toLocaleString("en-IN")}`}
                color={parseFloat(data.summary?.netProfit || 0) >= 0 ? theme.bull : theme.bear}
                sub={`Brokerage & taxes: ${currency}${parseFloat(data.summary?.totalCosts || 0).toLocaleString(
                  "en-IN"
                )}`}
              />
              <StatCard
                label="WIN RATE"
                value={`${data.summary?.winRate || 0}%`}
                color={parseFloat(data.summary?.winRate || 0) >= 50 ? theme.bull : theme.bear}
                sub={`${data.summary?.winningTrades || 0} Wins / ${data.summary?.losingTrades || 0} Losses`}
              />
              <StatCard
                label="AI SCORE"
                value={data.ai?.score || "N/A"}
                color={theme.gold}
                sub="Model-based discipline score"
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
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>When you trade best</div>
                <div style={{ fontSize: 11, color: theme.muted, marginBottom: 12 }}>
                  Based on your NIFTY / BANKNIFTY options history.
                </div>
                {data.time && (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 12, lineHeight: 1.7 }}>
                    <li>
                      <strong>Best day:</strong> {data.time.bestDay?.name || "N/A"} (avg{" "}
                      {currency}
                      {data.time.bestDay?.profit || "0.00"})
                    </li>
                    <li>
                      <strong>Worst day:</strong> {data.time.worstDay?.name || "N/A"} (avg{" "}
                      {currency}
                      {data.time.worstDay?.profit || "0.00"})
                    </li>
                    <li>
                      <strong>Best hour:</strong> {data.time.bestHour?.hour ?? "-"}h (win rate{" "}
                      {data.time.bestHour?.winRate || "0.0"}%)
                    </li>
                    <li>
                      <strong>Best session:</strong> {data.time.bestSession?.name || "N/A"} (
                      {data.time.bestSession?.trades || 0} trades)
                    </li>
                  </ul>
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
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {data.ai?.insights?.length ? (
                    data.ai.insights.slice(0, 6).map((txt, idx) => (
                      <InsightTag
                        key={idx}
                        text={txt}
                        type={
                          txt.includes("⚠️") || txt.includes("drawdown")
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
