"use client";

import { Skeleton } from "@/features/shared";

/**
 * StatCard (Dashboard)
 * Hero KPI card with accent bar, icon, large value, and equity in sub-text.
 */
export default function StatCard({ label, value, sub, accentColor, icon, delay = 0, loading = false }) {
  if (loading) {
    return (
      <div style={{
        background: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0",
        flex: "1 1 160px", overflow: "hidden",
        boxShadow: "0 2px 12px rgba(15,25,35,0.06), 0 1px 3px rgba(15,25,35,0.04)",
      }}>
        <div style={{ height: 3, background: `linear-gradient(90deg,${accentColor},${accentColor}22)` }} />
        <div style={{ padding: "20px 20px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <Skeleton width="60px" height="10px" />
            <Skeleton width="32px" height="32px" style={{ borderRadius: 8 }} />
          </div>
          <div style={{ marginBottom: 6 }}>
            <Skeleton width="90px" height="28px" />
          </div>
          <Skeleton width="70px" height="10px" />
        </div>
      </div>
    );
  }

  const displayValue = (value !== undefined && value !== null && !Number.isNaN(value)) ? value : (value || 0);
  return (
    <div style={{
      background: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0",
      flex: "1 1 160px", overflow: "hidden",
      boxShadow: "0 2px 12px rgba(15,25,35,0.06), 0 1px 3px rgba(15,25,35,0.04)",
      animation: `fadeUp 0.5s ease ${delay}s both`, position: "relative",
    }}>
      <div style={{ height: 3, background: `linear-gradient(90deg,${accentColor},${accentColor}22)` }} />
      <div style={{ padding: "20px 20px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <span style={{ fontSize: 10, color: "#94A3B8", letterSpacing: "0.12em", fontFamily: "'JetBrains Mono',monospace", fontWeight: 500 }}>{label}</span>
          {icon && (
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${accentColor}12`, display: "flex", alignItems: "center", justifyContent: "center", color: accentColor }}>
              {icon}
            </div>
          )}
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: accentColor, lineHeight: 1, marginBottom: 6 }}>
          {displayValue}
        </div>
        {sub && <div style={{ fontSize: 10, color: "#94A3B8", letterSpacing: "0.06em", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{sub}</div>}
      </div>
    </div>
  );
}
