"use client";

import { useState, useEffect } from "react";
import { createPaymentOrder, verifyPayment } from "@/services/api";

export default function PricingModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Load Razorpay Script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError("");

      // 1. Create Order on Backend
      const order = await createPaymentOrder();

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_SRnPs0KKtSxqJd", // Safe fallback for demo
        amount: order.amount,
        currency: order.currency,
        name: "StratEdge AI",
        description: "3 Months Premium Access",
        image: "/mainlogo.png",
        order_id: order.id,
        handler: async function (response) {
          try {
            // 2. Verify Payment on Backend
            const result = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (result.success) {
              onSuccess();
              onClose();
            }
          } catch (err) {
            setError("Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: localStorage.getItem("userName") || "",
          email: localStorage.getItem("userEmail") || "",
        },
        theme: {
          color: "#0D9E6E",
        },
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.on("payment.failed", function (response) {
        setError(response.error.description);
      });
      rzp1.open();
    } catch (err) {
      setError(err.message || "Failed to initialize payment");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(10, 15, 20, 0.7)", backdropFilter: "blur(12px)",
      padding: "20px",
    }}>
      <div style={{
        background: "rgba(255, 255, 255, 0.98)", 
        borderRadius: "32px", 
        width: "100%", 
        maxWidth: "480px",
        border: "1px solid rgba(226, 232, 240, 0.8)",
        boxShadow: "0 40px 100px -20px rgba(0,0,0,0.3)",
        position: "relative", 
        overflow: "hidden",
        animation: "modalFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
      }}>
        {/* Decorative Background Elements */}
        <div style={{ position: "absolute", top: -50, right: -50, width: 250, height: 250, background: "rgba(13,158,110,0.08)", borderRadius: "50%", filter: "blur(50px)" }} />
        <div style={{ position: "absolute", bottom: -50, left: -50, width: 200, height: 200, background: "rgba(184,134,11,0.05)", borderRadius: "50%", filter: "blur(40px)" }} />
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          style={{ 
            position: "absolute", top: 24, right: 24, background: "#F1F5F9", border: "none", 
            width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", 
            justifyContent: "center", cursor: "pointer", color: "#64748B", transition: "all 0.2s",
            zIndex: 10
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#E2E8F0"; e.currentTarget.style.color = "#0F1923"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#F1F5F9"; e.currentTarget.style.color = "#64748B"; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>

        <div style={{ padding: "48px 40px 40px", textAlign: "center", position: "relative" }}>
          {/* Badge */}
          <div style={{ 
            display: "inline-block", padding: "6px 14px", background: "rgba(13,158,110,0.1)", 
            color: "#0D9E6E", borderRadius: "99px", fontSize: "11px", fontWeight: "800", 
            letterSpacing: "0.05em", marginBottom: "20px", textTransform: "uppercase"
          }}>
            Recommended Plan
          </div>

          <h2 style={{ 
            fontSize: "32px", fontWeight: "800", color: "#0F1923", marginBottom: "12px", 
            letterSpacing: "-0.03em", fontFamily: "'Plus Jakarta Sans', sans-serif" 
          }}>
            Unlock Full Potential
          </h2>
          <p style={{ fontSize: "15px", color: "#64748B", lineHeight: "1.6", marginBottom: "32px", maxWidth: "90%", margin: "0 auto 32px" }}>
            Experience the full power of StratEdge AI with unlimited extractions and professional insights.
          </p>

          {/* Pricing Card Section */}
          <div style={{ 
            background: "linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)", 
            borderRadius: "24px", padding: "32px", border: "1px solid #E2E8F0", 
            marginBottom: "32px", textAlign: "left", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>3 MONTHS ACCESS</div>
                <div style={{ fontSize: "40px", fontWeight: "800", color: "#0F1923", letterSpacing: "-0.02em" }}>₹150</div>
              </div>
              <div style={{ fontSize: "14px", color: "#94A3B8", marginBottom: "8px", fontWeight: "500" }}>₹50 / Month</div>
            </div>
            
            <div style={{ height: "1px", background: "#E2E8F0", marginBottom: "24px" }} />

            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {[
                { text: "Unlimited AI Extractions", desc: "No limits on daily uploads" },
                { text: "Smart Error Recovery", desc: "AI-assisted correction" },
                { text: "Weekly Performance Recaps", desc: "Detailed behavioral analysis" },
                { text: "24/7 Priority Support", desc: "Fast response via community" }
              ].map((feature, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "16px" }}>
                  <div style={{ 
                    width: "20px", height: "20px", background: "#0D9E6E", borderRadius: "50%", 
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px"
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#1E293B" }}>{feature.text}</div>
                    <div style={{ fontSize: "12px", color: "#64748B" }}>{feature.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <div style={{ 
              color: "#D63B3B", fontSize: "13px", marginBottom: "20px", padding: "12px", 
              background: "#FEF2F2", borderRadius: "12px", border: "1px solid #FEE2E2", fontWeight: "600" 
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "8px", verticalAlign: "middle" }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {error}
            </div>
          )}

          <button 
            onClick={handlePayment}
            disabled={loading}
            style={{ 
              width: "100%", padding: "20px", 
              background: "linear-gradient(135deg, #0F1923 0%, #1e293b 100%)", 
              color: "#22C78E", border: "none", borderRadius: "16px", 
              fontSize: "16px", fontWeight: "800", cursor: "pointer", letterSpacing: "0.02em",
              boxShadow: "0 20px 40px -10px rgba(15,25,35,0.3)", transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
              position: "relative", overflow: "hidden"
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.02) translateY(-4px)"; e.currentTarget.style.boxShadow = "0 30px 60px -15px rgba(15,25,35,0.4)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1) translateY(0)"; e.currentTarget.style.boxShadow = "0 20px 40px -10px rgba(15,25,35,0.3)"; }}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                Processing...
              </span>
            ) : "GET UNLIMITED ACCESS"}
          </button>
          
          <div style={{ marginTop: "24px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            <span style={{ fontSize: "12px", color: "#94A3B8" }}>Secure SSL Encryption</span>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 480px) {
          div[style*="maxWidth: 480px"] {
            border-radius: 0 !important;
            height: 100% !important;
            max-width: 100% !important;
            padding: 20px !important;
          }
          h2 { fontSize: 26px !important; }
        }
      `}</style>
    </div>
  );
}
