"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchSetups, saveSetups, uploadSetupReferenceImage } from "@/services/setupApi";
import { useMarket } from "@/context/MarketContext";
import { Skeleton } from "@/features/shared";

export default function SetupStrategiesPage() {
  const router = useRouter();
  const { currentMarket, getMarketLabel } = useMarket();
  const [mounted, setMounted] = useState(false);
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.push("/login");
      return;
    }
    setMounted(true);

    const load = async () => {
      try {
        const serverStrategies = await fetchSetups(currentMarket);
        if (Array.isArray(serverStrategies) && serverStrategies.length) {
          const mapped = serverStrategies.map((s, sIdx) => ({
            id: sIdx + 1,
            name: s.name || "",
            rules: Array.isArray(s.rules)
                ? s.rules.map((r, rIdx) => ({
                    id: rIdx + 1,
                    label: r.label || "",
                  }))
                : [],
            referenceImages: Array.isArray(s.referenceImages) ? s.referenceImages.slice(0, 5) : [],
          }));
          setStrategies(mapped);
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

  const addStrategy = () => {
    setError("");
    setStrategies(prev => {
      const nextId = (prev[prev.length - 1]?.id || 0) + 1;
      return [
        ...prev,
        {
          id: nextId,
          name: "",
          rules: [],
          referenceImages: [],
        },
      ];
    });
  };

  const updateStrategyName = (id, name) => {
    setStrategies(prev =>
      prev.map(s => (s.id === id ? { ...s, name } : s))
    );
  };

  const addRuleToStrategy = (strategyId) => {
    setStrategies(prev =>
      prev.map(s => {
        if (s.id !== strategyId) return s;
        const nextRuleId = (s.rules[s.rules.length - 1]?.id || 0) + 1;
        return {
          ...s,
          rules: [
            ...s.rules,
            { id: nextRuleId, label: "" },
          ],
        };
      })
    );
  };

  const updateRuleLabel = (strategyId, ruleId, label) => {
    setStrategies(prev =>
      prev.map(s => {
        if (s.id !== strategyId) return s;
        return {
          ...s,
          rules: s.rules.map(r =>
            r.id === ruleId ? { ...r, label } : r
          ),
        };
      })
    );
  };

  const deleteStrategy = (strategyId) => {
    setStrategies(prev => prev.filter(s => s.id !== strategyId));
  };

  const deleteRule = (strategyId, ruleId) => {
    setStrategies(prev =>
      prev.map(s => {
        if (s.id !== strategyId) return s;
        return {
          ...s,
          rules: s.rules.filter(r => r.id !== ruleId),
        };
      })
    );
  };

  const handleReferenceImageChange = async (strategyId, file) => {
    if (!file) return;

    try {
      setSaving(true);
      setError("");
      const uploaded = await uploadSetupReferenceImage(file);
      setStrategies(prev =>
        prev.map(s =>
          s.id === strategyId
            ? {
                ...s,
                referenceImages: [
                  ...(Array.isArray(s.referenceImages) ? s.referenceImages : []),
                  { url: uploaded.imageUrl || "", publicId: uploaded.publicId || "" },
                ].filter((image) => image.url).slice(0, 5),
              }
            : s
        )
      );
    } catch (e) {
      setError(e.message || "Failed to upload setup image");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      const payload = strategies.map(s => ({
        name: s.name,
        referenceImages: Array.isArray(s.referenceImages) ? s.referenceImages.slice(0, 5) : [],
        rules: (s.rules || []).map(r => ({ label: r.label })),
      }));
      await saveSetups(payload, currentMarket);
      setSavedAt(new Date());
    } catch (e) {
      setError(e.message || "Failed to save setups");
    } finally {
      setSaving(false);
    }
  };

  const removeReferenceImage = (strategyId, imageIdx) => {
    setStrategies(prev =>
      prev.map(s =>
        s.id === strategyId
          ? {
              ...s,
              referenceImages: (s.referenceImages || []).filter((_, idx) => idx !== imageIdx),
            }
          : s
      )
    );
  };

  if (!mounted) return null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F0EEE9",
      fontFamily: "'Plus Jakarta Sans',sans-serif",
      color: "#0F1923",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <header style={{
        padding: "12px 16px",
        borderBottom: "1px solid #E2E8F0",
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: "999px",
              border: "1px solid #E2E8F0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#FFFFFF",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0F1923" strokeWidth="2.2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "0.02em" }}>Setup / Strategies</div>
            <div className="setups-header-sub" style={{ fontSize: 10, color: "#64748B", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.06em", marginTop: 2 }}>
              DEFINE STRATEGIES · MANAGE RULES
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div className="setups-market-label" style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "#64748B" }}>
            {getMarketLabel()}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              fontSize: 11,
              fontFamily: "'JetBrains Mono',monospace",
              letterSpacing: "0.06em",
              padding: "9px 14px",
              minHeight: 38,
              borderRadius: 999,
              border: "1px solid #0D9E6E55",
              background: saving ? "#E2E8F0" : "linear-gradient(135deg,#0D9E6E,#22C78E)",
              color: saving ? "#64748B" : "#FFFFFF",
              cursor: saving ? "default" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {saving ? "SAVING..." : "SAVE SETUPS"}
          </button>
          <Link
            href="/dashboard"
            style={{
              fontSize: 11,
              fontFamily: "'JetBrains Mono',monospace",
              letterSpacing: "0.06em",
              padding: "9px 12px",
              minHeight: 38,
              borderRadius: 999,
              border: "1px solid #E2E8F0",
              background: "#F8FAFC",
              color: "#4A5568",
              textDecoration: "none",
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            DASHBOARD
          </Link>
        </div>
      </header>

      <style>{`
        @media (max-width: 480px) {
          .setups-header-sub  { display: none !important; }
          .setups-market-label { display: none !important; }
        }
      `}</style>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "22px 16px 30px" }}>
        {error && (
          <div style={{ marginBottom: 12, padding: "8px 10px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FCA5A5", fontSize: 12, color: "#B91C1C" }}>
            {error}
          </div>
        )}
        {savedAt && !error && (
          <div style={{ marginBottom: 12, padding: "6px 10px", borderRadius: 8, background: "#ECFDF5", border: "1px solid #A7F3D0", fontSize: 11, color: "#047857" }}>
            Saved setups at {savedAt.toLocaleTimeString()}
          </div>
        )}
        {loading ? (
          <div style={{ background: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0", padding: "18px 20px 14px", boxShadow: "0 2px 10px rgba(15,25,35,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <Skeleton width="120px" height="12px" />
              <Skeleton width="100px" height="30px" style={{ borderRadius: 999 }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{ borderRadius: 12, border: "1px solid #E2E8F0", padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <Skeleton width="160px" height="14px" />
                    <Skeleton width="40px" height="10px" />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[...Array(3)].map((_, j) => (
                      <Skeleton key={j} width="100%" height="34px" style={{ borderRadius: 8 }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
        <div style={{
          background: "#FFFFFF",
          borderRadius: 14,
          border: "1px solid #E2E8F0",
          padding: "18px 20px 14px",
          boxShadow: "0 2px 10px rgba(15,25,35,0.04)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10, gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>
                YOUR STRATEGIES
              </div>
              <div style={{ fontSize: 11, color: "#64748B", fontFamily: "'Plus Jakarta Sans',sans-serif", marginTop: 4 }}>
                Create each strategy once, then add the exact rules you want to follow for that setup.
              </div>
            </div>
            <button
              type="button"
              onClick={addStrategy}
              style={{
                fontSize: 10,
                fontFamily: "'JetBrains Mono',monospace",
                letterSpacing: "0.08em",
                padding: "7px 11px",
                borderRadius: 999,
                border: "1px solid #0D9E6E33",
                background: "rgba(13,158,110,0.04)",
                color: "#0D9E6E",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              + ADD STRATEGY
            </button>
          </div>

          {strategies.length === 0 && (
            <div style={{
              padding: "32px 0",
              textAlign: "center",
              color: "#94A3B8",
              fontSize: 12,
              fontFamily: "'JetBrains Mono',monospace",
            }}>
              No strategies yet — click <span style={{ color: "#0D9E6E", fontWeight: 700 }}>+ ADD STRATEGY</span> to get started.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {strategies.map(strategy => (
              <div
                key={strategy.id}
                style={{
                  borderRadius: 12,
                  border: "1px solid #E2E8F0",
                  padding: "10px 12px 10px",
                  background: "linear-gradient(135deg,rgba(248,250,252,0.9),#FFFFFF)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 9, letterSpacing: "0.12em", color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace" }}>
                      STRATEGY NAME
                    </label>
                    <input
                      type="text"
                      value={strategy.name}
                      onChange={e => updateStrategyName(strategy.id, e.target.value)}
                      placeholder="e.g. London Breakout, NY Reversal..."
                      style={{
                        borderRadius: 8,
                        border: "1px solid #E2E8F0",
                        padding: "7px 10px",
                        fontSize: 12,
                        fontFamily: "'Plus Jakarta Sans',sans-serif",
                        outline: "none",
                        width: "100%",
                      }}
                    />
                  </div>
                  <div style={{ textAlign: "right", minWidth: 70 }}>
                    <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace" }}>
                      {strategy.rules.filter(r => r.label && r.label.trim().length > 0).length} rule{strategy.rules.filter(r => r.label && r.label.trim().length > 0).length === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, letterSpacing: "0.12em", color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace", marginBottom: 6 }}>
                    REFERENCE SCREENSHOT
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <label
                      style={{
                        fontSize: 10,
                        fontFamily: "'JetBrains Mono',monospace",
                        letterSpacing: "0.08em",
                        padding: "7px 11px",
                        borderRadius: 999,
                        border: "1px solid #0D9E6E33",
                        background: "rgba(13,158,110,0.04)",
                        color: "#0D9E6E",
                        cursor: "pointer",
                      }}
                    >
                      {(strategy.referenceImages?.length || 0) >= 5 ? "MAX 5 IMAGES" : "+ ADD IMAGE"}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        disabled={(strategy.referenceImages?.length || 0) >= 5}
                        onChange={e => handleReferenceImageChange(strategy.id, e.target.files?.[0])}
                      />
                    </label>
                    {(strategy.referenceImages?.length || 0) > 0 ? (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", maxWidth: "100%" }}>
                        {strategy.referenceImages.map((image, imageIdx) => (
                          <div key={`${strategy.id}-${imageIdx}`} style={{ position: "relative", flexShrink: 0 }}>
                            <img
                              src={image.url}
                              alt={`${strategy.name || "Setup"} reference ${imageIdx + 1}`}
                              style={{
                                width: 110,
                                height: 66,
                                objectFit: "cover",
                                borderRadius: 10,
                                border: "1px solid #E2E8F0",
                                display: "block",
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => removeReferenceImage(strategy.id, imageIdx)}
                              style={{
                                position: "absolute",
                                top: 6,
                                right: 6,
                                width: 22,
                                height: 22,
                                borderRadius: 999,
                                border: "1px solid rgba(255,255,255,0.7)",
                                background: "rgba(15,25,35,0.7)",
                                color: "#FFFFFF",
                                cursor: "pointer",
                                fontSize: 11,
                              }}
                            >
                              x
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: "#64748B" }}>
                        Add up to 5 ideal setup screenshots so you can compare them before entering next time.
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => addRuleToStrategy(strategy.id)}
                    style={{
                      fontSize: 9,
                      fontFamily: "'JetBrains Mono',monospace",
                      letterSpacing: "0.08em",
                      padding: "5px 9px",
                      borderRadius: 999,
                      border: "1px solid #0D9E6E33",
                      background: "rgba(13,158,110,0.04)",
                      color: "#0D9E6E",
                      cursor: "pointer",
                    }}
                  >
                    + ADD RULE
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteStrategy(strategy.id)}
                    style={{
                      fontSize: 9,
                      fontFamily: "'JetBrains Mono',monospace",
                      letterSpacing: "0.08em",
                      padding: "5px 9px",
                      borderRadius: 999,
                      border: "1px solid #FCA5A5",
                      background: "#FEF2F2",
                      color: "#B91C1C",
                      cursor: "pointer",
                    }}
                  >
                    DELETE SETUP
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {strategy.rules.map(rule => (
                    <div
                      key={rule.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "5px 8px",
                        borderRadius: 9,
                        border: "1px solid #E2E8F0",
                      }}
                    >
                      {/* Rule number badge */}
                      <div style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        background: "#F1F5F9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 9,
                        fontFamily: "'JetBrains Mono',monospace",
                        fontWeight: 700,
                        color: "#64748B",
                        flexShrink: 0,
                      }}>
                        {strategy.rules.indexOf(rule) + 1}
                      </div>
                      <input
                        type="text"
                        value={rule.label}
                        onChange={e => updateRuleLabel(strategy.id, rule.id, e.target.value)}
                        placeholder="Add rule for this strategy..."
                        style={{
                          flex: 1,
                          border: "none",
                          outline: "none",
                          background: "transparent",
                          fontSize: 12,
                          fontFamily: "'Plus Jakarta Sans',sans-serif",
                          color: "#0F1923",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => deleteRule(strategy.id, rule.id)}
                        style={{
                          fontSize: 9,
                          fontFamily: "'JetBrains Mono',monospace",
                          padding: "3px 6px",
                          borderRadius: 999,
                          border: "1px solid #FCA5A5",
                          background: "#FEF2F2",
                          color: "#B91C1C",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {strategy.rules.length === 0 && (
                    <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "'Plus Jakarta Sans',sans-serif", marginTop: 4 }}>
                      No rules yet — add your first rule for this strategy.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        )}
      </main>
    </div>
  );
}
