"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSummary } from "@/services/analyticsApi";
import Link from "next/link";
import MarketSwitcher from "@/components/MarketSwitcher";
import { useMarket, MARKETS } from "@/context/MarketContext";
import LoadingSpinner from "@/components/LoadingSpinner";

/* ─────────────────────────────────────────
   DESIGN TOKENS — Indian Market Theme (Green/Gold)
   Base: subtle beige #F5F5DC
   Cards: #FFFFFF
   Bull: #2E7D32 (forest green)
   Bear: #C62828 (deep red)
   Gold: #FFD700 (bright gold)
   Text primary: #1B5E20
   Text secondary: #388E3C
   Text muted: #757575
   Border: #E0E0E0
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

/* ─────────────────────────────────────────
   TICKER TAPE — NSE/BSE Symbols
───────────────────────────────────────── */
const indianTickers = [
    { sym: "NIFTY 50", val: "+1.24%", bull: true }, { sym: "BANK NIFTY", val: "-0.45%", bull: false },
    { sym: "RELIANCE", val: "+2.15%", bull: true }, { sym: "TCS", val: "+0.87%", bull: true },
    { sym: "HDFC BANK", val: "-1.12%", bull: false }, { sym: "INFY", val: "+3.40%", bull: true },
    { sym: "ICICI BANK", val: "+0.55%", bull: true }, { sym: "TATAMOTORS", val: "-2.30%", bull: false },
    { sym: "SBIN", val: "+1.05%", bull: true }, { sym: "ADANIENT", val: "-4.12%", bull: false },
];

