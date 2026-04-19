"use client";

import Link from "next/link";

/**
 * TradeCard — mobile card view for a single trade.
 */
export default function TradeCard({ trade, onDelete, idx }) {
  const bull = parseFloat(trade.profit) >= 0;
  const tradeDate = new Date(trade.tradeDate || trade.createdAt);
  return (
    <div style={{
      background: "#FFFFFF", border: "1px solid #E2E8F0",
      borderRadius: 8, padding: "16px", marginBottom: 10,
      borderLeft: `3px solid ${bull ? "#0D9E6E" : "#D63B3B"}`,
      animation: `fadeUp 0.4s ease ${idx * 0.06}s both`,
      boxShadow: "0 2px 8px rgba(15,25,35,0.05)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, color: "#0F1923", fontWeight: 700, marginBottom: 4 }}>
            {trade.pair}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#94A3B8", marginBottom: 6 }}>
            {tradeDate.toLocaleDateString()} · {tradeDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
          {(() => {
            const isLong = trade.type?.toUpperCase() === "BUY" || trade.type?.toUpperCase() === "LONG";
            return (
              <span style={{
                fontSize: 8, letterSpacing: "0.12em",
                color: isLong ? "#0D9E6E" : "#D63B3B",
                background: isLong ? "rgba(13,158,110,0.1)" : "rgba(214,59,59,0.1)",
                border: `1px solid ${isLong ? "rgba(13,158,110,0.3)" : "rgba(214,59,59,0.3)"}`,
                borderRadius: 20, padding: "2px 8px",
                fontFamily: "'JetBrains Mono',monospace",
              }}>
                {isLong ? "▲ LONG" : "▼ SHORT"}
              </span>
            );
          })()}
        </div>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 700, color: bull ? "#0D9E6E" : "#D63B3B" }}>
          {bull ? "+" : ""}{trade.profit}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94A3B8", marginBottom: 12, fontFamily: "'JetBrains Mono',monospace" }}>
        <span>BASIS: <span style={{ color: trade.entryBasis === "Plan" ? "#4A5568" : trade.entryBasis === "Emotion" ? "#D63B3B" : "#B8860B", fontWeight: 700 }}>
          {trade.entryBasis === "Custom" ? trade.entryBasisCustom : trade.entryBasis || "Plan"}
        </span></span>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <Link
          href={`/trades/view?id=${trade._id}`}
          style={{ flex: 1, textAlign: "center", fontSize: 9, letterSpacing: "0.1em", fontFamily: "'JetBrains Mono',monospace", color: "#0D9E6E", border: "1px solid rgba(13,158,110,0.3)", background: "rgba(13,158,110,0.05)", borderRadius: 4, padding: "8px", textDecoration: "none" }}
        >VIEW →</Link>
        <button
          onClick={() => onDelete(trade)}
          style={{ flex: 1, fontSize: 9, letterSpacing: "0.1em", fontFamily: "'JetBrains Mono',monospace", color: "#D63B3B", border: "1px solid rgba(214,59,59,0.3)", background: "rgba(214,59,59,0.05)", borderRadius: 4, padding: "8px", cursor: "pointer" }}
        >DELETE</button>
      </div>
    </div>
  );
}
