"use client";

const TICKERS = [
  { sym: "BTC",     val: "+2.34%", bull: true  },
  { sym: "ETH",     val: "-1.12%", bull: false },
  { sym: "AAPL",    val: "+0.87%", bull: true  },
  { sym: "TSLA",    val: "+4.20%", bull: true  },
  { sym: "NVDA",    val: "-0.55%", bull: false },
  { sym: "GOLD",    val: "+0.62%", bull: true  },
  { sym: "SPY",     val: "+0.31%", bull: true  },
  { sym: "OIL",     val: "-2.18%", bull: false },
  { sym: "AMZN",    val: "+1.05%", bull: true  },
  { sym: "USD/JPY", val: "-0.33%", bull: false },
];

/**
 * TickerTape
 * Dark scrolling bar with market ticker symbols.
 * Keyframe is self-contained so this works on every page without extra CSS.
 */
export default function TickerTape() {
  // Duplicate twice for seamless infinite loop
  const items = [...TICKERS, ...TICKERS];
  return (
    <>
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <div
        style={{
          overflow: "hidden", background: "#0F1923",
          borderBottom: "3px solid #0D9E6E",
          padding: "7px 0", whiteSpace: "nowrap",
          position: "relative", zIndex: 10,
        }}
      >
        <div style={{ display: "inline-flex", gap: "48px", animation: "ticker-scroll 32s linear infinite" }}>
          {items.map((t, i) => (
            <span key={i} style={{ fontSize: "11px", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.04em" }}>
              <span style={{ color: "#94A3B8", marginRight: 6 }}>{t.sym}</span>
              <span style={{ color: t.bull ? "#22C78E" : "#F87171" }}>
                {t.bull ? "▲" : "▼"} {t.val}
              </span>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
