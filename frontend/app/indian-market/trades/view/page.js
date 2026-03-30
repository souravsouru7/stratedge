"use client";

import React, { useEffect, useState, useCallback } from "react";
import { getTrade, updateTrade } from "@/services/tradeApi";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MARKETS } from "@/context/MarketContext";
import MarketSwitcher from "@/components/MarketSwitcher";

const theme = {
  bull: "#0D9E6E",
  bear: "#D63B3B",
  gold: "#B8860B",
  primary: "#0D9E6E",
  secondary: "#0F1923",
  muted: "#94A3B8",
  border: "#E2E8F0",
  bg: "#F0EEE9",
  card: "#FFFFFF",
  nseTag: "#0D9E6E"
};

function CollapsibleSection({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: `1px solid ${theme.border}` }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 14,
          fontWeight: 600,
          color: theme.primary,
          textAlign: "left"
        }}
      >
        {title}
        <span style={{ color: theme.muted, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
        </span>
      </button>
      {open && <div style={{ padding: "0 16px 16px" }}>{children}</div>}
    </div>
  );
}

function IndianTradeDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notesEdit, setNotesEdit] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const fetchTrade = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getTrade(id, MARKETS.INDIAN_MARKET);
      setTrade(data);
      setNotesEdit(data.notes || "");
    } catch (e) {
      setTrade(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTrade();
  }, [fetchTrade]);

  const saveNote = async () => {
    if (!trade || savingNote) return;
    setSavingNote(true);
    try {
      await updateTrade(id, { ...trade, notes: notesEdit }, MARKETS.INDIAN_MARKET);
      setTrade((t) => (t ? { ...t, notes: notesEdit } : null));
    } catch (e) {
      alert("Failed to save note.");
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: theme.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
        <span style={{ color: theme.primary }}>Loading...</span>
      </div>
    );
  }

  if (!trade) {
    return (
      <div style={{ minHeight: "100vh", background: theme.bg, padding: 24, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
        <p style={{ color: theme.bear }}>Trade not found.</p>
        <Link href="/indian-market/trades" style={{ color: theme.primary }}>← Back to Journal</Link>
      </div>
    );
  }

  const bull = parseFloat(trade.profit) >= 0;
  const profitNum = parseFloat(trade.profit) || 0;
  const optType = trade.optionType || "CE";
  // Lot size: from trade or default by underlying (NIFTY=25, BANK NIFTY=15, etc.)
  const defaultLotSize = { "NIFTY": 25, "BANK NIFTY": 15, "BANK NIFTY ": 15, "FIN NIFTY": 25, "MIDCPNIFTY": 50, "SENSEX": 10, "BANKEX": 15 }[String(trade.underlying || "").toUpperCase().trim()] || 1;
  const lotSize = trade.lotSize != null && trade.lotSize > 0 ? Number(trade.lotSize) : defaultLotSize;
  const lots = trade.quantity != null ? Number(trade.quantity) : 0;
  const qty = Math.round(lots * lotSize); // Display quantity in units (e.g. 75 = 3 lots × 25)
  const formatPrice = (v) => v != null && !isNaN(v) ? `₹${Number(v).toFixed(2)}` : "—";
  const instrumentName = trade.pair || (trade.underlying && trade.strikePrice != null ? `${trade.underlying} ${trade.strikePrice} ${optType}` : "—");
  const expiryStr = trade.expiryDate ? new Date(trade.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null;

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, fontFamily: "'Plus Jakarta Sans',sans-serif", color: "#0F172A" }}>
      <header style={{ background: theme.card, borderBottom: `1px solid ${theme.border}`, minHeight: 56, padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/indian-market/dashboard" style={{ textDecoration: "none", color: theme.primary, display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/mainlogo.png" alt="LOGNERA" style={{ width: 32, height: 32, objectFit: "contain" }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.04em", color: theme.primary }}>LOGNERA</div>
              <div style={{ fontSize: 9, letterSpacing: "0.12em", color: theme.secondary, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>OPTIONS JOURNAL</div>
            </div>
          </Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/indian-market/trades" style={{ fontSize: 12, color: theme.muted, fontWeight: 600, textDecoration: "none" }}>← Journal</Link>
          <MarketSwitcher />
        </div>
      </header>

      <main style={{ maxWidth: 560, margin: "0 auto", padding: "20px 16px" }}>
        {/* Instrument header — like reference: Nifty icon + NIFTY 26100 CE + NSE + Expiry + Add Note */}
        <div style={{ background: theme.card, borderRadius: 12, border: `1px solid ${theme.border}`, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#1B5E20,#388E3C)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16 }}>N</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: theme.muted, marginBottom: 2 }}>Nifty</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: theme.primary }}>{instrumentName}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: theme.nseTag, background: "rgba(124,58,237,0.12)", padding: "2px 8px", borderRadius: 4 }}>NSE</span>
                    {expiryStr && <span style={{ fontSize: 11, color: theme.muted }}>{expiryStr} BO</span>}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={saveNote}
                disabled={savingNote}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "#2563EB",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: savingNote ? "not-allowed" : "pointer"
                }}
              >
                + Add Note
              </button>
            </div>
          </div>

          {/* Position details */}
          <CollapsibleSection title="Position details" defaultOpen={true}>
            <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: theme.muted }}>Side</span>
                <span style={{ fontWeight: 600 }}>Closed</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: theme.muted }}>Avg price</span>
                <span style={{ fontWeight: 600 }}>{formatPrice(trade.exitPrice ?? trade.entryPrice)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: theme.muted }}>Net Quantity</span>
                <span style={{ fontWeight: 600 }}>0</span>
              </div>
            </div>
          </CollapsibleSection>

          {/* Trade summary — Buys: Qty 75, Price ₹70.00 / Sells: Qty 75, Price ₹90.00 (like reference) */}
          <CollapsibleSection title="Trade summary" defaultOpen={true}>
            <div style={{ fontSize: 13 }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: theme.muted, fontWeight: 600, marginBottom: 6 }}>Buys</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: theme.muted }}>Qty</span>
                  <span style={{ fontWeight: 600 }}>{qty > 0 ? qty : "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: theme.muted }}>Price</span>
                  <span style={{ fontWeight: 600 }}>{trade.type === "BUY" ? formatPrice(trade.entryPrice) : formatPrice(trade.exitPrice)}</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: theme.muted, fontWeight: 600, marginBottom: 6 }}>Sells</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: theme.muted }}>Qty</span>
                  <span style={{ fontWeight: 600 }}>{qty > 0 ? qty : "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: theme.muted }}>Price</span>
                  <span style={{ fontWeight: 600 }}>{trade.type === "BUY" ? formatPrice(trade.exitPrice) : formatPrice(trade.entryPrice)}</span>
                </div>
              </div>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, color: theme.muted }}>Net P&L</span>
                <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: bull ? theme.bull : theme.bear }}>
                  {bull ? "+" : ""}₹{profitNum.toFixed(2)}
                </span>
              </div>
            </div>
          </CollapsibleSection>

          {/* Notes */}
          <CollapsibleSection title="Notes" defaultOpen={!!trade.notes}>
            <div style={{ marginBottom: 12 }}>
              <textarea
                value={notesEdit}
                onChange={(e) => setNotesEdit(e.target.value)}
                onBlur={saveNote}
                placeholder="Add notes about this trade..."
                rows={3}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: `1px solid ${theme.border}`, fontSize: 13, fontFamily: "'Plus Jakarta Sans',sans-serif", resize: "vertical" }}
              />
              {trade.strategy && (
                <div style={{ marginTop: 10 }}>
                  <span style={{ fontSize: 11, color: theme.muted }}>Strategy</span>
                  <p style={{ margin: "4px 0 0 0", fontSize: 13 }}>{trade.strategy}</p>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Screenshot if present */}
          {trade.screenshot && (
            <div style={{ padding: 16, borderTop: `1px solid ${theme.border}` }}>
              <div style={{ fontSize: 11, color: theme.muted, fontWeight: 600, marginBottom: 8 }}>Trade screenshot</div>
              <a href={trade.screenshot} target="_blank" rel="noopener noreferrer" style={{ display: "block", borderRadius: 8, overflow: "hidden", border: `1px solid ${theme.border}` }}>
                <img src={trade.screenshot} alt="Trade" style={{ width: "100%", maxHeight: 280, objectFit: "contain", background: "#F1F5F9" }} />
              </a>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function IndianTradeDetailPage() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <IndianTradeDetailContent />
    </React.Suspense>
  );
}
