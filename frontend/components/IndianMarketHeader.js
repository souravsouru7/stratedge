"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import MarketSwitcher from "@/components/MarketSwitcher";

const NAV_ITEMS = [
  { href: "/indian-market/dashboard", label: "Dashboard" },
  { href: "/indian-market/trades",    label: "Journal"   },
  { href: "/indian-market/add-trade", label: "Log Trade" },
  { href: "/indian-market/analytics", label: "Analytics" },
  { href: "/indian-market/setups",    label: "Setups"    },
  { href: "/profile",                 label: "Profile"   },
  { href: "/weekly-reports?market=Indian_Market", label: "Weekly AI" },
];

const C = {
  bull:   "#0D9E6E",
  bear:   "#D63B3B",
  border: "#E2E8F0",
  muted:  "#94A3B8",
  ink:    "#0F1923",
  bg:     "#FFFFFF",
  mono:   "'JetBrains Mono',monospace",
  sans:   "'Plus Jakarta Sans',sans-serif",
};

export default function IndianMarketHeader() {
  const router   = useRouter();
  const pathname = usePathname();

  const isActive = (href) => {
    const base = href.split("?")[0];
    return pathname === base || (base !== "/indian-market/dashboard" && pathname.startsWith(base));
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <header style={{
      background:    C.bg,
      borderBottom:  `1px solid ${C.border}`,
      padding:       "10px 24px",
      display:       "flex",
      alignItems:    "center",
      justifyContent:"space-between",
      flexWrap:      "wrap",
      gap:           10,
      position:      "sticky",
      top:           0,
      zIndex:        50,
      boxShadow:     "0 1px 8px rgba(15,25,35,0.06)",
    }}>
      {/* Logo */}
      <Link href="/indian-market/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
        <img src="/mainlogo1.png" alt="Edgecipline" style={{ width: 140, height: 40, objectFit: "contain", objectPosition: "left center" }} />
        <span style={{ fontSize: 9, letterSpacing: "0.16em", color: C.muted, fontFamily: C.mono, fontWeight: 600 }}>
          OPTIONS · NSE / BSE
        </span>
      </Link>

      {/* Nav */}
      <nav style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {NAV_ITEMS.map(n => {
          const active = isActive(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              style={{
                fontSize:       12,
                fontWeight:     700,
                textDecoration: "none",
                padding:        "8px 14px",
                borderRadius:   20,
                fontFamily:     C.sans,
                transition:     "all 0.2s",
                color:          active ? "#fff"            : C.bull,
                background:     active ? C.bull            : `${C.bull}10`,
                border:         `1.5px solid ${active ? C.bull : `${C.bull}30`}`,
                display:        "inline-flex",
                alignItems:     "center",
                minHeight:      "36px",
              }}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <MarketSwitcher />
        <button
          onClick={handleLogout}
          style={{
            display:    "flex",
            alignItems: "center",
            gap:        6,
            background: "rgba(214,59,59,0.08)",
            border:     "1px solid rgba(214,59,59,0.25)",
            borderRadius: 8,
            padding:    "7px 12px",
            cursor:     "pointer",
            fontSize:   10,
            letterSpacing: "0.1em",
            color:      C.bear,
            fontFamily: C.mono,
            fontWeight: 600,
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(214,59,59,0.16)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(214,59,59,0.08)"; }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          LOGOUT
        </button>
      </div>

      <style>{`
        @media (max-width: 768px) {
          header nav { display: none !important; }
        }
      `}</style>
    </header>
  );
}
