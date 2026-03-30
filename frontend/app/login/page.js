"use client";

import { useState, useEffect, useRef } from "react";
import { googleLogin, loginUser } from "@/services/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GoogleLogin } from "@react-oauth/google";
import { Capacitor } from "@capacitor/core";

/* ─────────────────────────────────────────
   LIGHT THEME DESIGN TOKENS
   Base bg:      #F0EEE9  (warm parchment)
   Card:         #FFFFFF
   Header:       rgba(255,255,255,0.92)
   Bull:         #0D9E6E
   Bear:         #D63B3B
   Gold:         #B8860B
   Text primary: #0F1923
   Text muted:   #94A3B8
   Border:       #E2E8F0
───────────────────────────────────────── */

/* ─────────────────────────────────────────
   CANDLESTICK BACKGROUND (light, subtle)
───────────────────────────────────────── */
function CandlestickBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const draw = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const candles = [];
      const count = Math.floor(W / 30);
      let price = 200;
      for (let i = 0; i < count; i++) {
        const open  = price + (Math.random() - 0.5) * 20;
        const close = open  + (Math.random() - 0.5) * 28;
        const high  = Math.max(open, close) + Math.random() * 12;
        const low   = Math.min(open, close) - Math.random() * 12;
        price = close;
        candles.push({ open, close, high, low });
      }

      const all = candles.flatMap(c => [c.high, c.low]);
      const mx = Math.max(...all), mn = Math.min(...all), rng = mx - mn || 1;
      const toY = p => H * 0.1 + (H * 0.8 * (mx - p)) / rng;

      // Grid
      ctx.strokeStyle = "rgba(0,0,0,0.04)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 7; i++) {
        ctx.beginPath(); ctx.moveTo(0,(H/7)*i); ctx.lineTo(W,(H/7)*i); ctx.stroke();
      }

      candles.forEach((c, i) => {
        const x = i * 30 + 15, bull = c.close >= c.open;
        ctx.strokeStyle = bull ? "rgba(13,158,110,0.22)" : "rgba(214,59,59,0.18)";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, toY(c.high)); ctx.lineTo(x, toY(c.low)); ctx.stroke();
        ctx.fillStyle = bull ? "rgba(13,158,110,0.15)" : "rgba(214,59,59,0.12)";
        const bTop = toY(Math.max(c.open,c.close)), bBot = toY(Math.min(c.open,c.close));
        ctx.fillRect(x - 8, bTop, 16, Math.max(bBot - bTop, 1));
      });

      // MA line
      const ma = candles.map((_, i) => {
        const sl = candles.slice(Math.max(0,i-5),i+1);
        return sl.reduce((a,c) => a+c.close,0)/sl.length;
      });
      ctx.strokeStyle = "rgba(184,134,11,0.28)";
      ctx.lineWidth = 2; ctx.setLineDash([5,5]);
      ctx.beginPath();
      ma.forEach((p,i) => { const x=i*30+15, y=toY(p); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
      ctx.stroke(); ctx.setLineDash([]);
    };

    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, []);

  return (
    <canvas ref={canvasRef} style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:1 }}/>
  );
}

