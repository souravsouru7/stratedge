"use client";

import { Suspense } from "react";
import Link from "next/link";
import CandlestickBackground from "@/features/shared/components/CandlestickBackground";
import TickerTape            from "@/features/shared/components/TickerTape";
import PageHeader            from "@/features/shared/components/PageHeader";
import StatCard              from "@/features/analytics/components/StatCard";
import SectionCard           from "@/features/analytics/components/SectionCard";
import ProgressBar           from "@/features/analytics/components/ProgressBar";
import ListItem              from "@/features/analytics/components/ListItem";
import CalendarPnL           from "@/features/analytics/components/CalendarPnL";
import InsightTag            from "@/features/analytics/components/InsightTag";
import { useAnalytics }      from "@/features/analytics/hooks/useAnalytics";
import { Skeleton }          from "@/features/shared";

const C = { bull: "#0D9E6E", bear: "#D63B3B", gold: "#B8860B", purple: "#8B5CF6", primary: "#0F1923", muted: "#94A3B8" };

// ── helpers ────────────────────────────────────────────────────────────────────
function fmt(n, prefix = "$") {
  const v = parseFloat(n || 0);
  return `${v >= 0 ? "+" : ""}${prefix}${Math.abs(v).toFixed(2)}`;
}

function sessionFmt(s) {
  if (!s || !s.trades) return null;
  const p = parseFloat(s.profit || 0);
  return { profit: `${p >= 0 ? "+" : ""}$${Math.abs(p).toFixed(2)}`, winRate: s.winRate, trades: s.trades, name: s.name };
}

function classifyInsight(text) {
  if (!text) return "info";
  const t = text.toLowerCase();
  if (t.includes("risk") || t.includes("drawdown") || t.includes("loss") || t.includes("negative")) return "danger";
  if (t.includes("excellent") || t.includes("strong") || t.includes("well") || t.includes("consistent")) return "success";
  if (t.includes("improve") || t.includes("consider") || t.includes("caution")) return "warning";
  return "info";
}

// Convert distribution.byPair / byStrategy (object) → sorted array
function objToRows(obj, keyName = "name", limit = 6) {
  return Object.entries(obj || {})
    .filter(([k]) => k && k !== "Unspecified" && k !== "undefined")
    .map(([k, s]) => ({
      [keyName]: k,
      count: s.total || 0,
      winRate: s.winRate ?? "0.0",
      profit: parseFloat(s.profit || 0).toFixed(2),
    }))
    .sort((a, b) => parseFloat(b.profit) - parseFloat(a.profit))
    .slice(0, limit);
}

// ── Pair row ───────────────────────────────────────────────────────────────────
function PairRow({ name, count, winRate, profit }) {
  const p = parseFloat(profit);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F4F2EE" }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.primary, fontFamily: "'JetBrains Mono',monospace" }}>{name}</div>
        <div style={{ fontSize: 10, color: C.muted }}>{count} trades · {winRate}% WR</div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: p >= 0 ? C.bull : C.bear }}>
        {p >= 0 ? "+" : ""}${Math.abs(p).toFixed(2)}
      </div>
    </div>
  );
}

