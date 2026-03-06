"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTrades, deleteTrade } from "@/services/tradeApi";
import Link from "next/link";
import MarketSwitcher from "@/components/MarketSwitcher";
import { useMarket, MARKETS } from "@/context/MarketContext";

/* ─────────────────────────────────────────
   DESIGN TOKENS — Indian Market Theme (Green/Gold)
───────────────────────────────────────── */
const theme = {
    bull: "#2E7D32",
    bear: "#C62828",
    gold: "#FFD700",
    primary: "#1B5E20",
    secondary: "#388E3C",
    muted: "#757575",
    border: "#E0E0E0",
    bg: "#F5F5DC",
    card: "#FFFFFF"
};

function TickerTape() {
    return (
        <div style={{
            overflow: "hidden", background: "#1B5E20",
            borderBottom: `3px solid ${theme.gold}`,
            padding: "7px 0", whiteSpace: "nowrap", position: "relative", zIndex: 10,
        }}>
            <div style={{ display: "inline-flex", gap: "48px", animation: "ticker 32s linear infinite" }}>
                {[
                    { sym: "NIFTY 50", val: "+1.24%", bull: true }, { sym: "BANK NIFTY", val: "-0.45%", bull: false },
                    { sym: "RELIANCE", val: "+2.15%", bull: true }, { sym: "TCS", val: "+0.87%", bull: true }
                ].concat([
                    { sym: "NIFTY 50", val: "+1.24%", bull: true }, { sym: "BANK NIFTY", val: "-0.45%", bull: false },
                    { sym: "RELIANCE", val: "+2.15%", bull: true }, { sym: "TCS", val: "+0.87%", bull: true }
                ]).map((t, i) => (
                    <span key={i} style={{ fontSize: "11px", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.04em" }}>
                        <span style={{ color: "#E8F5E9", marginRight: 6 }}>{t.sym}</span>
                        <span style={{ color: t.bull ? "#A5D6A7" : "#EF9A9A" }}>
                            {t.bull ? "▲" : "▼"} {t.val}
                        </span>
                    </span>
                ))}
            </div>
        </div>
    );
}

function TradeRow({ trade, onDelete, idx }) {
    const profitNum = parseFloat(trade.profit) || 0;
    const bull = profitNum >= 0;
    return (
        <tr style={{
            borderBottom: `1px solid ${theme.border}`,
            animation: `fadeUp 0.4s ease ${idx * 0.05}s both`,
            transition: "background 0.2s",
        }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(46,125,50,0.05)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
            <td style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: bull ? theme.bull : theme.bear }} />
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: theme.primary, fontWeight: 600 }}>
                        {trade.pair}
                    </span>
                </div>
            </td>
            <td style={{ padding: "14px 16px" }}>
                <span style={{
                    fontSize: 9, letterSpacing: "0.12em",
                    color: trade.type?.toUpperCase() === "LONG" ? theme.bull : theme.bear,
                    background: trade.type?.toUpperCase() === "LONG" ? "rgba(46,125,50,0.1)" : "rgba(198,40,40,0.1)",
                    borderRadius: 20, padding: "3px 10px",
                    fontFamily: "'JetBrains Mono',monospace",
                }}>
                    {trade.type?.toUpperCase() === "LONG" ? "▲ LONG" : "▼ SHORT"}
                </span>
            </td>
            <td style={{ padding: "14px 16px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: theme.primary }}>{trade.segment || 'N/A'}</div>
                <div style={{ fontSize: 9, color: theme.muted, letterSpacing: '0.05em' }}>{trade.instrumentType || 'SPOT'}</div>
            </td>
            <td style={{ padding: "14px 16px" }}>
                <span style={{
                    fontSize: 9, letterSpacing: "0.08em",
                    color: trade.entryBasis === "Plan" ? theme.primary : trade.entryBasis === "Emotion" ? theme.bear : "#B8860B",
                    fontFamily: "'JetBrains Mono',monospace",
                    fontWeight: 600,
                    textTransform: "uppercase",
                }}>
                    {trade.entryBasis === "Custom" ? trade.entryBasisCustom : trade.entryBasis || "Plan"}
                </span>
            </td>
            <td style={{ padding: "14px 16px" }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: bull ? theme.bull : theme.bear }}>
                    {bull ? "+" : ""}₹{Math.abs(profitNum).toLocaleString('en-IN')}
                </span>
            </td>
            <td style={{ padding: "14px 16px", textAlign: "right" }}>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <Link href={`/trades/${trade._id}`} style={{
                        fontSize: 9, letterSpacing: "0.1em", fontFamily: "'JetBrains Mono',monospace",
                        color: theme.bull, border: `1px solid ${theme.bull}55`,
                        background: `${theme.bull}11`, borderRadius: 4,
                        padding: "5px 12px", textDecoration: "none"
                    }}>VIEW</Link>
                    <button onClick={() => onDelete(trade)} style={{
                        fontSize: 9, letterSpacing: "0.1em", fontFamily: "'JetBrains Mono',monospace",
                        color: theme.bear, border: `1px solid ${theme.bear}55`,
                        background: `${theme.bear}11`, borderRadius: 4,
                        padding: "5px 12px", cursor: "pointer"
                    }}>DELETE</button>
                </div>
            </td>
        </tr >
    );
}

