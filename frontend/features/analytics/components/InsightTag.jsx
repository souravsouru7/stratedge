"use client";

const TYPE_COLORS = {
  info:    { bg: "#EFF6FF", border: "#93C5FD", text: "#1D4ED8" },
  success: { bg: "#ECFDF5", border: "#6EE7B7", text: "#059669" },
  warning: { bg: "#FEF3C7", border: "#FCD34D", text: "#D97706" },
  danger:  { bg: "#FEE2E2", border: "#FCA5A5", text: "#DC2626" },
};

/**
 * InsightTag
 * A coloured callout bubble for AI-generated insights.
 * @param {string} text - Insight text to display
 * @param {"info"|"success"|"warning"|"danger"} type - Colour theme
 */
export default function InsightTag({ text, type = "info" }) {
  const c = TYPE_COLORS[type] || TYPE_COLORS.info;
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.text, marginTop: 5, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: c.text, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}
