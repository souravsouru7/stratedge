"use client";

import { Skeleton } from "@/features/shared";
import TradeRow  from "./TradeRow";
import TradeCard from "./TradeCard";

const TABLE_HEADERS = ["DATE", "PAIR", "TYPE", "BASIS", "P&L", "ACTIONS"];

/**
 * TradeTable
 * Renders the full trades list — desktop table + mobile card stack.
 * Features skeleton loading states for better UX.
 */
export default function TradeTable({ trades, loading, onDelete, deletingId }) {
  const skeletonCount = 5;

  return (
    <div 
      className="trade-table-container"
      style={{ 
        background: "#FFFFFF", 
        border: "1px solid #E2E8F0", 
        borderRadius: 14, 
        overflow: "hidden", 
        boxShadow: "0 2px 12px rgba(15,25,35,0.05)",
        position: "relative"
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: 3, background: "linear-gradient(90deg, #0D9E6E 0%, transparent 45%, transparent 55%, #D63B3B 100%)" }} />

      {loading ? (
        <div style={{ padding: "0" }}>
          {/* Desktop Skeletons */}
          <div className="hidden-mobile">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                  {TABLE_HEADERS.map((h, i) => (
                    <th key={h} style={{ padding: "14px 16px", textAlign: i === 5 ? "right" : "left" }}>
                      <Skeleton width="40px" height="10px" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(skeletonCount)].map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #F7FAFC" }}>
                    <td style={{ padding: "16px" }}><Skeleton width="70px" height="14px" /></td>
                    <td style={{ padding: "16px" }}><Skeleton width="80px" height="14px" /></td>
                    <td style={{ padding: "16px" }}><Skeleton width="40px" height="14px" /></td>
                    <td style={{ padding: "16px" }}><Skeleton width="60px" height="14px" /></td>
                    <td style={{ padding: "16px" }}><Skeleton width="50px" height="14px" /></td>
                    <td style={{ padding: "16px", textAlign: "right" }}><Skeleton width="30px" height="14px" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile Skeletons */}
          <div className="show-mobile" style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 12 }}>
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} width="100%" height="80px" style={{ borderRadius: 12 }} />
            ))}
          </div>
        </div>
      ) : trades.length === 0 ? null : (
        <>
          {/* Desktop table */}
          <div className="hidden-mobile" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #E2E8F0", background: "#F8F6F2" }}>
                  {TABLE_HEADERS.map((h, i) => (
                    <th key={h} style={{ padding: "14px 16px", fontSize: 10, letterSpacing: "0.14em", color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace", textAlign: i === 5 ? "right" : "left", fontWeight: 700 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trades.map((trade, idx) => (
                  <TradeRow key={trade._id} trade={trade} onDelete={onDelete} idx={idx} isDeleting={trade._id === deletingId} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="show-mobile" style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 12 }}>
            {trades.map((trade, idx) => (
              <TradeCard key={trade._id} trade={trade} onDelete={onDelete} idx={idx} isDeleting={trade._id === deletingId} />
            ))}
          </div>
        </>
      )}

      <style jsx>{`
        .trade-table-container {
          transition: all 0.3s ease;
        }
        @keyframes tradeExit {
          0%   { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(40px); }
        }
        @media (max-width: 640px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
        @media (min-width: 641px) {
          .show-mobile { display: none !important; }
          .hidden-mobile { display: block !important; }
        }
      `}</style>
    </div>
  );
}