/* ─────────────────────────────────────────
   TICKER TAPE — dark strip for contrast
───────────────────────────────────────── */
const tickers = [
  {sym:"BTC",val:"+2.34%",bull:true},{sym:"ETH",val:"-1.12%",bull:false},
  {sym:"AAPL",val:"+0.87%",bull:true},{sym:"TSLA",val:"+4.20%",bull:true},
  {sym:"NVDA",val:"-0.55%",bull:false},{sym:"GOLD",val:"+0.62%",bull:true},
  {sym:"SPY",val:"+0.31%",bull:true},{sym:"OIL",val:"-2.18%",bull:false},
  {sym:"AMZN",val:"+1.05%",bull:true},{sym:"USD/JPY",val:"-0.33%",bull:false},
];
function TickerTape() {
  const items = [...tickers, ...tickers];
  return (
    <div style={{
      overflow:"hidden", background:"#0F1923",
      borderBottom:"3px solid #0D9E6E",
      padding:"7px 0", whiteSpace:"nowrap", position:"relative", zIndex:10,
    }}>
      <div style={{ display:"inline-flex", gap:"48px", animation:"ticker 32s linear infinite" }}>
        {items.map((t,i) => (
          <span key={i} style={{ fontSize:"11px", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.04em" }}>
            <span style={{ color:"#94A3B8", marginRight:6 }}>{t.sym}</span>
            <span style={{ color: t.bull ? "#22C78E" : "#F87171" }}>{t.bull?"▲":"▼"} {t.val}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   STATS PREVIEW (above the card)
───────────────────────────────────────── */
const previewStats = [
  { label:"TRADES LOGGED", val:"1,284", bull:true  },
  { label:"AVG WIN RATE",  val:"67.4%", bull:true  },
  { label:"AI INSIGHTS",   val:"3,910", bull:false },
];

/* ─────────────────────────────────────────
   MAIN LOGIN PAGE
───────────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter();
  const [form, setForm]         = useState({ email:"", password:"" });
  const [focused, setFocused]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [mounted, setMounted]   = useState(false);
  const [shake, setShake]       = useState(false);

  useEffect(() => { 
    setMounted(true); 
    // Check if user is already logged in
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await loginUser(form);
      if (data.token) {
        localStorage.setItem("token", data.token);
        router.push("/dashboard");
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 600);
        alert(data.message);
      }
    } catch (err) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      alert("Manual Login Error: " + (err.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (resp) => {
    if (!resp?.credential) {
      alert("Google login failed. Please try again.");
      return;
    }
    setGoogleLoading(true);
    try {
      const data = await googleLogin(resp.credential);
      if (data.token) {
        localStorage.setItem("token", data.token);
        router.push("/dashboard");
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 600);
        alert(data.message || "Google login failed.");
      }
    } catch {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      alert("Google login failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleNativeGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
      await GoogleAuth.initialize({
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        scopes: ["profile", "email"],
        grantOfflineAccess: true,
      });
      const googleUser = await GoogleAuth.signIn();
      const idToken = googleUser?.authentication?.idToken;
      if (!idToken) throw new Error("No ID token received");
      const data = await googleLogin(idToken);
      if (data.token) {
        localStorage.setItem("token", data.token);
        router.push("/dashboard");
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 600);
        alert(data.message || "Google login failed.");
      }
    } catch (err) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      alert("Native Google Error: " + (err.message || JSON.stringify(err)));
    } finally {
      setGoogleLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL || "no-url");
      alert("Connection test to " + process.env.NEXT_PUBLIC_API_URL + " : " + (res.ok ? "SUCCESS" : "FAILED (" + res.status + ")"));
    } catch (err) {
      alert("Connection test ERROR: " + err.message);
    }
  };

  const fields = [
    {
      name:"email", type:"email",
      label:"Email Address", placeholder:"your@email.com",
      icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
    },
    {
      name:"password", type: showPass ? "text" : "password",
      label:"Password", placeholder:"Enter your password",
      icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    },
  ];

  return (
    <div style={{
      minHeight:"100vh", background:"#F0EEE9",
      display:"flex", flexDirection:"column",
      fontFamily:"'Plus Jakarta Sans',sans-serif",
      color:"#0F1923", position:"relative", overflow:"hidden",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet"/>

      {/* BG canvas */}
      <div style={{ position:"fixed", inset:0, zIndex:0 }}>
        <CandlestickBackground/>
        {/* Warm overlay */}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg,rgba(240,238,233,0.78) 0%,rgba(240,238,233,0.72) 100%)" }}/>
        {/* Green glow top-left */}
        <div style={{ position:"absolute", top:-60, left:-60, width:320, height:320, borderRadius:"50%", background:"radial-gradient(circle,rgba(13,158,110,0.08) 0%,transparent 70%)" }}/>
        {/* Red glow bottom-right */}
        <div style={{ position:"absolute", bottom:-80, right:-50, width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle,rgba(214,59,59,0.06) 0%,transparent 70%)" }}/>
      </div>

      {/* ── HEADER ── */}
      <header style={{
        position:"relative", zIndex:20,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 24px", height:60,
        background:"rgba(255,255,255,0.92)", backdropFilter:"blur(20px)",
        borderBottom:"1px solid #E2E8F0",
        boxShadow:"0 1px 12px rgba(15,25,35,0.06)",
      }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width: 38, height: 38, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}><img src="/mainlogo.png" alt="LOGNERA" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
          <div>
            <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:15, fontWeight:800, letterSpacing:"0.04em", color:"#0F1923", lineHeight:1 }}>LOGNERA</div>
            <div style={{ fontSize:9, letterSpacing:"0.18em", color:"#0D9E6E", marginTop:1, fontFamily:"'JetBrains Mono',monospace", fontWeight:600 }}>AI JOURNAL</div>
          </div>
        </div>

        {/* AI chip */}
        <div style={{
          display:"flex", alignItems:"center", gap:6,
          background:"#ECFDF5", border:"1px solid #A7F3D0",
          borderRadius:20, padding:"5px 14px",
        }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:"#0D9E6E", animation:"blink 1.2s ease-in-out infinite" }}/>
          <span style={{ fontSize:10, letterSpacing:"0.1em", color:"#0D9E6E", fontWeight:600, fontFamily:"'JetBrains Mono',monospace" }}>
            AI ENGINE ACTIVE
          </span>
        </div>
      </header>

      <TickerTape/>

      {/* ── MAIN ── */}
      <main style={{
        flex:1, display:"flex", alignItems:"center", justifyContent:"center",
        position:"relative", zIndex:5, padding:"32px 20px",
      }}>
        <div style={{
          width:"100%", maxWidth:440,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition:"all 0.6s cubic-bezier(0.22,1,0.36,1)",
        }}>

          {/* Preview stats pills */}
          <div style={{ display:"flex", gap:10, marginBottom:20 }}>
            {previewStats.map((s,i) => (
              <div key={s.label} style={{
                flex:1, background:"rgba(255,255,255,0.7)",
                border:"1px solid #E2E8F0", borderRadius:8,
                padding:"10px 12px", textAlign:"center",
                backdropFilter:"blur(8px)",
                boxShadow:"0 1px 6px rgba(15,25,35,0.06)",
                animation:`fadeUp 0.5s ease ${i*0.07}s both`,
              }}>
                <div style={{ fontSize:8, color:"#94A3B8", letterSpacing:"0.1em", marginBottom:4, fontFamily:"'JetBrains Mono',monospace" }}>
                  {s.label}
                </div>
                <div style={{ fontSize:14, color: s.bull?"#0D9E6E":"#B8860B", fontWeight:700, fontFamily:"'JetBrains Mono',monospace" }}>
                  {s.val}
                </div>
              </div>
            ))}
          </div>

          {/* Card */}
          <div style={{
            background:"#FFFFFF", borderRadius:16, overflow:"hidden",
            border:"1px solid #E2E8F0",
            boxShadow:"0 8px 40px rgba(15,25,35,0.1), 0 2px 8px rgba(15,25,35,0.05)",
            animation: shake ? "shake 0.5s ease-in-out" : "none",
          }}>
            {/* Top accent */}
            <div style={{ height:3, background:"linear-gradient(90deg,#0D9E6E 0%,#0D9E6E55 40%,#D63B3B55 60%,#D63B3B 100%)" }}/>

            {/* Card header */}
            <div style={{ padding:"26px 28px 20px", borderBottom:"1px solid #F1F5F9" }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
                <div>
                  <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:24, fontWeight:800, color:"#0F1923", lineHeight:1.15, margin:0, marginBottom:6, letterSpacing:"-0.02em" }}>
                    Welcome back,<br/>
                    <span style={{ color:"#0D9E6E" }}>Trader</span>
                  </h2>
                  <p style={{ fontSize:11, color:"#94A3B8", margin:0, fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.06em" }}>
                    YOUR AI JOURNAL AWAITS
                  </p>
                </div>

                {/* Candle icon cluster */}
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ flexShrink:0, marginTop:2 }}>
                  <rect x="4"  y="14" width="8" height="14" fill="rgba(13,158,110,0.85)" rx="1"/>
                  <line x1="8"  y1="7"  x2="8"  y2="14" stroke="rgba(13,158,110,0.85)" strokeWidth="1.5"/>
                  <line x1="8"  y1="28" x2="8"  y2="36" stroke="rgba(13,158,110,0.85)" strokeWidth="1.5"/>
                  <rect x="17" y="10" width="8" height="10" fill="rgba(214,59,59,0.85)" rx="1"/>
                  <line x1="21" y1="3"  x2="21" y2="10" stroke="rgba(214,59,59,0.85)" strokeWidth="1.5"/>
                  <line x1="21" y1="20" x2="21" y2="28" stroke="rgba(214,59,59,0.85)" strokeWidth="1.5"/>
                  <rect x="30" y="12" width="8" height="16" fill="rgba(13,158,110,0.85)" rx="1"/>
                  <line x1="34" y1="5"  x2="34" y2="12" stroke="rgba(13,158,110,0.85)" strokeWidth="1.5"/>
                  <line x1="34" y1="28" x2="34" y2="38" stroke="rgba(13,158,110,0.85)" strokeWidth="1.5"/>
                  <circle cx="22" cy="41" r="2.5" fill="#0D9E6E" opacity="0.7"/>
                  <circle cx="22" cy="41" r="4.5" stroke="#0D9E6E" strokeWidth="0.8" opacity="0.25"/>
                </svg>
              </div>

              {/* Feature pills */}
              <div style={{ display:"flex", gap:6, marginTop:16, flexWrap:"wrap" }}>
                {[
                  { label:"Resume Journal", icon:"📓" },
                  { label:"AI Insights",    icon:"🤖" },
                  { label:"Trade History",  icon:"📊" },
                ].map(f => (
                  <div key={f.label} style={{
                    fontSize:10, color:"#0D9E6E", fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600,
                    background:"#ECFDF5", border:"1px solid #A7F3D0",
                    borderRadius:20, padding:"4px 10px", display:"flex", alignItems:"center", gap:5,
                  }}>
                    <span style={{ fontSize:11 }}>{f.icon}</span> {f.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ padding:"26px 28px" }}>
              {fields.map((field, idx) => (
                <div key={field.name} style={{
                  marginBottom:18,
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "translateX(0)" : "translateX(-10px)",
                  transition:`all 0.5s ${0.1 + idx*0.1}s`,
                }}>
                  <label style={{
                    display:"block", fontSize:11, fontWeight:600, marginBottom:7,
                    color: focused === field.name ? "#0D9E6E" : "#4A5568",
                    transition:"color 0.2s",
                    fontFamily:"'Plus Jakarta Sans',sans-serif",
                    letterSpacing:"0.01em",
                  }}>
                    {field.label}
                  </label>
                  <div style={{ position:"relative" }}>
                    {/* Left icon */}
                    <div style={{
                      position:"absolute", left:12, top:"50%", transform:"translateY(-50%)",
                      color: focused===field.name ? "#0D9E6E" : "#CBD5E1",
                      transition:"color 0.2s", pointerEvents:"none",
                    }}>
                      {field.icon}
                    </div>

                    <input
                      type={field.type}
                      name={field.name}
                      placeholder={field.placeholder}
                      value={form[field.name]}
                      onChange={handleChange}
                      onFocus={() => setFocused(field.name)}
                      onBlur={() => setFocused(null)}
                      style={{
                        width:"100%", boxSizing:"border-box",
                        background: focused===field.name ? "#F0FDF9" : "#F8FAFC",
                        border:`1.5px solid ${focused===field.name ? "#0D9E6E" : "#E2E8F0"}`,
                        borderRadius:8, padding:"12px 40px 12px 38px",
                        color:"#0F1923", fontSize:13,
                        fontFamily:"'JetBrains Mono',monospace",
                        outline:"none", transition:"all 0.2s",
                        boxShadow: focused===field.name ? "0 0 0 3px rgba(13,158,110,0.1)" : "none",
                      }}
                    />

                    {/* Password toggle */}
                    {field.name === "password" && (
                      <button type="button" onClick={() => setShowPass(p => !p)} style={{
                        position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                        background:"none", border:"none", cursor:"pointer", padding:0,
                        color: showPass ? "#0D9E6E" : "#CBD5E1", transition:"color 0.2s",
                      }}>
                        {showPass ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                          </svg>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        )}
                      </button>
                    )}

                    {/* Email tick */}
                    {field.name === "email" && form.email && (
                      <div style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0D9E6E" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Forgot password */}
              <div style={{ textAlign:"right", marginTop:-8, marginBottom:20 }}>
                <Link href="/forgot-password" style={{
                  fontSize:11, color:"#D63B3B", cursor:"pointer", fontWeight:600,
                  fontFamily:"'Plus Jakarta Sans',sans-serif",
                  borderBottom:"1px solid rgba(214,59,59,0.3)", paddingBottom:1,
                  textDecoration: "none"
                }}>
                  Forgot password?
                </Link>
              </div>

              {/* Divider */}
              <div style={{ height:1, background:"#F1F5F9", marginBottom:16 }}/>

              {/* Google */}
              <div style={{ marginBottom: 16 }}>
                {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
                  Capacitor.isNativePlatform() ? (
                    // Native Android: use the Capacitor Google Auth plugin
                    <button
                      type="button"
                      onClick={handleNativeGoogleSignIn}
                      disabled={googleLoading}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        padding: "11px 16px",
                        border: "1.5px solid #E2E8F0",
                        borderRadius: 8,
                        background: "#fff",
                        cursor: googleLoading ? "not-allowed" : "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#0F1923",
                        fontFamily: "'Plus Jakarta Sans',sans-serif",
                        opacity: googleLoading ? 0.7 : 1,
                        boxShadow: "0 1px 6px rgba(15,25,35,0.08)",
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.5 30.2 0 24 0 14.7 0 6.7 5.5 2.7 13.5l7.8 6C12.4 13.2 17.8 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.5 2.8-2.2 5.2-4.7 6.8l7.4 5.7c4.3-4 6.8-9.9 6.8-16.5z"/>
                        <path fill="#FBBC05" d="M10.5 28.5c-.5-1.5-.8-3-.8-4.5s.3-3 .8-4.5l-7.8-6C1 16.5 0 20.1 0 24s1 7.5 2.7 10.7l7.8-6.2z"/>
                        <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.4-5.7c-2.1 1.4-4.7 2.2-7.8 2.2-6.2 0-11.5-3.7-13.5-9l-7.8 6C6.7 42.5 14.7 48 24 48z"/>
                      </svg>
                      {googleLoading ? "Signing in..." : "Continue with Google"}
                    </button>
                  ) : (
                    // Web browser: use standard web Google Login component
                    <div
                      style={{
                        opacity: googleLoading ? 0.7 : 1,
                        pointerEvents: googleLoading ? "none" : "auto",
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => alert("Google login failed. Please try again.")}
                        useOneTap={false}
                        theme="outline"
                        size="large"
                        shape="rectangular"
                        width="380"
                      />
                    </div>
                  )
                ) : (
                  <div style={{
                    fontSize: 11,
                    color: "#94A3B8",
                    fontFamily: "'JetBrains Mono',monospace",
                    textAlign: "center",
                    padding: "10px 12px",
                    background: "#F8FAFC",
                    border: "1px dashed #E2E8F0",
                    borderRadius: 8,
                  }}>
                    Google login is not configured (missing <b>NEXT_PUBLIC_GOOGLE_CLIENT_ID</b>).
                  </div>
                )}
              </div>

              {/* Divider */}
              <div style={{ height:1, background:"#F1F5F9", marginBottom:20 }}/>

              {/* CTA Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width:"100%", padding:"13px 0",
                  background: loading
                    ? "#F0FDF9"
                    : "linear-gradient(135deg,#0D9E6E 0%,#22C78E 100%)",
                  border: loading ? "1.5px solid #A7F3D0" : "none",
                  borderRadius:8,
                  color: loading ? "#0D9E6E" : "#FFFFFF",
                  fontSize:12, fontFamily:"'JetBrains Mono',monospace", fontWeight:700,
                  letterSpacing:"0.15em", cursor: loading ? "not-allowed" : "pointer",
                  transition:"all 0.25s",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                  boxShadow: loading ? "none" : "0 4px 20px rgba(13,158,110,0.35), 0 1px 4px rgba(13,158,110,0.2)",
                  position:"relative", overflow:"hidden",
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.transform="translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; }}
              >
                {/* Shimmer */}
                {!loading && (
                  <div style={{
                    position:"absolute", inset:0,
                    background:"linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.18) 50%,transparent 60%)",
                    animation:"shimmer 2.5s linear infinite",
                  }}/>
                )}
                {loading ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation:"spin 0.8s linear infinite" }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    AUTHENTICATING...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                      <polyline points="10 17 15 12 10 7"/>
                      <line x1="15" y1="12" x2="3" y2="12"/>
                    </svg>
                    ACCESS JOURNAL
                  </>
                )}
              </button>

              <div style={{ textAlign:"center", marginTop:10 }}>
                <button type="button" onClick={testConnection} style={{ fontSize:10, color:"#94A3B8", background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>
                  Test Backend Connection
                </button>
              </div>

              {/* Register link */}
              <div style={{ textAlign:"center", marginTop:20, fontSize:12, color:"#94A3B8", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                New to LOGNERA?{" "}
                <span
                  style={{ color:"#0D9E6E", cursor:"pointer", fontWeight:700, borderBottom:"1px solid rgba(13,158,110,0.3)", paddingBottom:1 }}
                  onClick={() => router.push("/register")}
                >
                  Create account →
                </span>
              </div>
            </form>
          </div>

          {/* Footer row */}
          <div style={{ marginTop:18, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span style={{ fontSize:10, color:"#CBD5E1", letterSpacing:"0.06em", fontFamily:"'JetBrains Mono',monospace" }}>256-BIT ENCRYPTED</span>
            </div>
            <div style={{ display:"flex", gap:14 }}>
              {["FOREX","CRYPTO","STOCKS","FUTURES"].map(m => (
                <span key={m} style={{ fontSize:9, color:"#CBD5E1", letterSpacing:"0.1em", fontFamily:"'JetBrains Mono',monospace" }}>{m}</span>
              ))}
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes blink    { 0%,100%{opacity:1}      50%{opacity:0.2} }
        @keyframes spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes shimmer  { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
        @keyframes ticker   { 0%{transform:translateX(0)}    100%{transform:translateX(-50%)} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shake    {
          0%,100%{ transform:translateX(0) }
          20%    { transform:translateX(-6px) }
          40%    { transform:translateX(6px) }
          60%    { transform:translateX(-4px) }
          80%    { transform:translateX(4px) }
        }
        input::placeholder {
          color: #CBD5E1;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
        }
        * { box-sizing:border-box; margin:0; padding:0; }
      `}</style>
    </div>
  );
}