export default function IndianTradesPage() {
    const router = useRouter();
    const { currentMarket } = useMarket();
    const [trades, setTrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }
        fetchTrades();
    }, [router]);

    const fetchTrades = async () => {
        setLoading(true);
        try {
            const data = await getTrades(MARKETS.INDIAN_MARKET);
            setTrades(data);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (trade) => {
        if (confirm("Delete this Indian Market trade?")) {
            await deleteTrade(trade._id);
            fetchTrades();
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: theme.bg, fontFamily: "'Plus Jakarta Sans',sans-serif", color: theme.primary }}>
            <header style={{
                background: "#FFF", borderBottom: `1px solid ${theme.border}`, height: 60, padding: "0 24px",
                display: "flex", alignItems: "center", justifyContent: "space-between"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Link href="/indian-market/dashboard" style={{ textDecoration: "none", color: theme.primary, display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                            width: 38, height: 38, borderRadius: 8,
                            background: theme.primary,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: "0 2px 8px rgba(27,94,32,0.2)",
                        }}>
                            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 16, color: theme.gold, letterSpacing: "-1px" }}>S</span>
                            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 16, color: "#FFF", letterSpacing: "-1px" }}>R</span>
                        </div>
                        <div>
                            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 800, letterSpacing: "0.04em", color: theme.primary, lineHeight: 1 }}>
                                SR TRADING
                            </div>
                            <div style={{ fontSize: 9, letterSpacing: "0.18em", color: theme.secondary, marginTop: 1, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>
                                INDIAN MARKET JOURNAL
                            </div>
                        </div>
                    </Link>
                </div>
                <MarketSwitcher />
            </header>
            <TickerTape />
            <main style={{ padding: "28px 20px", maxWidth: 960, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                    <h1 style={{ fontSize: 24, fontWeight: 800 }}>Trade Journal <span style={{ color: theme.secondary }}>(NSE/BSE)</span></h1>
                    <Link href="/add-trade?market=Indian_Market" style={{
                        background: theme.primary, color: theme.gold, borderRadius: 8, padding: "10px 18px",
                        textDecoration: "none", fontSize: 12, fontWeight: 700
                    }}>+ NEW ENTRY</Link>
                </div>

                <div style={{ background: theme.card, borderRadius: 12, border: `1px solid ${theme.border}`, overflow: "hidden" }}>
                    {loading ? (
                        <div style={{ padding: 40, textAlign: "center" }}>Loading trades...</div>
                    ) : trades.length === 0 ? (
                        <div style={{ padding: 40, textAlign: "center" }}>No trades found in Indian Market.</div>
                    ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#F9F9F9", borderBottom: `1px solid ${theme.border}` }}>
                                    <th style={{ padding: 14, textAlign: "left", fontSize: 10, color: theme.muted }}>SYMBOL</th>
                                    <th style={{ padding: 14, textAlign: "left", fontSize: 10, color: theme.muted }}>TYPE</th>
                                    <th style={{ padding: 14, textAlign: "left", fontSize: 10, color: theme.muted }}>SEGMENT / INSTRUMENT</th>
                                    <th style={{ padding: 14, textAlign: "left", fontSize: 10, color: theme.muted }}>BASIS</th>
                                    <th style={{ padding: 14, textAlign: "left", fontSize: 10, color: theme.muted }}>PROFIT/LOSS</th>
                                    <th style={{ padding: 14, textAlign: "right", fontSize: 10, color: theme.muted }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {trades.map((t, idx) => (
                                    <TradeRow key={t._id} trade={t} onDelete={handleDelete} idx={idx} />
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
            <style jsx global>{`
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
        </div>
    );
}
