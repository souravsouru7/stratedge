"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchSetups } from "@/services/setupApi";
import { logChecklistEvent } from "@/services/checklistApi";
import { useMarket } from "@/context/MarketContext";
import MarketSwitcher from "@/components/MarketSwitcher";
import { Skeleton } from "@/features/shared";

export default function PreTradeChecklistPage() {
  const router = useRouter();
  const { currentMarket, getMarketLabel } = useMarket();
  const [mounted, setMounted] = useState(false);
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [checked, setChecked] = useState({});
  const [setupSimilarity, setSetupSimilarity] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState("");

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) { router.push("/login"); return; }
    setMounted(true);

    const load = async () => {
      try {
        const data = await fetchSetups(currentMarket);
        if (Array.isArray(data) && data.length) {
          setStrategies(data);
          setSelectedIdx(0);
          setChecked({});
          setSetupSimilarity("");
        } else {
          setStrategies([]);
        }
      } catch (e) {
        setError(e.message || "Failed to load setups");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router, currentMarket]);

  const selected = strategies[selectedIdx] || null;
  const rules = useMemo(() => {
    if (!selected?.rules) return [];
    return selected.rules.filter(r => r.label && r.label.trim().length > 0);
  }, [selected]);

  const totalRules = rules.length;
  const checkedCount = rules.filter((_, i) => checked[i]).length;
  const score = totalRules > 0 ? Math.round((checkedCount / totalRules) * 100) : 0;

  const level = score >= 80 ? "high" : score >= 50 ? "moderate" : "low";
  const levelConfig = {
    high: { label: "A+ SETUP", sub: "All systems go — execute with confidence", color: "#0D9E6E", bg: "rgba(13,158,110,0.08)", border: "rgba(13,158,110,0.3)", icon: "✓" },
    moderate: { label: "MODERATE", sub: "Some rules not met — proceed with caution", color: "#B8860B", bg: "rgba(184,134,11,0.08)", border: "rgba(184,134,11,0.3)", icon: "◐" },
    low: { label: "LOW CONFIDENCE", sub: "Most rules not met — consider skipping this trade", color: "#D63B3B", bg: "rgba(214,59,59,0.08)", border: "rgba(214,59,59,0.3)", icon: "✕" },
  };
  const lc = levelConfig[level];

  const toggleRule = (idx) => {
    setChecked(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const clearAll = () => setChecked({});

  const handleSelectStrategy = (idx) => {
    setSelectedIdx(idx);
    setChecked({});
    setSetupSimilarity("");
    setPreviewImageUrl("");
  };

  const handleTakeTrade = async () => {
    if (!selected) return;
    
    setIsSubmitting(true);
    try {
      // Log to backend
      await logChecklistEvent({
        market: currentMarket,
        strategyName: selected.name,
        totalRules,
        followedRules: checkedCount,
        score,
        isAPlus: score >= 80,
        setupSimilarity,
      });
      
      // Show happy dialog
      setShowSuccessDialog(true);
      
      // Navigate after delay
      setTimeout(() => {
        router.push(currentMarket === "Indian_Market" ? "/indian-market/add-trade" : "/add-trade");
      }, 2000);
    } catch (err) {
      setError(err.message || "Failed to log checklist. You can still proceed.");
      // Even if tracking fails, let them trade
      router.push(currentMarket === "Indian_Market" ? "/indian-market/add-trade" : "/add-trade");
    } finally {
      setIsSubmitting(false);
    }
  };

  const dashHref = currentMarket === "Indian_Market" ? "/indian-market/dashboard" : "/dashboard";

  if (!mounted) return null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F0EEE9",
      fontFamily: "'Plus Jakarta Sans',sans-serif",
      color: "#0F1923",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        padding: "10px 24px", minHeight: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 10,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid #E2E8F0",
        boxShadow: "0 1px 12px rgba(15,25,35,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href={dashHref} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src="/mainlogo1.png" alt="Edgecipline" style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "left center" }} />
            </div>
            <div>
              <div style={{ display: "none" }}>EDGEDISCIPLINE</div>
              <div style={{ fontSize: 9, letterSpacing: "0.18em", color: "#0D9E6E", marginTop: 1, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>
                PRE-TRADE CHECKLIST
              </div>
            </div>
          </Link>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <MarketSwitcher />
          <Link
            href="/setups"
            style={{
              fontSize: 10, fontFamily: "'JetBrains Mono',monospace",
              letterSpacing: "0.08em", padding: "7px 12px",
              borderRadius: 8, border: "1px solid #E2E8F0",
              background: "#F8FAFC", color: "#4A5568",
              textDecoration: "none", fontWeight: 600,
            }}
          >
            MANAGE SETUPS
          </Link>
          <Link
            href={dashHref}
            style={{
              fontSize: 10, fontFamily: "'JetBrains Mono',monospace",
              letterSpacing: "0.08em", padding: "7px 12px",
              borderRadius: 8, border: "1px solid #E2E8F0",
              background: "#F8FAFC", color: "#4A5568",
              textDecoration: "none", fontWeight: 600,
            }}
          >
            DASHBOARD
          </Link>
        </div>
      </header>

      {/* MAIN */}
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "28px 16px 40px" }}>

        {/* Page title */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            Pre-Trade <span style={{ color: "#0D9E6E" }}>Checklist</span>
          </h1>
          <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 4, fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.06em" }}>
            TRADE WITH PLAN · NOT WITH EMOTION — {getMarketLabel()}
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: 14, padding: "8px 10px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FCA5A5", fontSize: 12, color: "#B91C1C" }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Strategy selector skeleton */}
            <div style={{ background: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0", padding: "14px 16px", boxShadow: "0 2px 10px rgba(15,25,35,0.04)" }}>
              <Skeleton width="160px" height="10px" style={{ marginBottom: 12 }} />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} width={`${70 + i * 20}px`} height="34px" style={{ borderRadius: 999 }} />
                ))}
              </div>
            </div>
            {/* Rules checklist skeleton */}
            <div style={{ background: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden", boxShadow: "0 2px 10px rgba(15,25,35,0.04)" }}>
              <div style={{ height: 4, background: "#EDF2F7" }} />
              <div style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <Skeleton width="140px" height="16px" style={{ marginBottom: 6 }} />
                    <Skeleton width="100px" height="10px" />
                  </div>
                  <Skeleton width="70px" height="28px" style={{ borderRadius: 999 }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} width="100%" height="48px" style={{ borderRadius: 12 }} />
                  ))}
                </div>
              </div>
            </div>
            {/* Confidence meter skeleton */}
            <div style={{ background: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0", padding: "18px 18px", boxShadow: "0 2px 10px rgba(15,25,35,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Skeleton width="120px" height="10px" />
                <Skeleton width="50px" height="24px" />
              </div>
              <Skeleton width="100%" height="12px" style={{ borderRadius: 12, marginBottom: 12 }} />
              <Skeleton width="100%" height="60px" style={{ borderRadius: 10 }} />
            </div>
          </div>
        ) : strategies.length === 0 ? (
          <div style={{
            background: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0",
            padding: "40px 20px", textAlign: "center",
            boxShadow: "0 2px 10px rgba(15,25,35,0.04)",
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>No Strategies Found</div>
            <div style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>
              Create your strategies and rules first, then come back here before each trade.
            </div>
            <Link
              href="/setups"
              style={{
                display: "inline-block",
                fontSize: 11, fontFamily: "'JetBrains Mono',monospace",
                letterSpacing: "0.08em", padding: "10px 18px",
                borderRadius: 8, border: "none",
                background: "linear-gradient(135deg,#0D9E6E,#22C78E)",
                color: "#FFFFFF", textDecoration: "none", fontWeight: 700,
              }}
            >
              CREATE SETUPS →
            </Link>
          </div>
        ) : (
          <>
            {/* Strategy Selector */}
            <div style={{
              background: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0",
              padding: "14px 16px", marginBottom: 14,
              boxShadow: "0 2px 10px rgba(15,25,35,0.04)",
            }}>
              <div style={{ fontSize: 9, letterSpacing: "0.14em", color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, marginBottom: 8 }}>
                SELECT YOUR STRATEGY
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {strategies.map((s, idx) => {
                  const active = idx === selectedIdx;
                  return (
                    <button
                      key={s._id || idx}
                      onClick={() => handleSelectStrategy(idx)}
                      style={{
                        fontSize: 12, fontWeight: active ? 800 : 600,
                        fontFamily: "'Plus Jakarta Sans',sans-serif",
                        padding: "10px 16px", minHeight: 42, borderRadius: 999,
                        border: active ? "2px solid #0D9E6E" : "1px solid #E2E8F0",
                        background: active ? "rgba(13,158,110,0.08)" : "#F8FAFC",
                        color: active ? "#0D9E6E" : "#4A5568",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      {s.name || "Unnamed"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rules Checklist */}
            {selected && (
              <div style={{
                background: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0",
                overflow: "hidden", marginBottom: 14,
                boxShadow: "0 2px 10px rgba(15,25,35,0.04)",
              }}>
                {/* Top accent bar */}
                <div style={{ height: 4, background: `linear-gradient(90deg, ${lc.color}, ${lc.color}44)` }} />

                <div style={{ padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800 }}>{selected.name}</div>
                      <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.08em", marginTop: 2 }}>
                        {totalRules} RULE{totalRules === 1 ? "" : "S"} · {checkedCount} CHECKED
                      </div>
                    </div>
                    <button
                      onClick={clearAll}
                      style={{
                        fontSize: 9, fontFamily: "'JetBrains Mono',monospace",
                        letterSpacing: "0.08em", padding: "5px 10px",
                        borderRadius: 999, border: "1px solid #E2E8F0",
                        background: "#F8FAFC", color: "#64748B",
                        cursor: "pointer",
                      }}
                    >
                      RESET ALL
                    </button>
                  </div>

                  {Array.isArray(selected.referenceImages) && selected.referenceImages.length > 0 && (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "1fr",
                      gap: 14,
                      padding: "12px",
                      marginBottom: 14,
                      borderRadius: 12,
                      border: "1px solid #E2E8F0",
                      background: "#F8FAFC",
                      alignItems: "center",
                    }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", maxWidth: "100%" }}>
                        {selected.referenceImages.slice(0, 5).map((image, idx) => (
                          <img
                            key={`${selected._id || selected.name}-${idx}`}
                            src={image.url}
                            alt={`${selected.name} reference ${idx + 1}`}
                            onClick={() => setPreviewImageUrl(image.url)}
                            style={{
                              width: "clamp(110px, 28vw, 160px)",
                              height: "auto",
                              aspectRatio: "16/10",
                              objectFit: "cover",
                              borderRadius: 10,
                              border: "1px solid #E2E8F0",
                              cursor: "zoom-in",
                              flexShrink: 0,
                            }}
                          />
                        ))}
                      </div>
                      <div>
                        <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace", marginBottom: 6 }}>
                          SETUP REFERENCES
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                          Compare the live chart with your saved ideal setup examples
                        </div>
                        <div style={{ fontSize: 12, color: "#64748B" }}>
                          Use these screenshots as your visual benchmark before you commit to the trade.
                        </div>
                      </div>
                      <div style={{
                        padding: "12px",
                        borderRadius: 12,
                        border: "1px solid #E2E8F0",
                        background: "#FFFFFF",
                      }}>
                        <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace", marginBottom: 8 }}>
                          VISUAL MATCH CHECK
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                          Is the current chart setup similar to these reference images?
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {[
                            { value: "yes", label: "YES", color: "#0D9E6E", bg: "rgba(13,158,110,0.08)", border: "rgba(13,158,110,0.35)" },
                            { value: "partly", label: "PARTLY", color: "#B8860B", bg: "rgba(184,134,11,0.08)", border: "rgba(184,134,11,0.35)" },
                            { value: "no", label: "NO", color: "#D63B3B", bg: "rgba(214,59,59,0.08)", border: "rgba(214,59,59,0.35)" },
                          ].map((option) => {
                            const active = setupSimilarity === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setSetupSimilarity(option.value)}
                                style={{
                                  padding: "10px 18px",
                                  minHeight: 42,
                                  borderRadius: 999,
                                  border: active ? `2px solid ${option.color}` : `1px solid ${option.border}`,
                                  background: active ? option.bg : "#F8FAFC",
                                  color: option.color,
                                  cursor: "pointer",
                                  fontSize: 11,
                                  fontWeight: 800,
                                  fontFamily: "'JetBrains Mono',monospace",
                                  letterSpacing: "0.04em",
                                  flex: 1,
                                }}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {rules.length === 0 ? (
                    <div style={{ fontSize: 12, color: "#94A3B8", padding: "20px 0", textAlign: "center" }}>
                      No rules defined for this strategy. <Link href="/setups" style={{ color: "#0D9E6E", fontWeight: 700 }}>Add rules →</Link>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {rules.map((rule, idx) => {
                        const isChecked = !!checked[idx];
                        return (
                          <button
                            key={idx}
                            onClick={() => toggleRule(idx)}
                            style={{
                              display: "flex", alignItems: "center", gap: 12,
                              padding: "12px 14px", borderRadius: 12,
                              border: isChecked ? "1.5px solid rgba(13,158,110,0.4)" : "1px solid #E2E8F0",
                              background: isChecked ? "rgba(13,158,110,0.04)" : "#FAFAFA",
                              cursor: "pointer", textAlign: "left",
                              transition: "all 0.2s",
                              width: "100%",
                            }}
                          >
                            {/* Checkbox */}
                            <div style={{
                              width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                              border: isChecked ? "2px solid #0D9E6E" : "2px solid #CBD5E1",
                              background: isChecked ? "linear-gradient(135deg,#0D9E6E,#22C78E)" : "#FFFFFF",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "all 0.2s",
                              boxShadow: isChecked ? "0 2px 8px rgba(13,158,110,0.3)" : "none",
                            }}>
                              {isChecked && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </div>

                            {/* Rule text */}
                            <span style={{
                              fontSize: 13, fontWeight: 600,
                              color: isChecked ? "#0D9E6E" : "#0F1923",
                              textDecoration: isChecked ? "line-through" : "none",
                              opacity: isChecked ? 0.7 : 1,
                              transition: "all 0.2s",
                              fontFamily: "'Plus Jakarta Sans',sans-serif",
                            }}>
                              {rule.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Confidence Meter */}
            {totalRules > 0 && (
              <div style={{
                background: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0",
                overflow: "hidden", marginBottom: 14,
                boxShadow: "0 2px 10px rgba(15,25,35,0.04)",
              }}>
                <div style={{ padding: "18px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 9, letterSpacing: "0.14em", color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>
                      SETUP CONFIDENCE
                    </div>
                    <div style={{
                      fontSize: 24, fontWeight: 900,
                      fontFamily: "'JetBrains Mono',monospace",
                      color: lc.color,
                    }}>
                      {score}%
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{
                    height: 12, background: "#F0EEE9", borderRadius: 12,
                    overflow: "hidden", position: "relative", marginBottom: 12,
                  }}>
                    <div style={{
                      height: "100%", borderRadius: 12,
                      width: `${score}%`,
                      background: `linear-gradient(90deg, ${lc.color}, ${lc.color}99)`,
                      boxShadow: `0 0 12px ${lc.color}44`,
                      transition: "width 0.4s cubic-bezier(0.22,1,0.36,1)",
                    }} />
                  </div>

                  {/* Level badge */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "12px 14px", borderRadius: 10,
                    background: lc.bg, border: `1px solid ${lc.border}`,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `${lc.color}18`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, fontWeight: 900, color: lc.color,
                    }}>
                      {lc.icon}
                    </div>
                    <div>
                      <div style={{
                        fontSize: 13, fontWeight: 800, color: lc.color,
                        fontFamily: "'JetBrains Mono',monospace",
                        letterSpacing: "0.06em",
                      }}>
                        {lc.label}
                      </div>
                      <div style={{ fontSize: 11, color: "#4A5568", marginTop: 2 }}>
                        {lc.sub}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Go / No-Go Decision */}
            {totalRules > 0 && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {score >= 80 ? (
                  <button
                    onClick={handleTakeTrade}
                    disabled={isSubmitting}
                    style={{
                      flex: 1, minWidth: 180, padding: "15px 18px", minHeight: 52, borderRadius: 12, border: "none", cursor: isSubmitting ? "not-allowed" : "pointer",
                      background: "linear-gradient(135deg, #0D9E6E, #22C78E)",
                      color: "#FFFFFF",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                      fontSize: 13, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace",
                      letterSpacing: "0.06em",
                      boxShadow: "0 4px 20px rgba(13,158,110,0.35)",
                      transition: "all 0.2s",
                      opacity: isSubmitting ? 0.7 : 1,
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {isSubmitting ? "LOGGING..." : "TAKE TRADE →"}
                  </button>
                ) : (
                  <div style={{
                    flex: 1, minWidth: 180, padding: "15px 18px", minHeight: 52, borderRadius: 12,
                    background: score >= 50 ? "rgba(184,134,11,0.08)" : "rgba(214,59,59,0.06)",
                    border: `1px solid ${score >= 50 ? "rgba(184,134,11,0.3)" : "rgba(214,59,59,0.25)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    fontSize: 12, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace",
                    letterSpacing: "0.04em",
                    color: score >= 50 ? "#B8860B" : "#D63B3B",
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    {score >= 50 ? "REVIEW RULES" : "SKIP TRADE"}
                  </div>
                )}

                <button
                  onClick={clearAll}
                  style={{
                    padding: "15px 16px", minHeight: 52, borderRadius: 12,
                    background: "#FFFFFF", border: "1px solid #E2E8F0",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace",
                    letterSpacing: "0.06em", color: "#64748B",
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                  RESET
                </button>
              </div>
            )}
          </>
        )}
        
        {/* Success Modal */}
        {showSuccessDialog && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 999,
            background: "rgba(15,25,35,0.4)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeIn 0.2s ease",
          }}>
            <div style={{
              background: "#FFFFFF", padding: "40px", borderRadius: 24, textAlign: "center",
              boxShadow: "0 20px 40px rgba(15,25,35,0.1)",
              transform: "scale(1)", animation: "popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
              maxWidth: 400, width: "90%",
            }}>
              <div style={{
                width: 80, height: 80, borderRadius: 40, background: "rgba(13,158,110,0.1)",
                color: "#0D9E6E", display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px",
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0F1923", marginBottom: 8 }}>Incredible Discipline!</h2>
              <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.5, marginBottom: 24 }}>
                You've identified an <strong>A+ Setup</strong>. Trading your plan is the ultimate edge.
              </p>
              <div style={{ display: "inline-block", background: "#F8FAFC", padding: "8px 16px", borderRadius: 999 }}>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "#0D9E6E", letterSpacing: "0.05em" }}>
                  Tracking saved. Redirecting to journal...
                </span>
              </div>
            </div>
          </div>
        )}

        {previewImageUrl && (
          <div
            onClick={() => setPreviewImageUrl("")}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              background: "rgba(15,25,35,0.72)",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "relative",
                maxWidth: "min(1100px, 96vw)",
                maxHeight: "90vh",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <button
                type="button"
                onClick={() => setPreviewImageUrl("")}
                style={{
                  alignSelf: "flex-end",
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.25)",
                  background: "rgba(255,255,255,0.08)",
                  color: "#FFFFFF",
                  cursor: "pointer",
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                x
              </button>
              <img
                src={previewImageUrl}
                alt="Setup reference preview"
                style={{
                  width: "100%",
                  maxHeight: "calc(90vh - 56px)",
                  objectFit: "contain",
                  borderRadius: 18,
                  background: "#FFFFFF",
                  border: "1px solid rgba(255,255,255,0.2)",
                  boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
                }}
              />
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.9) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
