"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTrades, deleteTrade } from "@/services/tradeApi";
import Link from "next/link";
import MarketSwitcher from "@/components/MarketSwitcher";
import { useMarket, MARKETS } from "@/context/MarketContext";
import InstallPWA from "@/components/InstallPWA";

/* ─────────────────────────────────────────
   DESIGN TOKENS — Indian Market Pro Theme
───────────────────────────────────────── */
const theme = {
    bull: "#16A34A",
    bear: "#DC2626",
    gold: "#FBBF24",
    primary: "#14532D",
    secondary: "#166534",
    muted: "#6B7280",
    border: "#E5E7EB",
    bg: "#F3F4F6",
    card: "#FFFFFF"
};

function TickerTape() {
    const options = [
        { sym: "NIFTY CE", val: "+2.1%", bull: true }, { sym: "NIFTY PE", val: "-1.4%", bull: false },
        { sym: "BANK NIFTY CE", val: "+1.8%", bull: true }, { sym: "BANK NIFTY PE", val: "+0.6%", bull: true },
        { sym: "FIN NIFTY CE", val: "-0.3%", bull: false }, { sym: "MIDCPNIFTY PE", val: "+1.2%", bull: true }
    ];
    const items = [...options, ...options];
    return (
        <div style={{ overflow: "hidden", background: "#1B5E20", borderBottom: `3px solid ${theme.gold}`, padding: "7px 0", whiteSpace: "nowrap", position: "relative", zIndex: 10 }}>
            <div style={{ display: "inline-flex", gap: "48px", animation: "ticker 32s linear infinite" }}>
                {items.map((t, i) => (
                    <span key={i} style={{ fontSize: "11px", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.04em" }}>
                        <span style={{ color: "#E8F5E9", marginRight: 6 }}>{t.sym}</span>
                        <span style={{ color: t.bull ? "#A5D6A7" : "#EF9A9A" }}>{t.bull ? "▲" : "▼"} {t.val}</span>
                    </span>
                ))}
            </div>
        </div>
    );
}

function TradeRow({ trade, onDelete, idx }) {
    const profitNum = parseFloat(trade.profit) || 0;
    const bull = profitNum >= 0;
    const isLong = trade.type?.toUpperCase() === "BUY" || trade.type?.toUpperCase() === "LONG";
    const optType = trade.optionType || (trade.pair && trade.pair.includes(" PE") ? "PE" : "CE");
    return (
        <tr style={{ borderBottom: `1px solid ${theme.border}`, animation: `fadeUp 0.4s ease ${idx * 0.05}s both`, transition: "background 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(46,125,50,0.05)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <td style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: bull ? theme.bull : theme.bear }} />
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: theme.primary, fontWeight: 600 }}>{trade.pair || `${trade.underlying || ""} ${trade.strikePrice || ""} ${optType}`}</span>
                </div>
            </td>
            <td style={{ padding: "14px 16px" }}>
                <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: theme.muted }}>{trade.strikePrice != null ? `₹${Number(trade.strikePrice).toLocaleString("en-IN")}` : "—"}</span>
            </td>
            <td style={{ padding: "14px 16px" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: optType === "CE" ? theme.bull : theme.bear, letterSpacing: "0.06em" }}>{optType}</span>
            </td>
            <td style={{ padding: "14px 16px" }}>
                <span style={{ fontSize: 9, letterSpacing: "0.12em", color: isLong ? theme.bull : theme.bear, background: isLong ? "rgba(46,125,50,0.1)" : "rgba(198,40,40,0.1)", borderRadius: 20, padding: "3px 10px", fontFamily: "'JetBrains Mono',monospace" }}>
                    {isLong ? "▲ LONG" : "▼ SHORT"}
                </span>
            </td>
            <td style={{ padding: "14px 16px" }}>
                <span style={{ fontSize: 11, color: theme.muted }}>{trade.entryPrice != null ? `₹${Number(trade.entryPrice).toLocaleString("en-IN")}` : "—"}</span>
                {trade.exitPrice != null && <span style={{ fontSize: 10, color: theme.muted, marginLeft: 4 }}>→ ₹{Number(trade.exitPrice).toLocaleString("en-IN")}</span>}
            </td>
            <td style={{ padding: "14px 16px" }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: bull ? theme.bull : theme.bear }}>
                    {bull ? "+" : ""}₹{Math.abs(profitNum).toLocaleString("en-IN")}
                </span>
            </td>
            <td style={{ padding: "14px 16px" }}>
                <span style={{ fontSize: 9, letterSpacing: "0.08em", color: trade.entryBasis === "Plan" ? theme.primary : trade.entryBasis === "Emotion" ? theme.bear : "#B8860B", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, textTransform: "uppercase" }}>
                    {trade.entryBasis === "Custom" ? trade.entryBasisCustom : trade.entryBasis || "Plan"}
                </span>
            </td>
            <td style={{ padding: "14px 16px", textAlign: "right" }}>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <Link href={`/indian-market/trades/${trade._id}`} style={{ fontSize: 9, letterSpacing: "0.1em", fontFamily: "'JetBrains Mono',monospace", color: theme.bull, border: `1px solid ${theme.bull}55`, background: `${theme.bull}11`, borderRadius: 4, padding: "5px 12px", textDecoration: "none" }}>VIEW</Link>
                    <button onClick={() => onDelete(trade)} style={{ fontSize: 9, letterSpacing: "0.1em", fontFamily: "'JetBrains Mono',monospace", color: theme.bear, border: `1px solid ${theme.bear}55`, background: `${theme.bear}11`, borderRadius: 4, padding: "5px 12px", cursor: "pointer" }}>DELETE</button>
                </div>
            </td>
        </tr>
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
            await deleteTrade(trade._id, MARKETS.INDIAN_MARKET);
            fetchTrades();
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: theme.bg, fontFamily: "'Plus Jakarta Sans',sans-serif", color: theme.primary }}>
            <header style={{
                background: "#FFF", borderBottom: `1px solid ${theme.border}`, minHeight: 60, padding: "10px 24px",
                display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* Global back button */}
                    <button
                        type="button"
                        onClick={() => router.back()}
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: "999px",
                            border: `1px solid ${theme.border}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 8,
                            cursor: "pointer",
                            background: "#FFFFFF",
                            padding: 0
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="2.2">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <Link href="/indian-market/dashboard" style={{ textDecoration: "none", color: theme.primary, display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 38, height: 38, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}><img src="/logo.png" alt="Stratedge" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
                        <div>
                            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 800, letterSpacing: "0.04em", color: theme.primary, lineHeight: 1 }}>
                                STRATEDGE
                            </div>
                            <div style={{ fontSize: 9, letterSpacing: "0.18em", color: theme.secondary, marginTop: 1, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>
                                OPTIONS JOURNAL
                            </div>
                        </div>
                    </Link>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <InstallPWA />
                    <MarketSwitcher />
                </div>
            </header>
            <TickerTape />
            <main style={{ padding: "28px 20px", maxWidth: 960, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                    <h1 style={{ fontSize: 24, fontWeight: 800 }}>Options Journal <span style={{ color: theme.secondary }}>(NSE / BSE)</span></h1>
                    <Link href="/indian-market/add-trade" style={{
                        background: theme.primary, color: theme.gold, borderRadius: 8, padding: "10px 18px",
                        textDecoration: "none", fontSize: 12, fontWeight: 700
                    }}>+ NEW OPTIONS TRADE</Link>
                </div>

                <div style={{ background: theme.card, borderRadius: 12, border: `1px solid ${theme.border}`, overflow: "hidden" }}>
                    {loading ? (
                        <div style={{ padding: 40, textAlign: "center" }}>Loading trades...</div>
                    ) : trades.length === 0 ? (
                        <div style={{ padding: 40, textAlign: "center" }}>No options trades yet. <Link href="/indian-market/add-trade" style={{ color: theme.primary, fontWeight: 600 }}>Log your first trade</Link></div>
                    ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#F9F9F9", borderBottom: `1px solid ${theme.border}` }}>
                                    <th style={{ padding: 14, textAlign: "left", fontSize: 10, color: theme.muted }}>SYMBOL</th>
                                    <th style={{ padding: 14, textAlign: "left", fontSize: 10, color: theme.muted }}>STRIKE</th>
                                    <th style={{ padding: 14, textAlign: "left", fontSize: 10, color: theme.muted }}>CE/PE</th>
                                    <th style={{ padding: 14, textAlign: "left", fontSize: 10, color: theme.muted }}>TYPE</th>
                                    <th style={{ padding: 14, textAlign: "left", fontSize: 10, color: theme.muted }}>ENTRY → EXIT</th>
                                    <th style={{ padding: 14, textAlign: "left", fontSize: 10, color: theme.muted }}>P&L</th>
                                    <th style={{ padding: 14, textAlign: "left", fontSize: 10, color: theme.muted }}>BASIS</th>
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
