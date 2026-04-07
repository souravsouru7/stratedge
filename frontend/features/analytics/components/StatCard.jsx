"use client";

import { Skeleton } from "@/features/shared";

const colors = {
  bull: "#0D9E6E", bear: "#D63B3B", gold: "#B8860B",
  primary: "#0F1923", secondary: "#4A5568", muted: "#94A3B8",
  bg: "#F0EEE9", card: "#FFFFFF", border: "#E2E8F0",
};

/**
 * StatCard (Analytics)
 * Displays a single KPI metric with label, value, sub-text and optional icon.
 * Supports a layout-stable loading state via Skeleton components.
 */
export default function StatCard({ 
  label, 
  value, 
  sub, 
  color = colors.primary, 
  icon, 
  delay = 0,
  loading = false 
}) {
  if (loading) {
    return (
      <div style={{
        background: colors.card, borderRadius: 12, border: `1px solid ${colors.border}`,
        padding: "20px", boxShadow: "0 2px 8px rgba(15,25,35,0.04)",
        flex: "1 1 180px", minWidth: 160,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <Skeleton width="60px" height="10px" />
          <Skeleton width="28px" height="28px" style={{ borderRadius: 6 }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <Skeleton width="100px" height="28px" />
        </div>
        <Skeleton width="80px" height="10px" />
      </div>
    );
  }

  // Fix "$-41.28" → "-$41.28" display format
  const formattedValue = typeof value === "string" && value.startsWith("$-")
    ? "-$" + value.substring(2)
    : value;

  const cleanValue = typeof value === "string" ? value.replace(/[$,%]/g, "") : value;
  const isInfinite = cleanValue === "∞";

  return (
    <div style={{
      background: colors.card, borderRadius: 12, border: `1px solid ${colors.border}`,
      padding: "20px", boxShadow: "0 2px 12px rgba(15,25,35,0.06)",
      animation: `fadeUp 0.5s ease ${delay}s both`, flex: "1 1 180px", minWidth: 160,
      transition: "transform 0.2s, box-shadow 0.2s",
      cursor: "default"
    }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.boxShadow = "0 8px 16px rgba(15,25,35,0.08)";
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "0 2px 12px rgba(15,25,35,0.06)";
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <span style={{ fontSize: 10, color: colors.muted, letterSpacing: "0.12em", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>
          {label}
        </span>
        {icon && (
          <div style={{ width: 28, height: 28, borderRadius: 6, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center", color }}>
            {icon}
          </div>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color, lineHeight: 1.2, marginBottom: 6 }}>
        {formattedValue}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: label?.toLowerCase().includes("profit factor") && isInfinite ? colors.bull : colors.muted, letterSpacing: "0.06em", fontWeight: isInfinite ? 700 : 500 }}>
          {label?.toLowerCase().includes("profit factor") && isInfinite ? "Perfect Edge" : sub}
        </div>
      )}
    </div>
  );
}
