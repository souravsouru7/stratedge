"use client";

/**
 * WelcomeGuide
 * First-visit modal that introduces the platform to new users.
 */
export default function WelcomeGuide({ onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(15,25,35,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#FFFFFF", width: "100%", maxWidth: 550, borderRadius: 24, padding: 40, border: "1px solid #E2E8F0", position: "relative", boxShadow: "0 20px 50px rgba(0,0,0,0.3)", animation: "fadeUpNormal 0.6s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🚀</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0F1923", marginBottom: 8 }}>Welcome to Edgecipline AI</h2>
          <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6 }}>Your premium trading companion for performance analysis.</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24, marginBottom: 40 }}>
          {[
            { icon: "📊", bg: "#F0FDF4", title: "Forex & Global Markets", desc: "Extract trades from MT4/MT5 screenshots using AI or log them manually for deep performance metrics." },
            { icon: "🇮🇳", bg: "#FFF7ED", title: "Indian Market Ready",   desc: "Seamlessly analyze NSE/BSE trades from Zerodha, Groww & more with our specialized AI extraction." },
            { icon: "🤖", bg: "#EFF6FF", title: "AI-Driven Insights",     desc: "Get weekly reports, optimal trading window suggestions, and risk analysis to improve your edge." },
          ].map(item => (
            <div key={item.title} style={{ display: "flex", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: item.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{item.icon}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0F1923" }}>{item.title}</div>
                <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={onClose}
          style={{ width: "100%", padding: "18px", background: "linear-gradient(135deg, #0F1923 0%, #1a2d3d 100%)", color: "#22C78E", border: "1px solid rgba(34,199,142,0.3)", borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: "pointer", letterSpacing: "0.08em", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", transition: "all 0.2s" }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
        >
          START JOURNALING →
        </button>
        <style>{`@keyframes fadeUpNormal { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }`}</style>
      </div>
    </div>
  );
}
