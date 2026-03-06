"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    getSummary,
    getAIInsights
} from "@/services/analyticsApi";
import MarketSwitcher from "@/components/MarketSwitcher";
import LoadingSpinner from "@/components/LoadingSpinner";
import InstallPWA from "@/components/InstallPWA";
import { useMarket, MARKETS } from "@/context/MarketContext";

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

function StatCard({ label, value, sub, color, delay = 0 }) {
    return (
        <div style={{
            background: theme.card, borderRadius: 12, border: `1px solid ${theme.border}`,
            padding: 20, flex: "1 1 200px", animation: `fadeUp 0.5s ease ${delay}s both`
        }}>
            <div style={{ fontSize: 10, color: theme.muted, letterSpacing: "0.1em", marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
            {sub && <div style={{ fontSize: 10, color: theme.muted, marginTop: 4 }}>{sub}</div>}
        </div>
    );
}

export default function IndianAnalyticsPage() {
    const router = useRouter();
    const { currentMarket } = useMarket();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ summary: null, insights: null });

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }
        fetchData();
    }, [router]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [summary, insights] = await Promise.all([
                getSummary(MARKETS.INDIAN_MARKET),
                getAIInsights(MARKETS.INDIAN_MARKET)
            ]);
            setData({ summary, insights });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: theme.bg, fontFamily: "'Plus Jakarta Sans',sans-serif", color: theme.primary }}>
            <header style={{
                background: "#FFF", borderBottom: `1px solid ${theme.border}`, minHeight: 60, padding: "10px 24px",
                display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Link href="/indian-market/dashboard" style={{ textDecoration: "none", color: theme.primary, display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 38, height: 38, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}><img src="/logo.png" alt="Stratedge" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
                        <div>
                            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 800, letterSpacing: "0.04em", color: theme.primary, lineHeight: 1 }}>
                                STRATEDGE
                            </div>
                            <div style={{ fontSize: 9, letterSpacing: "0.18em", color: theme.secondary, marginTop: 1, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>
                                INDIAN MARKET JOURNAL
                            </div>
                        </div>
                    </Link>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <InstallPWA />
                    <MarketSwitcher />
                </div>
            </header>

            <main style={{ padding: "28px 20px", maxWidth: 1000, margin: "0 auto" }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>AI-Powered <span style={{ color: theme.secondary }}>Insights</span></h1>

                {loading ? (
                    <LoadingSpinner message="DECODING INDIAN MARKET TRENDS..." fullPage />
                ) : (
                    <>
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
                            <StatCard
                                label="TOTAL PROFIT"
                                value={`₹${parseFloat(data.summary?.totalProfit || 0).toLocaleString('en-IN')}`}
                                color={parseFloat(data.summary?.totalProfit || 0) >= 0 ? theme.bull : theme.bear}
                                sub="Life-time Net"
                            />
                            <StatCard
                                label="WIN RATE"
                                value={`${data.summary?.winRate || 0}%`}
                                color={parseFloat(data.summary?.winRate || 0) >= 50 ? theme.bull : theme.bear}
                                sub={`${data.summary?.winningTrades || 0} Wins`}
                            />
                            <StatCard
                                label="AI SCORE"
                                value={data.insights?.score || "N/A"}
                                color={theme.gold}
                                sub="Pattern Consistency"
                            />
                        </div>

                        <div style={{ background: theme.card, borderRadius: 16, padding: 24, border: `1px solid ${theme.border}` }}>
                            <h3 style={{ margin: "0 0 16px 0", fontSize: 18 }}>Pattern Analysis</h3>
                            {data.insights?.insights?.length > 0 ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    {data.insights.insights.map((insight, i) => (
                                        <div key={i} style={{
                                            padding: 12, borderRadius: 8, background: "#F9F9F9", borderLeft: `4px solid ${theme.gold}`,
                                            fontSize: 13, lineHeight: 1.5
                                        }}>
                                            {insight}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ color: theme.muted }}>Not enough trade data for Indian Market AI analysis yet.</div>
                            )}
                        </div>
                    </>
                )}
            </main>
            <style jsx global>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
        </div>
    );
}