// ── Psych bar row ──────────────────────────────────────────────────────────────
function PsychRow({ label, winRate, trades, avgProfit, color }) {
  const wr = parseFloat(winRate || 0);
  const ap = parseFloat(avgProfit || 0);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.primary }}>{label}</span>
        <div style={{ display: "flex", gap: 12 }}>
          <span style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono',monospace" }}>{trades}t</span>
          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: ap >= 0 ? C.bull : C.bear }}>{ap >= 0 ? "+" : "-"}${Math.abs(ap).toFixed(2)}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: wr >= 50 ? C.bull : C.bear }}>{wr}%</span>
        </div>
      </div>
      <div style={{ height: 4, background: "#F4F2EE", borderRadius: 99 }}>
        <div style={{ height: "100%", width: `${Math.min(100, wr)}%`, background: color || (wr >= 50 ? C.bull : C.bear), borderRadius: 99, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function AnalyticsContent() {
  const { loading, data, calendarMonth, prevMonth, nextMonth } = useAnalytics();
  const { summary, riskReward, distribution, performance, timeAnalysis, quality, drawdown, aiInsights, psychology } = data;

  const has    = summary?.totalTrades > 0;
  const pnl    = parseFloat(summary?.totalProfit ?? 0);
  const bullPnl = pnl >= 0;

  // Strategy rows — FIX: was reading quality?.byStrategy (doesn't exist); correct source is distribution.byStrategy
  const strategyRows = objToRows(distribution?.byStrategy, "name", 6);

  // Pair rows — data collected but was never shown
  const pairRows = objToRows(distribution?.byPair, "name", 6);

  // Mood data — FIX: was reading psychology.moodWinRate which doesn't exist
  const moodRows = psychology?.moodAnalysis || [];
  const confRows = psychology?.confidenceAnalysis || [];
  const tagRows  = psychology?.emotionalTagImpact || [];

  // FOMO count — FIX: was reading psychology.fomoTrades which doesn't exist
  const fomoTrades = tagRows.find(t => t.tag === "FOMO")?.trades ?? 0;
  const revengeTrades = tagRows.find(t => t.tag === "Revenge")?.trades ?? 0;

  // Discipline score — FIX: was reading psychology.disciplineScore; correct field is psychologyScore
  const disciplineScore = psychology?.psychologyScore ?? 0;

  // Mood win rate — computed from moodAnalysis (was previously always 0)
  const totalMoodTrades = moodRows.reduce((s, m) => s + m.trades, 0);
  const totalMoodWins   = moodRows.reduce((s, m) => s + m.wins,   0);
  const moodWinRate     = totalMoodTrades > 0 ? ((totalMoodWins / totalMoodTrades) * 100).toFixed(1) : "0.0";

  // Score breakdown for entry basis
  const sb = psychology?.scoreBreakdown || {};

  return (
    <div style={{ minHeight: "100vh", background: "#F4F2EE", display: "flex", flexDirection: "column", fontFamily: "'Plus Jakarta Sans',sans-serif", color: "#0F1923", position: "relative" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <CandlestickBackground canvasId="analytics-bg-canvas" />

      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <PageHeader showMarketSwitcher />
        <TickerTape />

        <main style={{ flex: 1, maxWidth: 1200, width: "100%", margin: "0 auto", padding: "28px 24px", boxSizing: "border-box" }}>

          {/* ── Page title ─────────────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: C.primary, letterSpacing: "-0.02em", margin: 0 }}>Analytics</h1>
              <p style={{ fontSize: 12, color: C.muted, fontFamily: "'JetBrains Mono',monospace", margin: "4px 0 0", letterSpacing: "0.04em" }}>
                Performance intelligence
              </p>
            </div>
            <Link href="/trades" style={{ fontSize: 12, color: C.primary, border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 14px", textDecoration: "none", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, background: "#FFFFFF" }}>← Journal</Link>
          </div>

          {/* ── Row 1: Core KPIs ───────────────────────────────── */}
          <div className="analytics-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 14 }}>
            {[
              { label: "Total Trades",  value: has ? String(summary.totalTrades)  : "—", sub: "trades logged",        color: C.primary },
              { label: "Win Rate",      value: has ? `${summary.winRate}%`          : "—", sub: "of trades profitable", color: summary?.winRate >= 50 ? C.bull : C.bear },
              { label: "Net P&L",       value: has ? `${bullPnl ? "+" : ""}$${Math.abs(pnl).toFixed(2)}` : "—", sub: "total return", color: bullPnl ? C.bull : C.bear },
              { label: "Avg Win",       value: has ? `$${parseFloat(summary.avgWin  || 0).toFixed(2)}` : "—", sub: "avg winner",     color: C.bull },
              { label: "Avg Loss",      value: has ? `$${parseFloat(summary.avgLoss || 0).toFixed(2)}` : "—", sub: "avg loser",      color: C.bear },
            ].map((s, i) => <StatCard key={s.label} {...s} loading={loading} delay={i * 0.05} />)}
          </div>

          {/* ── Row 2: Risk & Performance KPIs ─────────────────── */}
          <div className="analytics-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
            {[
              {
                label: "Profit Factor",
                value: has ? (performance?.profitFactor || "0.00") : "—",
                sub: "gross profit / loss",
                color: parseFloat(performance?.profitFactor || 0) >= 1.5 ? C.bull : C.bear,
              },
              {
                // FIX: was performance?.sharpeRatio — that field doesn't exist.
                // Correct source: riskReward.riskAdjustedReturn
                label: "Sharpe Ratio",
                value: has ? parseFloat(riskReward?.riskAdjustedReturn || 0).toFixed(2) : "—",
                sub: "risk-adjusted return",
                color: parseFloat(riskReward?.riskAdjustedReturn || 0) >= 1 ? C.bull : C.bear,
              },
              { label: "Max Drawdown", value: has ? `${drawdown?.maxDrawdown || 0}%`  : "—", sub: "largest equity drop", color: C.bear },
              { label: "Expectancy",   value: has ? `$${parseFloat(performance?.expectancy || 0).toFixed(2)}` : "—", sub: "per trade expectancy", color: parseFloat(performance?.expectancy || 0) >= 0 ? C.bull : C.bear },
              // NEW: Streaks — data was collected but never displayed
              { label: "Best Streak",  value: has ? String(performance?.maxWinStreak || 0) : "—", sub: "win streak record", color: C.gold },
              { label: "Worst Streak", value: has ? String(performance?.maxLossStreak || 0) : "—", sub: "loss streak record", color: C.bear },
            ].map((s, i) => <StatCard key={s.label} {...s} loading={loading} delay={i * 0.05} />)}
          </div>

          {loading && (
            <>
              {/* ── Skeleton section rows ─────────────────────────── */}
              {[
                { cols: 3, heights: [180, 160, 160] },
                { cols: 3, heights: [160, 140, 140] },
                { cols: 1, heights: [200] },
                { cols: 2, heights: [220, 180] },
              ].map((row, ri) => (
                <div key={ri} style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(280px, 1fr))`, gap: 16, marginBottom: 24 }}>
                  {row.heights.map((h, ci) => (
                    <div key={ci} style={{ background: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden", boxShadow: "0 2px 12px rgba(15,25,35,0.05)" }}>
                      <div style={{ height: 3, background: "#EDF2F7" }} />
                      <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
                        <Skeleton width="120px" height="14px" style={{ marginBottom: 6 }} />
                        <Skeleton width="80px" height="10px" />
                      </div>
                      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                        {[...Array(Math.round(h / 28))].map((_, li) => (
                          <Skeleton key={li} width={`${100 - li * 8}%`} height="16px" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}

          {!loading && (
            <>
              {/* ── Distribution + Strategy + Pairs ──────────────── */}
              <div className="analytics-section-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 20 }}>

                {/* Long vs Short */}
                <SectionCard title="Trade Direction" subtitle="LONG VS SHORT" delay={0.2} accentColor={C.bull}>
                  {(() => {
                    // Derive long/short from byType.BUY / byType.SELL if top-level fields are missing
                    const longT  = distribution?.longTrades  ?? distribution?.byType?.BUY?.total  ?? 0;
                    const shortT = distribution?.shortTrades ?? distribution?.byType?.SELL?.total ?? 0;
                    const longWR  = distribution?.longWinRate  ?? distribution?.byType?.BUY?.winRate  ?? "0.0";
                    const shortWR = distribution?.shortWinRate ?? distribution?.byType?.SELL?.winRate ?? "0.0";
                    const longP   = parseFloat(distribution?.longProfit  ?? distribution?.byType?.BUY?.profit  ?? 0);
                    const shortP  = parseFloat(distribution?.shortProfit ?? distribution?.byType?.SELL?.profit ?? 0);
                    const total   = (longT + shortT) || 1;
                    const hasData = longT > 0 || shortT > 0;
                    return hasData ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <ProgressBar label={`Long (${longT})`}  value={longT}  max={total} color={C.bull} />
                        <ProgressBar label={`Short (${shortT})`} value={shortT} max={total} color={C.bear} />
                        <div style={{ height: 1, background: "#E2E8F0", margin: "4px 0" }} />
                        <ProgressBar label={`Long Win Rate  ${longWR}%`}  value={parseFloat(longWR)}  showPercent={false} color={C.bull} />
                        <ProgressBar label={`Short Win Rate ${shortWR}%`} value={parseFloat(shortWR)} showPercent={false} color={C.bear} />
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                          <span style={{ fontSize: 10, color: C.bull, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>Long P&L: {longP >= 0 ? "+" : ""}${Math.abs(longP).toFixed(2)}</span>
                          <span style={{ fontSize: 10, color: C.bear, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>Short P&L: {shortP >= 0 ? "+" : ""}${Math.abs(shortP).toFixed(2)}</span>
                        </div>
                      </div>
                    ) : <p style={{ color: C.muted, fontSize: 12 }}>No trade direction data yet.</p>;
                  })()}
                </SectionCard>

                {/* Strategy Breakdown — FIX: was quality?.byStrategy (doesn't exist), now using distribution.byStrategy */}
                <SectionCard title="Strategy Breakdown" subtitle="PERFORMANCE BY SETUP" delay={0.25} accentColor={C.gold}>
                  {strategyRows.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                      {strategyRows.map((s, i) => (
                        <PairRow key={i} name={s.name} count={s.count} winRate={s.winRate} profit={s.profit} />
                      ))}
                    </div>
                  ) : <p style={{ color: C.muted, fontSize: 12 }}>Tag trades with strategies to see breakdown.</p>}
                </SectionCard>

                {/* Currency Pair Performance — NEW: data was collected but never shown */}
                <SectionCard title="Pair Performance" subtitle="BY CURRENCY PAIR" delay={0.3} accentColor={C.gold}>
                  {pairRows.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                      {pairRows.map((s, i) => (
                        <PairRow key={i} name={s.name} count={s.count} winRate={s.winRate} profit={s.profit} />
                      ))}
                    </div>
                  ) : <p style={{ color: C.muted, fontSize: 12 }}>No pair data yet.</p>}
                </SectionCard>
              </div>

              {/* ── R:R Analysis ──────────────────────────────────── */}
              <div className="analytics-section-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 20 }}>
                <SectionCard title="Risk / Reward" subtitle="RR DISTRIBUTION" delay={0.35} accentColor={C.bear}>
                  {riskReward ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {[
                        { label: "Avg R:R Ratio",   value: `${parseFloat(riskReward.avgRR     || 0).toFixed(2)}:1`, color: parseFloat(riskReward.avgRR || 0) >= 1 ? C.bull : C.bear },
                        { label: "Best Trade RR",   value: `${parseFloat(riskReward.bestRR    || 0).toFixed(2)}:1`, color: C.bull },
                        { label: "Avg RR — Wins",   value: `${parseFloat(riskReward.avgWinRR  || 0).toFixed(2)}:1`, color: C.bull },
                        { label: "Avg RR — Losses", value: `${parseFloat(riskReward.avgLossRR || 0).toFixed(2)}:1`, color: C.bear },
                        { label: "Largest Win",     value: `$${parseFloat(performance?.largestWin  || 0).toFixed(2)}`, color: C.bull },
                        { label: "Largest Loss",    value: `$${Math.abs(parseFloat(performance?.largestLoss || 0)).toFixed(2)}`, color: C.bear },
                      ].map(r => (
                        <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #F4F2EE" }}>
                          <span style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono',monospace" }}>{r.label}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: r.color }}>{r.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p style={{ color: C.muted, fontSize: 12 }}>No data yet.</p>}
                </SectionCard>

                {/* Session cards */}
                {timeAnalysis && (
                  <SectionCard title="Session Performance" subtitle="BEST & WORST SESSIONS" delay={0.4} accentColor={C.primary}>
                    {timeAnalysis.bestSession ? (
                      <div>
                        <ListItem label="Best Session"    value={`$${timeAnalysis.bestSession.profit || 0}`}  color={C.bull} sub={`${timeAnalysis.bestSession.name} · ${timeAnalysis.bestSession.winRate}% WR`} />
                        <ListItem label="Worst Session"   value={timeAnalysis.worstSession ? `$${timeAnalysis.worstSession.profit}` : "—"} color={C.bear} sub={timeAnalysis.worstSession ? `${timeAnalysis.worstSession.name} · ${timeAnalysis.worstSession.winRate}% WR` : "Need more data"} />
                        <ListItem label="Highest WR"      value={timeAnalysis.bestSessionWR ? `${timeAnalysis.bestSessionWR.winRate}%` : "—"} color={C.gold} sub={timeAnalysis.bestSessionWR?.name || "Need more data"} />
                      </div>
                    ) : <p style={{ color: C.muted, fontSize: 12 }}>Tag trades with sessions to see breakdown.</p>}
                  </SectionCard>
                )}

                {/* Timing Insights */}
                <SectionCard title="Timing Insights" subtitle="OPTIMAL WINDOWS" delay={0.45} accentColor={C.gold}>
                  {timeAnalysis ? (
                    <div>
                      <ListItem label="Best Day"    value={timeAnalysis.bestDay?.profit  > 0 ? `$${timeAnalysis.bestDay.profit}`   : "—"} color={C.bull} sub={timeAnalysis.bestDay?.name  || "Need more data"} />
                      <ListItem label="Worst Day"   value={timeAnalysis.worstDay?.profit ? `$${timeAnalysis.worstDay.profit}`       : "—"} color={C.bear} sub={timeAnalysis.worstDay?.name || "Need more data"} />
                      <ListItem label="Best Hour"   value={timeAnalysis.bestHour?.profit  > 0 ? `$${timeAnalysis.bestHour.profit}`  : "—"} color={C.bull} sub={timeAnalysis.bestHour ? `${String(timeAnalysis.bestHour.hour).padStart(2,"0")}:00 UTC` : "Need more data"} />
                      <ListItem label="Worst Hour"  value={timeAnalysis.worstHour?.hour != null ? `$${timeAnalysis.worstHour.profit}` : "—"} color={C.bear} sub={timeAnalysis.worstHour ? `${String(timeAnalysis.worstHour.hour).padStart(2,"0")}:00 UTC` : "Need more data"} />
                    </div>
                  ) : <p style={{ color: C.muted, fontSize: 12 }}>Log more trades to see timing data.</p>}
                </SectionCard>
              </div>

              {/* ── Calendar ──────────────────────────────────────── */}
              <div style={{ marginBottom: 24 }}>
                <SectionCard title="Calendar Performance" subtitle="DAILY P&L HEATMAP" delay={0.5} accentColor={C.bull}>
                  <CalendarPnL byDate={timeAnalysis?.byDate || {}} activeMonth={calendarMonth} onPrevMonth={prevMonth} onNextMonth={nextMonth} currency="$" />
                </SectionCard>
              </div>

              {/* ── Psychology ────────────────────────────────────── */}
              {psychology && (
                <div style={{ marginBottom: 24 }}>
                  <SectionCard title="Psychology & Discipline" subtitle="EMOTIONAL TRADING ANALYSIS" delay={0.55} accentColor={C.purple}>

                    {/* Top scores */}
                    <div className="analytics-psych-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 16 }}>
                      {[
                        // FIX: was psychology.disciplineScore (doesn't exist) → now psychologyScore
                        { label: "Discipline Score", value: `${disciplineScore}%`, color: C.purple },
                        // FIX: was psychology.moodWinRate (doesn't exist) → computed from moodAnalysis
                        { label: "Mood Win Rate",    value: `${moodWinRate}%`,     color: totalMoodTrades > 0 ? (parseFloat(moodWinRate) >= 50 ? C.bull : C.bear) : C.muted },
                        // FIX: was psychology.fomoTrades (doesn't exist) → from emotionalTagImpact
                        { label: "FOMO Trades",      value: String(fomoTrades),    color: fomoTrades > 0 ? C.bear : C.bull },
                        { label: "Revenge Trades",   value: String(revengeTrades), color: revengeTrades > 0 ? C.bear : C.bull },
                        { label: "Plan Adherence",   value: sb.planAdherencePct ? `${parseFloat(sb.planAdherencePct).toFixed(0)}%` : "—", color: C.gold },
                      ].map(m => (
                        <div key={m.label} style={{ background: "#FAFAFA", borderRadius: 10, padding: "12px 14px", border: "1px solid #E8EDF2" }}>
                          <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 6 }}>{m.label.toUpperCase()}</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: m.color, fontFamily: "'JetBrains Mono',monospace" }}>{m.value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="analytics-psych-sub" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>

                      {/* Mood breakdown */}
                      {moodRows.length > 0 && (
                        <div>
                          <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 12 }}>MOOD LEVEL (1–5)</div>
                          {moodRows.map(m => (
                            <PsychRow key={m.level} label={m.label} winRate={m.winRate} trades={m.trades} avgProfit={m.avgProfit}
                              color={m.level >= 4 ? C.bull : m.level <= 2 ? C.bear : C.gold} />
                          ))}
                        </div>
                      )}

                      {/* Confidence breakdown */}
                      {confRows.length > 0 && (
                        <div>
                          <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 12 }}>CONFIDENCE LEVEL</div>
                          {confRows.map(c => {
                            const confColor = { Low: C.bear, Medium: C.gold, High: C.bull, Overconfident: C.bear };
                            return <PsychRow key={c.level} label={c.level} winRate={c.winRate} trades={c.trades} avgProfit={c.avgProfit} color={confColor[c.level]} />;
                          })}
                        </div>
                      )}

                      {/* Emotional tag impact */}
                      {tagRows.length > 0 && (
                        <div>
                          <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 12 }}>EMOTIONAL TAG IMPACT</div>
                          {tagRows.slice(0, 6).map(t => (
                            <PsychRow key={t.tag} label={`${t.emoji} ${t.tag}`} winRate={t.winRate} trades={t.trades} avgProfit={t.avgProfit}
                              color={["FOMO","Revenge","Fear","Frustrated","Greed"].includes(t.tag) ? C.bear : C.bull} />
                          ))}
                        </div>
                      )}

                      {/* Would Retake */}
                      {(psychology.wouldRetakeAnalysis?.yes || psychology.wouldRetakeAnalysis?.no) && (
                        <div>
                          <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 12 }}>WOULD YOU RETAKE?</div>
                          {psychology.wouldRetakeAnalysis.yes && (
                            <PsychRow label="Yes — retake" winRate={psychology.wouldRetakeAnalysis.yes.winRate}
                              trades={psychology.wouldRetakeAnalysis.yes.trades} avgProfit={psychology.wouldRetakeAnalysis.yes.avgProfit} color={C.bull} />
                          )}
                          {psychology.wouldRetakeAnalysis.no && (
                            <PsychRow label="No — skip" winRate={psychology.wouldRetakeAnalysis.no.winRate}
                              trades={psychology.wouldRetakeAnalysis.no.trades} avgProfit={psychology.wouldRetakeAnalysis.no.avgProfit} color={C.bear} />
                          )}
                          {psychology.totalTrackedTrades > 0 && (
                            <div style={{ fontSize: 10, color: C.muted, marginTop: 8 }}>{psychology.totalTrackedTrades} psychologically tracked trades</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Empty state */}
                    {moodRows.length === 0 && confRows.length === 0 && tagRows.length === 0 && (
                      <p style={{ color: C.muted, fontSize: 12, textAlign: "center", padding: "20px 0" }}>
                        Tag your trades with mood, confidence, and emotional state to unlock psychology insights.
                      </p>
                    )}
                  </SectionCard>
                </div>
              )}

              {/* ── AI Insights ───────────────────────────────────── */}
              {aiInsights?.insights?.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <SectionCard title="AI Insights" subtitle="AUTOMATED ANALYSIS" delay={0.7} accentColor={C.bull}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 0 }}>
                      {aiInsights.insights.slice(0, 6).map((insight, i) => (
                        <InsightTag key={i} text={insight} type={classifyInsight(insight)} />
                      ))}
                    </div>
                  </SectionCard>
                </div>
              )}
            </>
          )}

          {/* ── No data state ──────────────────────────────────── */}
          {!has && !loading && (
            <div style={{ textAlign: "center", padding: "80px 20px", color: C.muted }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.primary, marginBottom: 8 }}>No trades yet</div>
              <div style={{ fontSize: 13, marginBottom: 24 }}>Upload your first trade to unlock analytics.</div>
              <Link href="/upload-trade" style={{ display: "inline-block", background: C.bull, color: "#FFFFFF", padding: "12px 24px", borderRadius: 10, textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
                Upload First Trade
              </Link>
            </div>
          )}
        </main>
      </div>

      <style jsx global>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        @media (max-width: 640px) {
          main { padding: 14px !important; }
          .analytics-kpi-grid   { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .analytics-section-grid { grid-template-columns: 1fr !important; }
          .analytics-psych-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .analytics-psych-sub  { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 360px) {
          .analytics-kpi-grid { grid-template-columns: 1fr !important; }
          .analytics-psych-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export default function AnalyticsPage() {
  return <Suspense><AnalyticsContent /></Suspense>;
}
