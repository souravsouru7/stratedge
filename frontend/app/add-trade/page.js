"use client";
import { useState, useEffect, useRef } from "react";
import { createTrade } from "@/services/tradeApi";
import { useRouter } from "next/navigation";

export default function AddTradePage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

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
    screenshot: ""
  });

  const [showCustomRR, setShowCustomRR] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Automatic session detection based on current UTC time
    const now = new Date();
    const hour = now.getUTCHours();

    let detectedSession = "Asian"; // Default
    if (hour >= 8 && hour < 13) detectedSession = "London";
    else if (hour >= 13 && hour < 21) detectedSession = "New York";
    else detectedSession = "Asian";

    setTrade(prev => ({ ...prev, session: detectedSession }));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle Risk-Reward Ratio selection
    if (name === "riskRewardRatio") {
      setShowCustomRR(value === "custom");
      setTrade({ ...trade, [name]: value });
    } else {
      setTrade({ ...trade, [name]: value });
    }
  };

  const handleScreenshotChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload to server
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

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!trade.pair) {
      alert("Please enter a trading pair");
      return;
    }

    // Transform trade data to match backend schema - convert strings to numbers
    const tradeData = {
      pair: trade.pair,
      type: trade.type.toUpperCase(),
      lotSize: trade.lotSize ? parseFloat(trade.lotSize) : undefined,
      entryPrice: trade.entryPrice ? parseFloat(trade.entryPrice) : undefined,
      exitPrice: trade.exitPrice ? parseFloat(trade.exitPrice) : undefined,
      stopLoss: trade.stopLoss ? parseFloat(trade.stopLoss) : undefined,
      takeProfit: trade.takeProfit ? parseFloat(trade.takeProfit) : undefined,
      profit: trade.profit ? parseFloat(trade.profit) : undefined,
      commission: trade.commission ? parseFloat(trade.commission) : undefined,
      swap: trade.swap ? parseFloat(trade.swap) : undefined,
      balance: trade.balance ? parseFloat(trade.balance) : undefined,
      session: trade.session || undefined,
      strategy: trade.strategy || undefined,
      notes: trade.notes || undefined,
      riskRewardRatio: trade.riskRewardRatio || undefined,
      riskRewardCustom: trade.riskRewardCustom || undefined,
      screenshot: trade.screenshot || undefined,
    };

    try {
      const result = await createTrade(tradeData);
      
      // Check if trade was created successfully
      if (result && result._id) {
        alert("Trade saved successfully!");
        router.push("/trades");
      } else {
        throw new Error(result?.message || "Failed to save trade");
      }
    } catch (err) {
      console.error("Save error:", err);
      alert(err.message || "Failed to save trade. Please try again.");
    }
  };

  return (
    <div className="p-10 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Add Trade Manually</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Pair</label>
            <input
              name="pair"
              placeholder="e.g. XAUUSD"
              className="border p-2 w-full rounded"
              onChange={handleChange}
              value={trade.pair}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <select
              name="type"
              className="border p-2 w-full rounded"
              onChange={handleChange}
              value={trade.type}
            >
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Lot Size</label>
            <input
              name="lotSize"
              placeholder="Lot Size"
              className="border p-2 w-full rounded"
              onChange={handleChange}
              value={trade.lotSize}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Entry Price</label>
            <input
              name="entryPrice"
              placeholder="Entry Price"
              className="border p-2 w-full rounded"
              onChange={handleChange}
              value={trade.entryPrice}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Exit Price</label>
            <input
              name="exitPrice"
              placeholder="Exit Price"
              className="border p-2 w-full rounded"
              onChange={handleChange}
              value={trade.exitPrice}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Stop Loss</label>
            <input
              name="stopLoss"
              placeholder="Stop Loss"
              className="border p-2 w-full rounded"
              onChange={handleChange}
              value={trade.stopLoss}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Take Profit</label>
            <input
              name="takeProfit"
              placeholder="Take Profit"
              className="border p-2 w-full rounded"
              onChange={handleChange}
              value={trade.takeProfit}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Profit</label>
            <input
              name="profit"
              placeholder="Profit"
              className="border p-2 w-full rounded"
              onChange={handleChange}
              value={trade.profit}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Commission</label>
            <input
              name="commission"
              placeholder="Commission"
              className="border p-2 w-full rounded"
              onChange={handleChange}
              value={trade.commission}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Swap</label>
            <input
              name="swap"
              placeholder="Swap"
              className="border p-2 w-full rounded"
              onChange={handleChange}
              value={trade.swap}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Balance</label>
            <input
              name="balance"
              placeholder="Account Balance"
              className="border p-2 w-full rounded"
              onChange={handleChange}
              value={trade.balance}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Session</label>
            <select
              name="session"
              className="border p-2 w-full rounded"
              onChange={handleChange}
              value={trade.session}
            >
              <option value="Asian">Asian</option>
              <option value="London">London</option>
              <option value="New York">New York</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Strategy</label>
            <input
              name="strategy"
              placeholder="Strategy"
              className="border p-2 w-full rounded"
              onChange={handleChange}
              value={trade.strategy}
            />
          </div>

          {/* Risk-Reward Ratio Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Risk : Reward Ratio</label>
            <select
              name="riskRewardRatio"
              className="border p-2 w-full rounded"
              onChange={handleChange}
              value={trade.riskRewardRatio}
            >
              <option value="">Select RR Ratio</option>
              <option value="1:1">1:1</option>
              <option value="1:2">1:2</option>
              <option value="1:3">1:3</option>
              <option value="1:4">1:4</option>
              <option value="1:5">1:5</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Custom Risk-Reward Input */}
          {showCustomRR && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Custom RR (e.g., 1:2.5)</label>
              <input
                name="riskRewardCustom"
                placeholder="e.g. 1:2.5"
                className="border p-2 w-full rounded"
                onChange={handleChange}
                value={trade.riskRewardCustom}
              />
            </div>
          )}
        </div>

        {/* Screenshot Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Trade Screenshot</label>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleScreenshotChange}
            className="hidden"
          />
          <div 
            onClick={triggerFileInput}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition"
          >
            {screenshotPreview ? (
              <div className="relative">
                <img 
                  src={screenshotPreview} 
                  alt="Screenshot preview" 
                  className="max-h-48 mx-auto rounded"
                />
                <p className="text-sm text-gray-500 mt-2">Click to change</p>
              </div>
            ) : (
              <div>
                <p className="text-gray-500">
                  {uploading ? "Uploading..." : "Click to upload screenshot"}
                </p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, JPEG supported</p>
              </div>
            )}
          </div>
          {trade.screenshot && !screenshotPreview && (
            <p className="text-sm text-green-600 mt-2">Screenshot uploaded successfully!</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            name="notes"
            placeholder="Notes"
            className="border p-2 w-full rounded h-24"
            onChange={handleChange}
            value={trade.notes}
          />
        </div>

        <button 
          className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 transition disabled:bg-gray-400"
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Save Trade"}
        </button>
      </form>
    </div>
  );
}