function TickerTape() {
    const items = [...indianTickers, ...indianTickers];
    return (
        <div style={{
            overflow: "hidden", background: "#1B5E20",
            borderBottom: `3px solid ${theme.gold}`,
            padding: "7px 0", whiteSpace: "nowrap", position: "relative", zIndex: 10,
        }}>
            <div style={{ display: "inline-flex", gap: "48px", animation: "ticker 32s linear infinite" }}>
                {items.map((t, i) => (
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

/* ─────────────────────────────────────────
   STAT CARD
───────────────────────────────────────── */
function StatCard({ label, value, sub, accentColor, icon, delay = 0 }) {
    const displayValue = value !== undefined && value !== null && !isNaN(value) ? value : (value || 0);

    return (
        <div style={{
            background: theme.card, borderRadius: 12,
            border: `1px solid ${theme.border}`,
            flex: "1 1 160px", overflow: "hidden",
            boxShadow: "0 2px 12px rgba(27,94,32,0.06)",
            animation: `fadeUp 0.5s ease ${delay}s both`,
            position: "relative",
        }}>
            <div style={{ height: 3, background: `linear-gradient(90deg,${accentColor},${accentColor}22)` }} />
            <div style={{ padding: "20px 20px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <span style={{ fontSize: 10, color: theme.muted, letterSpacing: "0.12em", fontFamily: "'JetBrains Mono',monospace", fontWeight: 500 }}>
                        {label}
                    </span>
                    {icon && (
                        <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: `${accentColor}12`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: accentColor,
                        }}>
                            {icon}
                        </div>
                    )}
                </div>
                <div style={{ fontSize: 30, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: accentColor, lineHeight: 1, marginBottom: 6 }}>
                    {displayValue}
                </div>
                {sub && (
                    <div style={{ fontSize: 10, color: theme.muted, letterSpacing: "0.06em", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                        {sub}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────
   NAV CARD
───────────────────────────────────────── */
function NavCard({ href, label, sub, icon, accentColor = theme.primary, delay = 0 }) {
    return (
        <Link href={href} style={{ textDecoration: "none", flex: "1 1 140px" }}>
            <div
                style={{
                    background: theme.card, borderRadius: 12, padding: "18px",
                    border: `1px solid ${theme.border}`, cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: "0 2px 8px rgba(27,94,32,0.05)",
                    animation: `fadeUp 0.5s ease ${delay}s both`,
                    position: "relative", overflow: "hidden",
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 8px 24px ${accentColor}22`; e.currentTarget.style.borderColor = `${accentColor}55`; e.currentTarget.style.transform = "translateY(-3px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(27,94,32,0.05)"; e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.transform = "translateY(0)"; }}
            >
                <div style={{
                    width: 36, height: 36, borderRadius: 9, marginBottom: 12,
                    background: `${accentColor}12`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: accentColor,
                }}>
                    {icon}
                </div>
                <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: theme.primary, marginBottom: 4, letterSpacing: "-0.01em" }}>
                    {label}
                </div>
                <div style={{ fontSize: 10, color: theme.muted, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{sub}</div>
                <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: `${accentColor}55`, fontSize: 18, fontWeight: 300 }}>›</div>
            </div>
        </Link>
    );
}

/* ─────────────────────────────────────────
   CREATE TRADE DROPDOWN BUTTON
───────────────────────────────────────── */
function CreateTradeButton() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    const handleOptionClick = (path) => {
        setIsOpen(false);
        router.push(path);
    };

    return (
        <div style={{ position: "relative" }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: `linear-gradient(135deg, ${theme.primary} 0%, #2e7d32 100%)`,
                    color: theme.gold, borderRadius: 10, padding: "12px 20px",
                    fontSize: 12, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700,
                    letterSpacing: "0.08em", border: `1px solid ${theme.gold}44`,
                    boxShadow: "0 4px 16px rgba(27,94,32,0.2), 0 0 20px rgba(255,215,0,0.1)",
                    cursor: "pointer", transition: "all 0.25s ease",
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 24px rgba(27,94,32,0.3), 0 0 30px rgba(255,215,0,0.2)";
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(27,94,32,0.2), 0 0 20px rgba(255,215,0,0.1)";
                }}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                NEW TRADE
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {isOpen && (
                <div style={{
                    position: "absolute", top: "100%", right: 0, marginTop: 8,
                    background: "#FFFFFF", borderRadius: 12, border: `1px solid ${theme.border}`,
                    boxShadow: "0 8px 32px rgba(27,94,32,0.15)", overflow: "hidden", minWidth: 220, zIndex: 100,
                }}>
                    <button onClick={() => handleOptionClick("/add-trade?market=Indian_Market")} style={dropOptionStyle}
                        onMouseEnter={e => e.currentTarget.style.background = "#F9F9F9"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                        <div style={{ ...dropIconBox, background: "rgba(46,125,50,0.12)", color: theme.bull }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                        </div>
                        <div>
                            <div style={dropLabelStyle}>Manual Entry</div>
                            <div style={dropSubStyle}>Log trade details by hand</div>
                        </div>
                    </button>
                    <div style={{ height: 1, background: theme.border, margin: "0 12px" }} />
                    <button onClick={() => handleOptionClick("/upload-trade?market=Indian_Market")} style={dropOptionStyle}
                        onMouseEnter={e => e.currentTarget.style.background = "#F9F9F9"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                        <div style={{ ...dropIconBox, background: "rgba(255,215,0,0.12)", color: "#B8860B" }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                            </svg>
                        </div>
                        <div>
                            <div style={dropLabelStyle}>Extract from Image</div>
                            <div style={dropSubStyle}>AI reads your screenshot</div>
                        </div>
                    </button>
                </div>
            )}
            {isOpen && <div style={{ position: "fixed", inset: 0, zIndex: 50 }} onClick={() => setIsOpen(false)} />}
        </div>
    );
}

const dropOptionStyle = { display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "14px 18px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", transition: "background 0.15s ease" };
const dropIconBox = { width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" };
const dropLabelStyle = { fontSize: 13, fontWeight: 700, color: theme.primary, fontFamily: "'Plus Jakarta Sans',sans-serif" };
const dropSubStyle = { fontSize: 10, color: theme.muted, fontFamily: "'Plus Jakarta Sans',sans-serif", marginTop: 2 };

export default function IndianMarketDashboard() {
    const router = useRouter();
    const { currentMarket, toggleMarket } = useMarket();
    const [stats, setStats] = useState(null);
    const [mounted, setMounted] = useState(false);
    const [time, setTime] = useState("");

    const fetchStats = async () => {
        try {
            // Pass 'Indian_Market' to the service
            const data = await getSummary(MARKETS.INDIAN_MARKET);
            setStats(data);
        } catch (error) {
            console.error("Failed to fetch Indian Market stats:", error);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }

        setMounted(true);
        fetchStats();

        const tick = () => setTime(new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Kolkata"
        }));
        tick();
        const t = setInterval(tick, 1000);
        return () => clearInterval(t);
    }, [router, currentMarket, toggleMarket]);

    const profitBull = stats ? parseFloat(stats.totalProfit) >= 0 : true;
    const winBull = stats ? parseFloat(stats.winRate) >= 50 : true;

    if (!mounted) return null;

    return (
        <div style={{
            minHeight: "100vh",
            background: theme.bg,
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            color: theme.primary,
            position: "relative",
            overflow: "hidden",
        }}>
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

            {/* ── HEADER ── */}
            <header style={{
                position: "relative", zIndex: 20,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0 24px", height: 60, flexWrap: "wrap", gap: 10,
                background: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(20px)",
                borderBottom: `1px solid ${theme.border}`,
                boxShadow: "0 1px 12px rgba(27,94,32,0.06)",
            }}>
                {/* Logo */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
                </div>

                {/* Right side */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <MarketSwitcher />

                    <div style={{
                        fontFamily: "'JetBrains Mono',monospace", fontSize: 12,
                        color: theme.secondary, letterSpacing: "0.06em",
                        background: "#FFF", border: `1px solid ${theme.border}`,
                        borderRadius: 6, padding: "4px 10px",
                    }}>
                        IST: {time}
                    </div>

                    <nav style={{ display: "flex", gap: 4 }}>
                        {[
                            { href: "/indian-market/trades", label: "Journal" },
                            { href: "/indian-market/add-trade", label: "Log Trade" },
                            { href: "/indian-market/analytics", label: "Analytics" },
                        ].map(n => (
                            <Link key={n.href} href={n.href} style={{
                                fontSize: 12, color: theme.secondary, fontWeight: 600,
                                textDecoration: "none", padding: "5px 10px",
                                borderRadius: 6, transition: "all 0.15s",
                                fontFamily: "'Plus Jakarta Sans',sans-serif",
                            }}
                                onMouseEnter={e => { e.currentTarget.style.background = "rgba(46,125,50,0.1)"; e.currentTarget.style.color = theme.primary; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = theme.secondary; }}
                            >
                                {n.label}
                            </Link>
                        ))}
                    </nav>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                            onClick={() => {
                                localStorage.removeItem("token");
                                router.push("/login");
                            }}
                            style={{
                                display: "flex", alignItems: "center", gap: 6,
                                background: "rgba(198,40,40,0.1)", border: "1px solid rgba(198,40,40,0.3)",
                                borderRadius: 6, padding: "6px 12px",
                                cursor: "pointer", fontSize: 10, letterSpacing: "0.1em",
                                color: theme.bear, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600,
                                transition: "all 0.2s",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(198,40,40,0.2)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(198,40,40,0.1)"; }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                            LOGOUT
                        </button>
                        <div style={{
                            width: 34, height: 34, borderRadius: "50%",
                            background: theme.primary, border: `2px solid ${theme.border}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer",
                        }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.gold} strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                            </svg>
                        </div>
                    </div>
                </div>
            </header>

            <TickerTape />

            <main style={{
                position: "relative", zIndex: 5, padding: "28px 20px",
                maxWidth: 1080, margin: "0 auto",
            }}>
                {!stats ? (
                    <LoadingSpinner message="SYNCING INDIAN MARKETS..." />
                ) : (
                    <>
                        <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 14 }}>
                            <div>
                                <h1 style={{ fontSize: 28, fontWeight: 800, color: theme.primary, margin: 0 }}>
                                    Nifty & Sensex <span style={{ color: theme.secondary }}>Dashboard</span>
                                </h1>
                                <p style={{ fontSize: 12, color: theme.muted, marginTop: 5, fontFamily: "'JetBrains Mono',monospace" }}>
                                    WELCOME BACK — ANALYSING INDIAN MARKETS
                                </p>
                            </div>
                            <CreateTradeButton />
                        </div>

                        <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
                            <StatCard
                                label="TOTAL TRADES"
                                value={stats.totalTrades}
                                sub="Indian Market entries"
                                accentColor={theme.primary}
                                delay={0}
                                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>}
                            />
                            <StatCard
                                label="NET PROFIT"
                                value={`${profitBull ? "+" : ""}₹${parseFloat(stats.totalProfit).toLocaleString('en-IN')}`}
                                sub={profitBull ? "Green day in Dalal Street" : "Red zone today"}
                                accentColor={profitBull ? theme.bull : theme.bear}
                                delay={0.1}
                                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
                            />
                            <StatCard
                                label="STRATEGY WIN RATE"
                                value={`${parseFloat(stats.winRate).toFixed(1)}%`}
                                sub={winBull ? "Strong Edge" : "Review Setups"}
                                accentColor={winBull ? theme.bull : theme.bear}
                                delay={0.2}
                                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
                            />
                        </div>

                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
                            <NavCard href="/indian-market/trades" label="Trade Log" sub="NSE/BSE History" accentColor={theme.primary} delay={0.3}
                                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>}
                            />
                            <NavCard href="/add-trade?market=Indian_Market" label="New Indian Trade" sub="Add F&O or Equity" accentColor={theme.secondary} delay={0.4}
                                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>}
                            />
                            <NavCard href="/upload-trade?market=Indian_Market" label="Extract from Image" sub="AI Data Extraction" accentColor={theme.gold} delay={0.45}
                                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>}
                            />
                            <NavCard href="/indian-market/analytics" label="Indian Analytics" sub="Depth analysis" accentColor={theme.gold} delay={0.5}
                                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></svg>}
                            />
                        </div>

                        <div style={{
                            background: "#FFF", borderRadius: 16, padding: 24,
                            border: `1px solid ${theme.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.05)"
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Quick Overview</h3>
                                <span style={{ fontSize: 10, padding: "4px 8px", background: "rgba(46,125,50,0.1)", borderRadius: 4, color: theme.primary, fontWeight: 700 }}>LIVE STATS</span>
                            </div>
                            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                                <div style={{ flex: 1, minWidth: 200 }}>
                                    <div style={{ fontSize: 12, color: theme.muted, marginBottom: 8 }}>Winning Streaks</div>
                                    <div style={{ height: 8, background: "#F5F5F5", borderRadius: 4, overflow: "hidden" }}>
                                        <div style={{ height: "100%", width: "65%", background: theme.bull, borderRadius: 4 }} />
                                    </div>
                                </div>
                                <div style={{ flex: 1, minWidth: 200 }}>
                                    <div style={{ fontSize: 12, color: theme.muted, marginBottom: 8 }}>Loss Recovery</div>
                                    <div style={{ height: 8, background: "#F5F5F5", borderRadius: 4, overflow: "hidden" }}>
                                        <div style={{ height: "100%", width: "82%", background: theme.gold, borderRadius: 4 }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>

            <style jsx global>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}
