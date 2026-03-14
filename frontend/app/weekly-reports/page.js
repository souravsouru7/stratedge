"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import MarketSwitcher from "@/components/MarketSwitcher";
import { generateWeeklyFeedbackNow, listWeeklyReports } from "@/services/reportsApi";
import { useMarket } from "@/context/MarketContext";

function WeeklyReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const marketParam = searchParams.get("market");
  const { currentMarket, getCurrencySymbol, getMarketLabel } = useMarket();
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

  // aiFeedback may arrive as either a parsed object OR a JSON string.
  // Normalise it so the rest of the page can safely access .summary etc.
  const ai = useMemo(() => {
    const raw = selected?.aiFeedback;
    if (!raw) return null;
    if (typeof raw === "object") return raw;
    // It's a string – try to parse it
    try {
      return JSON.parse(raw);
    } catch {
      // Unparseable – wrap the raw text into a minimal feedback shape
      return { week: "", summary: raw, mistakes: [], improvements: [], nextWeekChecklist: [] };
    }
  }, [selected]);
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
      // Match backend 409-friendly message
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

      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 24px", minHeight: 60, flexWrap: "wrap", gap: 10,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid #E2E8F0",
        boxShadow: "0 1px 12px rgba(15,25,35,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href={marketParam === "Indian_Market" ? "/indian-market/dashboard" : "/dashboard"} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}><img src="/logo.png" alt="Stratedge" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
            <div>
              <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 800, letterSpacing: "0.04em", color: "#0F1923", lineHeight: 1 }}>
                STRATEDGE
              </div>
              <div style={{ fontSize: 9, letterSpacing: "0.18em", color: "#0D9E6E", marginTop: 1, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>
                {marketParam === "Indian_Market" ? "OPTIONS JOURNAL · NSE" : "FOREX AI JOURNAL"}
              </div>
            </div>
          </Link>
        </div>

        <nav style={{ display: "flex", gap: 4 }}>
          {(marketParam === "Indian_Market" ? [
            { href: "/indian-market/trades", label: "Journal" },
            { href: "/indian-market/add-trade", label: "Log Option" },
            { href: "/indian-market/analytics", label: "Analytics" },
            { href: "/weekly-reports?market=Indian_Market", label: "Weekly AI" },
          ] : [
            { href: "/trades", label: "Journal" },
            { href: "/add-trade", label: "Log Trade" },
            { href: "/analytics", label: "Analytics" },
            { href: "/weekly-reports?market=Forex", label: "Weekly AI" },
          ]).map(n => (
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
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(214,59,59,0.1)", border: "1px solid rgba(214,59,59,0.3)",
              borderRadius: 6, padding: "6px 12px",
              cursor: "pointer", fontSize: 10, letterSpacing: "0.1em",
              color: "#D63B3B", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600,
              transition: "all 0.2s",
            }}
          >
            LOGOUT
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "18px", display: "grid", gridTemplateColumns: "320px 1fr", gap: 14 }}>
        {/* Left list */}
        <section style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 10px rgba(15,25,35,0.04)" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #E2E8F0" }}>
            <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.12em", fontWeight: 700 }}>
              HISTORY
            </div>
          </div>
          {!reports ? (
            <div style={{ padding: 18 }}>
              <LoadingSpinner message="LOADING REPORTS..." />
            </div>
          ) : reports.length === 0 ? (
            <div style={{ padding: 18, color: "#64748B", fontSize: 12 }}>
              No reports yet. Click <b>Generate AI Feedback</b>.
            </div>
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

        {/* Right details */}
        <section style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, boxShadow: "0 2px 10px rgba(15,25,35,0.04)" }}>
          {error && (
            <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: "rgba(214,59,59,0.10)", border: "1px solid rgba(214,59,59,0.25)", color: "#D63B3B", fontSize: 12 }}>
              {error}
            </div>
          )}
          {info && !error && (
            <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: "rgba(13,158,110,0.06)", border: "1px solid rgba(13,158,110,0.3)", color: "#0D9E6E", fontSize: 12 }}>
              {info}
            </div>
          )}

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

              {/* Metrics */}
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

              {/* AI feedback */}
              <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: 14, marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.12em", fontWeight: 800, marginBottom: 8 }}>
                  AI FEEDBACK
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: "#0F1923" }}>
                  {ai?.summary || "Generate a report to see AI feedback."}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.12em", fontWeight: 800, marginBottom: 8 }}>
                    TOP MISTAKES
                  </div>
                  {(ai?.mistakes || []).length === 0 ? (
                    <div style={{ color: "#64748B", fontSize: 12 }}>—</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {ai.mistakes.slice(0, 5).map((m, idx) => (
                        <div key={idx} style={{ padding: "10px 10px", borderRadius: 10, background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                          <div style={{ fontWeight: 900, fontSize: 12 }}>{m.title}</div>
                          <div style={{ marginTop: 6, fontSize: 11, color: "#4A5568" }}><b>Evidence:</b> {m.evidence}</div>
                          <div style={{ marginTop: 6, fontSize: 11, color: "#0F1923" }}><b>Fix:</b> {m.fix}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.12em", fontWeight: 800, marginBottom: 8 }}>
                    NEXT WEEK CHECKLIST
                  </div>
                  {(ai?.nextWeekChecklist || []).length === 0 ? (
                    <div style={{ color: "#64748B", fontSize: 12 }}>—</div>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
                      {ai.nextWeekChecklist.slice(0, 8).map((c, idx) => (
                        <li key={idx} style={{ fontSize: 12, color: "#0F1923", lineHeight: 1.5 }}>{c}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      <style>{`
        @media (max-width: 900px) {
          main { grid-template-columns: 1fr !important; }
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

