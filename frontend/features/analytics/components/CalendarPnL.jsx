"use client";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatMonth(date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function buildCalendar(byDate = {}, activeMonth = new Date()) {
  const firstDay    = new Date(activeMonth.getFullYear(), activeMonth.getMonth(), 1);
  const lastDay     = new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const cells = [];
  const monthEntries = [];

  for (let i = 0; i < startOffset; i++) cells.push({ type: "empty", key: `es-${i}` });

  for (let day = 1; day <= daysInMonth; day++) {
    const key   = `${activeMonth.getFullYear()}-${String(activeMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const entry = byDate?.[key] || null;
    if (entry) monthEntries.push(entry);
    cells.push({ type: "day", key, day, entry });
  }

  while (cells.length % 7 !== 0) cells.push({ type: "empty", key: `ee-${cells.length}` });

  const maxAbsProfit = monthEntries.length > 0
    ? Math.max(...monthEntries.map(e => Math.abs(Number(e.profit) || 0)), 1)
    : 1;
  const totalProfit = monthEntries.reduce((s, e) => s + (Number(e.profit) || 0), 0);
  const totalTrades = monthEntries.reduce((s, e) => s + (Number(e.total)  || 0), 0);

  return { cells, maxAbsProfit, totalProfit, totalTrades };
}

/**
 * CalendarPnL
 * Monthly P&L calendar heatmap with navigation arrows.
 */
export default function CalendarPnL({ byDate, activeMonth, onPrevMonth, onNextMonth, currency = "$" }) {
  const { cells, maxAbsProfit, totalProfit, totalTrades } = buildCalendar(byDate, activeMonth);
  const positive = totalProfit >= 0;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0F1923" }}>{formatMonth(activeMonth)}</div>
          <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace", marginTop: 4 }}>
            {positive ? "+" : "-"}{currency}{Math.abs(totalProfit).toFixed(2)} · {totalTrades} trades
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" onClick={onPrevMonth} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#0F1923", cursor: "pointer", fontSize: 16 }}>‹</button>
          <button type="button" onClick={onNextMonth} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#0F1923", cursor: "pointer", fontSize: 16 }}>›</button>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8 }}>
        {WEEK_DAYS.map(d => (
          <div key={d} style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#94A3B8", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", paddingBottom: 4 }}>{d}</div>
        ))}

        {cells.map(cell => {
          if (cell.type === "empty") {
            return <div key={cell.key} style={{ minHeight: 86, borderRadius: 12, background: "rgba(148,163,184,0.06)" }} />;
          }

          const profit    = Number(cell.entry?.profit || 0);
          const trades    = Number(cell.entry?.total  || 0);
          const intensity = cell.entry ? Math.max(0.12, Math.abs(profit) / maxAbsProfit) : 0;
          const bg        = !cell.entry ? "#FFFFFF"
            : profit >= 0
              ? `rgba(13, 158, 110, ${Math.min(0.82, intensity * 0.9)})`
              : `rgba(214, 59, 59, ${Math.min(0.82, intensity * 0.9)})`;
          const border    = !cell.entry
            ? "1px solid #E2E8F0"
            : `1px solid ${profit >= 0 ? "rgba(13,158,110,0.25)" : "rgba(214,59,59,0.25)"}`;
          const textColor  = cell.entry && intensity > 0.45 ? "#FFFFFF" : "#0F1923";
          const mutedColor = cell.entry && intensity > 0.45 ? "rgba(255,255,255,0.8)" : "#94A3B8";

          return (
            <div key={cell.key} style={{ minHeight: 86, borderRadius: 12, background: bg, border, padding: "10px 8px", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: cell.entry ? "0 8px 18px rgba(15,25,35,0.05)" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: textColor }}>{cell.day}</span>
                {trades > 0 && <span style={{ fontSize: 9, color: mutedColor, fontFamily: "'JetBrains Mono',monospace" }}>{trades}T</span>}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: textColor, fontFamily: "'JetBrains Mono',monospace" }}>
                  {cell.entry ? `${profit >= 0 ? "+" : "-"}${currency}${Math.abs(profit).toFixed(0)}` : "—"}
                </div>
                <div style={{ fontSize: 9, color: mutedColor, marginTop: 3 }}>
                  {cell.entry ? `${cell.entry.winRate}% WR` : "No trades"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
