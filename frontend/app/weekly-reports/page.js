"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import MarketSwitcher from "@/components/MarketSwitcher";
import { generateWeeklyFeedbackNow, listWeeklyReports } from "@/services/reportsApi";
import { useMarket } from "@/context/MarketContext";

function tryParseJson(value) {
  if (!value || typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractJsonLikeField(text, field) {
  const pattern = new RegExp(`"${field}"\\s*:\\s*"([\\s\\S]*?)"(?=\\s*,\\s*"(?:summary|week|mistakes|improvements|nextWeekChecklist)"|\\s*}\\s*$)`);
  const match = String(text || "").match(pattern);
  if (!match) return "";
  return match[1]
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .replace(/\\u2192/g, "→");
}

function extractJsonLikeList(text, field) {
  const pattern = new RegExp(`"${field}"\\s*:\\s*\\[([\\s\\S]*?)\\](?=\\s*,\\s*"(?:summary|week|mistakes|improvements|nextWeekChecklist)"|\\s*}\\s*$)`);
  const match = String(text || "").match(pattern);
  if (!match) return [];
  const body = match[1];

  if (field === "nextWeekChecklist") {
    return [...body.matchAll(/"((?:\\"|[^"])*)"/g)].map((m) =>
      m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\")
    );
  }

  if (field === "mistakes") {
    return [...body.matchAll(/\{([\s\S]*?)\}/g)].map((m) => {
      const chunk = m[1];
      return {
        title: extractJsonLikeField(`{${chunk}}`, "title"),
        evidence: extractJsonLikeField(`{${chunk}}`, "evidence"),
        fix: extractJsonLikeField(`{${chunk}}`, "fix"),
      };
    }).filter((item) => item.title || item.evidence || item.fix);
  }

  return [];
}

function normalizeAiFeedback(raw) {
  if (!raw) return null;

  const parsed =
    typeof raw === "object"
      ? raw
      : tryParseJson(raw) || { week: "", summary: String(raw), mistakes: [], improvements: [], nextWeekChecklist: [] };

  const nested = typeof parsed.summary === "string" ? tryParseJson(parsed.summary) : null;
  const merged =
    nested && typeof nested === "object"
      ? {
          ...parsed,
          ...nested,
          mistakes: nested.mistakes || parsed.mistakes || [],
          improvements: nested.improvements || parsed.improvements || [],
          nextWeekChecklist: nested.nextWeekChecklist || parsed.nextWeekChecklist || [],
        }
      : parsed;

  const rawSummary = typeof merged.summary === "string" ? merged.summary : "";
  const summary = rawSummary.trim().startsWith("{")
    ? extractJsonLikeField(rawSummary, "summary") || rawSummary
    : rawSummary;
  const week = merged.week || (rawSummary.trim().startsWith("{") ? extractJsonLikeField(rawSummary, "week") : "");
  const mistakes =
    Array.isArray(merged.mistakes) && merged.mistakes.length > 0
      ? merged.mistakes
      : rawSummary.trim().startsWith("{")
        ? extractJsonLikeList(rawSummary, "mistakes")
        : [];
  const nextWeekChecklist =
    Array.isArray(merged.nextWeekChecklist) && merged.nextWeekChecklist.length > 0
      ? merged.nextWeekChecklist
      : rawSummary.trim().startsWith("{")
        ? extractJsonLikeList(rawSummary, "nextWeekChecklist")
        : [];

  return {
    week: week || "",
    summary,
    summaryParagraphs: summary.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean),
    mistakes,
    improvements: Array.isArray(merged.improvements) ? merged.improvements : [],
    nextWeekChecklist,
  };
}

function SectionCard({ title, accent = "#0D9E6E", children }) {
  return (
    <div style={{ border: "1px solid #E2E8F0", borderRadius: 14, padding: 16, background: "#FFFFFF", boxShadow: "0 2px 10px rgba(15,25,35,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: 999, background: accent }} />
        <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.12em", fontWeight: 800 }}>
          {title}
        </div>
      </div>
      {children}
    </div>
  );
}

function WeeklyReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const marketParam = searchParams.get("market");
  const { currentMarket, getCurrencySymbol } = useMarket();
  const [reports, setReports] = useState(null);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const fetchReports = async () => {
    const data = await listWeeklyReports(20, currentMarket);
    setReports(data);
    if (!selected && data?.length) setSelected(data[0]);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchReports().catch((e) => setError(e.message || "Failed to load reports"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, currentMarket]);

  const header = useMemo(() => {
    if (!selected) return null;
    const label = selected?.snapshot?.week?.label;
    return label || "Weekly Report";
  }, [selected]);

  const ai = useMemo(() => normalizeAiFeedback(selected?.aiFeedback), [selected]);
  const snap = selected?.snapshot;
  const currency = getCurrencySymbol();

  const onGenerateNow = async () => {
    try {
      setBusy(true);
      setError("");
      setInfo("");
      const created = await generateWeeklyFeedbackNow(currentMarket);
      await fetchReports();
      setSelected(created);
    } catch (e) {
      const msg = e?.message || "Failed to generate weekly feedback";
      if (msg.toLowerCase().includes("last 7 days")) {
        setInfo("You already generated AI feedback in the last 7 days. You can generate again after 7 days from your last run.");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F0EEE9", fontFamily: "'Plus Jakarta Sans',sans-serif", color: "#0F1923" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
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
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href={marketParam === "Indian_Market" ? "/indian-market/dashboard" : "/dashboard"} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src="/mainlogo.png" alt="LOGNERA" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "0.04em", color: "#0F1923", lineHeight: 1 }}>LOGNERA</div>
              <div style={{ fontSize: 9, letterSpacing: "0.18em", color: "#0D9E6E", marginTop: 1, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>
                {marketParam === "Indian_Market" ? "OPTIONS JOURNAL · NSE" : "FOREX AI JOURNAL"}
              </div>
            </div>
          </Link>
        </div>

        <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(marketParam === "Indian_Market"
            ? [
                { href: "/indian-market/trades", label: "Journal" },
                { href: "/indian-market/add-trade", label: "Log Option" },
                { href: "/indian-market/analytics", label: "Analytics" },
                { href: "/weekly-reports?market=Indian_Market", label: "Weekly AI" },
              ]
            : [
                { href: "/trades", label: "Journal" },
                { href: "/add-trade", label: "Log Trade" },
                { href: "/analytics", label: "Analytics" },
                { href: "/weekly-reports?market=Forex", label: "Weekly AI" },
              ]).map((n) => (
            <Link
              key={n.href}
              href={n.href}
              style={{
                fontSize: 13,
                color: "#4A5568",
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
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(13,158,110,0.18)";
                e.currentTarget.style.color = "#0F1923";
                e.currentTarget.style.borderColor = "rgba(13,158,110,0.6)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
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

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <MarketSwitcher />
          <button
            onClick={onGenerateNow}
            disabled={busy}
            style={{
              background: "linear-gradient(135deg,#0D9E6E,#22C78E)",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              color: "#0F1923",
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.08em",
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.7 : 1,
              boxShadow: "0 2px 8px rgba(13,158,110,0.2)",
            }}
          >
            {busy ? "GENERATING..." : "GENERATE AI FEEDBACK"}
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("token");
              router.push("/login");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(214,59,59,0.1)",
              border: "1px solid rgba(214,59,59,0.3)",
              borderRadius: 6,
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: 10,
              letterSpacing: "0.1em",
              color: "#D63B3B",
              fontFamily: "'JetBrains Mono',monospace",
              fontWeight: 600,
            }}
          >
            LOGOUT
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "18px", display: "grid", gridTemplateColumns: "320px 1fr", gap: 14 }}>
        <section style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 10px rgba(15,25,35,0.04)" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #E2E8F0" }}>
            <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.12em", fontWeight: 700 }}>HISTORY</div>
          </div>
          {!reports ? (
            <div style={{ padding: 18 }}>
              <LoadingSpinner message="LOADING REPORTS..." />
            </div>
          ) : reports.length === 0 ? (
            <div style={{ padding: 18, color: "#64748B", fontSize: 12 }}>No reports yet. Click <b>Generate AI Feedback</b>.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {reports.map((r) => {
                const label = r?.snapshot?.week?.label || new Date(r.weekStart).toDateString();
                const active = selected?._id === r._id;
                return (
                  <button
                    key={r._id}
                    onClick={() => setSelected(r)}
                    style={{
                      textAlign: "left",
                      padding: "12px 14px",
                      border: "none",
                      borderBottom: "1px solid #F1F5F9",
                      background: active ? "rgba(13,158,110,0.10)" : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#0F1923" }}>{label}</div>
                    <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace", marginTop: 4 }}>
                      Trades: {r?.snapshot?.counts?.totalTrades ?? 0} • Net: {currency}{r?.snapshot?.pnl?.net ?? 0}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, boxShadow: "0 2px 10px rgba(15,25,35,0.04)" }}>
          {error ? (
            <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: "rgba(214,59,59,0.10)", border: "1px solid rgba(214,59,59,0.25)", color: "#D63B3B", fontSize: 12 }}>
              {error}
            </div>
          ) : null}
          {info && !error ? (
            <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: "rgba(13,158,110,0.06)", border: "1px solid rgba(13,158,110,0.3)", color: "#0D9E6E", fontSize: 12 }}>
              {info}
            </div>
          ) : null}

          {!selected ? (
            <div style={{ color: "#64748B", fontSize: 12 }}>Select a report from the left.</div>
          ) : (
            <>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 18, fontWeight: 900 }}>{header}</div>
                <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.08em", marginTop: 4 }}>
                  MODEL: {selected.aiModel || "—"} • TRADES: {snap?.counts?.totalTrades ?? 0} • WINRATE: {snap?.rates?.winRatePct ?? 0}%
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, marginBottom: 14 }}>
                {[
                  { k: "Net PnL", v: `${currency}${snap?.pnl?.net ?? 0}`, c: (snap?.pnl?.net ?? 0) >= 0 ? "#0D9E6E" : "#D63B3B" },
                  { k: "Win Rate", v: `${snap?.rates?.winRatePct ?? 0}%`, c: "#0F1923" },
                  { k: "Profit Factor", v: snap?.rates?.profitFactor ?? "0.00", c: "#0F1923" },
                  {
                    k: "Discipline",
                    v:
                      typeof snap?.discipline?.avgSetupScore === "number"
                        ? snap.discipline.avgSetupScore
                        : typeof snap?.discipline?.entryBasis?.planPct === "number"
                          ? `${snap.discipline.entryBasis.planPct}% Plan`
                          : "—",
                    c: "#0F1923",
                  },
                ].map((m) => (
                  <div key={m.k} style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 12px" }}>
                    <div style={{ fontSize: 9, color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.12em", fontWeight: 700 }}>
                      {m.k.toUpperCase()}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 18, fontWeight: 900, color: m.c, fontFamily: "'JetBrains Mono',monospace" }}>
                      {m.v}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <SectionCard title="AI OVERVIEW" accent="#0D9E6E">
                  {ai?.week ? (
                    <div style={{ marginBottom: 10, display: "inline-flex", padding: "4px 8px", borderRadius: 999, background: "#F8FAFC", border: "1px solid #E2E8F0", fontSize: 11, color: "#64748B", fontFamily: "'JetBrains Mono',monospace" }}>
                      {ai.week}
                    </div>
                  ) : null}
                  {(ai?.summaryParagraphs?.length || 0) > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {ai.summaryParagraphs.map((paragraph, idx) => (
                        <p key={idx} style={{ margin: 0, fontSize: 13, lineHeight: 1.75, color: "#0F1923" }}>
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, lineHeight: 1.7, color: "#0F1923" }}>Generate a report to see AI feedback.</div>
                  )}
                </SectionCard>

                <div className="weekly-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <SectionCard title="TOP MISTAKES" accent="#D63B3B">
                    {(ai?.mistakes || []).length === 0 ? (
                      <div style={{ color: "#64748B", fontSize: 12 }}>No major mistakes highlighted this week.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {ai.mistakes.slice(0, 5).map((m, idx) => (
                          <div key={idx} style={{ padding: "12px", borderRadius: 12, background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                            <div style={{ fontWeight: 900, fontSize: 13, color: "#0F1923" }}>{m.title || `Mistake ${idx + 1}`}</div>
                            {m.evidence ? <div style={{ marginTop: 8, fontSize: 12, color: "#4A5568", lineHeight: 1.6 }}>{m.evidence}</div> : null}
                            {m.fix ? <div style={{ marginTop: 8, fontSize: 12, color: "#0F1923", lineHeight: 1.6 }}><strong>What to do:</strong> {m.fix}</div> : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </SectionCard>

                  <SectionCard title="NEXT WEEK CHECKLIST" accent="#B8860B">
                    {(ai?.nextWeekChecklist || []).length === 0 ? (
                      <div style={{ color: "#64748B", fontSize: 12 }}>No checklist generated yet.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {ai.nextWeekChecklist.slice(0, 8).map((c, idx) => (
                          <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 10, background: "#FFFBEB", border: "1px solid #FDE68A" }}>
                            <div style={{ width: 20, height: 20, borderRadius: 999, background: "#FFF7D6", border: "1px solid #F5D36A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#8A6A00", flexShrink: 0 }}>
                              {idx + 1}
                            </div>
                            <div style={{ fontSize: 12, color: "#0F1923", lineHeight: 1.55 }}>{c}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </SectionCard>
                </div>

                {(ai?.improvements || []).length > 0 ? (
                  <SectionCard title="FOCUS AREAS" accent="#3B82F6">
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {ai.improvements.slice(0, 5).map((item, idx) => (
                        <div key={idx} style={{ padding: "10px 12px", borderRadius: 10, background: "#F8FAFC", border: "1px solid #E2E8F0", fontSize: 12, color: "#0F1923", lineHeight: 1.55 }}>
                          {typeof item === "string" ? item : item?.title || JSON.stringify(item)}
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                ) : null}
              </div>
            </>
          )}
        </section>
      </main>

      <style>{`
        @media (max-width: 900px) {
          main { grid-template-columns: 1fr !important; }
          .weekly-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export default function WeeklyReportsPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="LOADING..." fullPage />}>
      <WeeklyReportsContent />
    </Suspense>
  );
}
