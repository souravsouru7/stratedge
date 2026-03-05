"use client";
import { useState, useEffect, useRef } from "react";
import { createTrade } from "@/services/tradeApi";
import { useRouter, useSearchParams } from "next/navigation";
import { useMarket, MARKETS } from "@/context/MarketContext";

export default function AddTradePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentMarket, getCurrencySymbol, isIndianMarket } = useMarket();
  const fileInputRef = useRef(null);

  // Get market from query param or context
  const marketType = searchParams.get('market') || currentMarket;

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  const [trade, setTrade] = useState({
    pair: "",
    type: "BUY",
    lotSize: "",
    entryPrice: "",
    exitPrice: "",
    stopLoss: "",
    takeProfit: "",
    profit: "",
    commission: "",
    swap: "",
    balance: "",
    strategy: "",
    session: "",
    notes: "",
    riskRewardRatio: "",
    riskRewardCustom: "",
    screenshot: "",
    // Indian Market Fields
    segment: "Equity",
    instrumentType: "EQUITY",
    quantity: "",
    strikePrice: "",
    expiryDate: "",
    tradeType: "INTRADAY",
    brokerage: "",
    sttTaxes: "",
    entryBasis: "Plan",
    entryBasisCustom: "",
  });

  const [showCustomRR, setShowCustomRR] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Automatic session detection based on current time
    const now = new Date();
    const hour = now.getUTCHours();

    if (isIndianMarket) {
      // Indian Market (NSE/BSE) typically 9:15 AM - 3:30 PM IST
      // Simplified session detection could be added here if needed
      setTrade(prev => ({ ...prev, session: "Morning Session" }));
    } else {
      let detectedSession = "Asian";
      if (hour >= 8 && hour < 13) detectedSession = "London";
      else if (hour >= 13 && hour < 21) detectedSession = "New York";
      setTrade(prev => ({ ...prev, session: detectedSession }));
    }
  }, [isIndianMarket]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "riskRewardRatio") {
      setShowCustomRR(value === "custom");
    }
    if (name === "entryBasis") {
      setTrade(prev => ({ ...prev, entryBasisCustom: value === "Custom" ? prev.entryBasisCustom : "" }));
    }
    setTrade(prev => ({ ...prev, [name]: value }));
  };

  const handleScreenshotChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setScreenshotPreview(reader.result);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setTrade(prev => ({ ...prev, screenshot: data.url }));
      } else {
        alert("Failed to upload screenshot");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload screenshot");
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!trade.pair) {
      alert(`Please enter a ${isIndianMarket ? "Symbol" : "Pair"}`);
      return;
    }

    const tradeData = {
      pair: trade.pair,
      type: trade.type.toUpperCase(),
      entryPrice: trade.entryPrice ? parseFloat(trade.entryPrice) : undefined,
      exitPrice: trade.exitPrice ? parseFloat(trade.exitPrice) : undefined,
      stopLoss: trade.stopLoss ? parseFloat(trade.stopLoss) : undefined,
      takeProfit: trade.takeProfit ? parseFloat(trade.takeProfit) : undefined,
      profit: trade.profit ? parseFloat(trade.profit) : undefined,
      balance: trade.balance ? parseFloat(trade.balance) : undefined,
      session: trade.session || undefined,
      strategy: trade.strategy || undefined,
      notes: trade.notes || undefined,
      riskRewardRatio: trade.riskRewardRatio || undefined,
      riskRewardCustom: trade.riskRewardCustom || undefined,
      screenshot: trade.screenshot || undefined,
      // Forex specific
      lotSize: !isIndianMarket && trade.lotSize ? parseFloat(trade.lotSize) : undefined,
      commission: !isIndianMarket && trade.commission ? parseFloat(trade.commission) : undefined,
      swap: !isIndianMarket && trade.swap ? parseFloat(trade.swap) : undefined,
      // Indian Market specific
      segment: isIndianMarket ? trade.segment : undefined,
      instrumentType: isIndianMarket ? trade.instrumentType : undefined,
      strikePrice: isIndianMarket && trade.strikePrice ? parseFloat(trade.strikePrice) : undefined,
      expiryDate: isIndianMarket && trade.expiryDate ? trade.expiryDate : undefined,
      quantity: isIndianMarket && trade.quantity ? parseFloat(trade.quantity) : undefined,
      tradeType: isIndianMarket ? trade.tradeType : undefined,
      brokerage: isIndianMarket && trade.brokerage ? parseFloat(trade.brokerage) : undefined,
      sttTaxes: isIndianMarket && trade.sttTaxes ? parseFloat(trade.sttTaxes) : undefined,
      entryBasis: trade.entryBasis || "Plan",
      entryBasisCustom: trade.entryBasis === "Custom" ? trade.entryBasisCustom : undefined,
    };

    try {
      const result = await createTrade(tradeData, marketType);
      if (result && result._id) {
        alert("Trade saved successfully!");
        router.push(marketType === MARKETS.INDIAN_MARKET ? "/indian-market/trades" : "/trades");
      } else {
        throw new Error(result?.message || "Failed to save trade");
      }
    } catch (err) {
      console.error("Save error:", err);
      alert(err.message || "Failed to save trade. Please try again.");
    }
  };

  return (
    <div className="p-10 max-w-4xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <header className="mb-10 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Log New <span style={{ color: isIndianMarket ? '#1B5E20' : '#0D9E6E' }}>{isIndianMarket ? "Indian Trade" : "Forex Trade"}</span>
          </h1>
          <p className="text-gray-500 mt-1 uppercase text-xs tracking-widest font-bold">
            {isIndianMarket ? "NSE / BSE / F&O MARKET ENTRY" : "GLOBAL CURRENCY MARKET ENTRY"}
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Market-Specific Fields First */}
          {isIndianMarket && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Segment</label>
                <select name="segment" className="w-full border-gray-200 border p-3 rounded-xl focus:ring-2 focus:ring-green-500 transition outline-none" onChange={handleChange} value={trade.segment}>
                  <option value="Equity">Equity (Cash)</option>
                  <option value="F&O">F&O (Derivatives)</option>
                  <option value="Commodity">Commodity</option>
                  <option value="Currency">Currency (India)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Instrument</label>
                <select name="instrumentType" className="w-full border-gray-200 border p-3 rounded-xl focus:ring-2 focus:ring-green-500 transition outline-none" onChange={handleChange} value={trade.instrumentType}>
                  <option value="EQUITY">Equity</option>
                  <option value="FUTURE">Future</option>
                  <option value="OPTION">Option</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Trade Type</label>
                <select name="tradeType" className="w-full border-gray-200 border p-3 rounded-xl focus:ring-2 focus:ring-green-500 transition outline-none" onChange={handleChange} value={trade.tradeType}>
                  <option value="INTRADAY">Intraday</option>
                  <option value="DELIVERY">Delivery/Swing</option>
                </select>
              </div>
            </>
          )}

          {/* Core Fields */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{isIndianMarket ? "Symbol" : "Pair"}</label>
            <input name="pair" placeholder={isIndianMarket ? "e.g. RELIANCE" : "e.g. XAUUSD"} className="w-full border-gray-200 border p-3 rounded-xl focus:ring-2 focus:ring-green-500 transition outline-none" onChange={handleChange} value={trade.pair} />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Action</label>
            <select name="type" className="w-full border-gray-200 border p-3 rounded-xl focus:ring-2 focus:ring-green-500 transition outline-none" onChange={handleChange} value={trade.type}>
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{isIndianMarket ? "Quantity" : "Lot Size"}</label>
            <input name={isIndianMarket ? "quantity" : "lotSize"} placeholder={isIndianMarket ? "100" : "0.01"} className="w-full border-gray-200 border p-3 rounded-xl focus:ring-2 focus:ring-green-500 transition outline-none" onChange={handleChange} value={isIndianMarket ? trade.quantity : trade.lotSize} />
          </div>

          {/* Price Fields */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Entry Price</label>
            <input name="entryPrice" placeholder="0.00" className="w-full border-gray-200 border p-3 rounded-xl focus:ring-2 focus:ring-green-500 transition outline-none" onChange={handleChange} value={trade.entryPrice} />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Exit Price</label>
            <input name="exitPrice" placeholder="0.00" className="w-full border-gray-200 border p-3 rounded-xl focus:ring-2 focus:ring-green-500 transition outline-none" onChange={handleChange} value={trade.exitPrice} />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Net Profit ({getCurrencySymbol()})</label>
            <input name="profit" placeholder="0.00" className="w-full border-gray-200 border p-3 rounded-xl font-bold focus:ring-2 focus:ring-green-500 transition outline-none" onChange={handleChange} value={trade.profit} style={{ color: trade.profit >= 0 ? '#0D9E6E' : '#D63B3B' }} />
          </div>

          {/* Conditional F&O Fields */}
          {isIndianMarket && (trade.instrumentType === "OPTION" || trade.instrumentType === "FUTURE") && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Strike Price</label>
                <input name="strikePrice" placeholder="e.g. 22000" className="w-full border-gray-200 border p-3 rounded-xl focus:ring-2 focus:ring-green-500 transition outline-none" onChange={handleChange} value={trade.strikePrice} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Expiry Date</label>
                <input type="date" name="expiryDate" className="w-full border-gray-200 border p-3 rounded-xl focus:ring-2 focus:ring-green-500 transition outline-none" onChange={handleChange} value={trade.expiryDate} />
              </div>
            </>
          )}

          {/* Risk Management */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Stop Loss</label>
            <input name="stopLoss" placeholder="0.00" className="w-full border-gray-200 border p-3 rounded-xl focus:ring-2 focus:ring-red-500 transition outline-none" onChange={handleChange} value={trade.stopLoss} />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Take Profit</label>
            <input name="takeProfit" placeholder="0.00" className="w-full border-gray-200 border p-3 rounded-xl focus:ring-2 focus:ring-green-500 transition outline-none" onChange={handleChange} value={trade.takeProfit} />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">RR Ratio</label>
            <select name="riskRewardRatio" className="w-full border-gray-200 border p-3 rounded-xl focus:ring-2 focus:ring-green-500 transition outline-none" onChange={handleChange} value={trade.riskRewardRatio}>
              <option value="">Select Ratio</option>
              <option value="1:1">1:1</option>
              <option value="1:2">1:2</option>
              <option value="1:3">1:3</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Cost Fields */}
          {isIndianMarket ? (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Brokerage</label>
                <input name="brokerage" placeholder="₹20" className="w-full border-gray-200 border p-3 rounded-xl focus:ring-2 focus:ring-green-500 transition outline-none" onChange={handleChange} value={trade.brokerage} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">STT & Other Taxes</label>
                <input name="sttTaxes" placeholder="₹15" className="w-full border-gray-200 border p-3 rounded-xl focus:ring-2 focus:ring-green-500 transition outline-none" onChange={handleChange} value={trade.sttTaxes} />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Commission</label>
                <input name="commission" placeholder="0.00" className="w-full border-gray-200 border p-3 rounded-xl focus:ring-2 focus:ring-green-500 transition outline-none" onChange={handleChange} value={trade.commission} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Swap</label>
                <input name="swap" placeholder="0.00" className="w-full border-gray-200 border p-3 rounded-xl focus:ring-2 focus:ring-green-500 transition outline-none" onChange={handleChange} value={trade.swap} />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Strategy</label>
            <input name="strategy" placeholder="SMC / Trendline" className="w-full border-gray-200 border p-3 rounded-xl focus:ring-2 focus:ring-green-500 transition outline-none" onChange={handleChange} value={trade.strategy} />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Entry Basis</label>
            <select name="entryBasis" className="w-full border-gray-200 border p-3 rounded-xl focus:ring-2 focus:ring-green-500 transition outline-none" onChange={handleChange} value={trade.entryBasis}>
              <option value="Plan">Rule Based / Plan</option>
              <option value="Emotion">Emotional</option>
              <option value="Impulsive">Impulsive</option>
              <option value="Custom">Custom Basis</option>
            </select>
          </div>

          {trade.entryBasis === "Custom" && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Custom Basis Detail</label>
              <input name="entryBasisCustom" placeholder="Describe basis..." className="w-full border-gray-200 border p-3 rounded-xl focus:ring-2 focus:ring-green-500 transition outline-none" onChange={handleChange} value={trade.entryBasisCustom} />
            </div>
          )}
        </div>

        {/* Screenshot & Notes Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Visual Evidence</label>
            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleScreenshotChange} className="hidden" />
            <div onClick={triggerFileInput} className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all">
              {screenshotPreview ? (
                <div className="space-y-4">
                  <img src={screenshotPreview} alt="Trade Evidence" className="max-h-56 mx-auto rounded-lg shadow-lg" />
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Click to update screenshot</p>
                </div>
              ) : (
                <div className="py-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">{uploading ? "Uploading Evidence..." : "Drop trade screenshot here"}</p>
                  <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-widest">PNG, JPG or JPEG up to 10MB</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Trade Execution Notes</label>
            <textarea name="notes" placeholder="Describe your thought process, emotions, and execution details..." className="flex-grow border-gray-200 border p-5 rounded-2xl focus:ring-2 focus:ring-green-500 transition outline-none text-sm leading-relaxed" onChange={handleChange} value={trade.notes} />
          </div>
        </div>

        <button className="w-full py-4 rounded-2xl text-white font-extrabold text-sm tracking-widest uppercase shadow-xl transition transform active:scale-95 disabled:bg-gray-300" style={{ background: isIndianMarket ? 'linear-gradient(135deg, #1B5E20 0%, #388E3C 100%)' : 'linear-gradient(135deg, #0F1923 0%, #1a2d3d 100%)' }} disabled={uploading}>
          {uploading ? "SYNCING DATA..." : "COMMIT TRADE TO JOURNAL"}
        </button>
      </form>
    </div>
  );
}
