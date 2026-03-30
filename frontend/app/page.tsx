"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Brain,
  LayoutDashboard,
  Target,
  Upload,
  Check,
  X,
  LineChart,
  History,
  AlertTriangle,
  FileSpreadsheet,
  Zap,
  Shield,
  Activity,
  ChevronDown,
  Eye,
  Lock,
  Flame,
  BarChart2,
  RefreshCw,
  BookOpen,
  Star,
} from "lucide-react";
import Link from "next/link";

/* ─── tiny helpers ───────────────────────────────────────────────────── */
const Reveal = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.75, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const Tag = ({ children, color = "emerald" }: { children: React.ReactNode; color?: "emerald" | "red" | "amber" }) => {
  const map = {
    emerald: "bg-[#00FFB2]/10 border-[#00FFB2]/25 text-[#00FFB2]",
    red: "bg-red-500/10 border-red-500/20 text-red-400",
    amber: "bg-amber-400/10 border-amber-400/20 text-amber-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest ${map[color]}`}
    >
      {children}
    </span>
  );
};

/* ─── main component ─────────────────────────────────────────────────── */
export default function EdgeciplineLanding() {
  const [mounted, setMounted] = useState(false);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.25], ["0%", "25%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.18], [1, 0]);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div
      className="min-h-screen bg-[#060910] text-[#E8EDF5] font-sans overflow-x-hidden"
      style={{ fontFamily: "'Sora', 'DM Sans', system-ui, sans-serif" }}
    >
      {/* ── Google Font injection (Sora + DM Mono) ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800;900&family=DM+Mono:ital,wght@0,300;0,500;1,300&display=swap');
        @keyframes pulse-slow { 0%,100%{opacity:.15} 50%{opacity:.3} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .animate-pulse-slow { animation: pulse-slow 6s ease-in-out infinite; }
        .animate-float { animation: float 5s ease-in-out infinite; }
        .text-shimmer {
          background: linear-gradient(90deg, #00FFB2, #00d4ff, #00FFB2);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 4s linear infinite;
        }
        .noise::after {
          content: '';
          position: fixed; inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
          opacity: .025; pointer-events: none; z-index: 9999;
        }
        .grid-lines {
          background-image:
            linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
          background-size: 60px 60px;
        }
        .ticker-wrap { overflow: hidden; }
        .ticker-inner { display: flex; animation: ticker 28s linear infinite; width: max-content; }
      `}</style>

      <div className="noise" />

      {/* ── ambient orbs ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-5%] w-[55%] h-[55%] rounded-full bg-[#00FFB2]/6 blur-[140px] animate-pulse-slow" />
        <div className="absolute top-[30%] right-[-10%] w-[45%] h-[45%] rounded-full bg-cyan-500/5 blur-[120px] animate-pulse-slow" style={{ animationDelay: "3s" }} />
        <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[40%] rounded-full bg-[#00FFB2]/4 blur-[160px] animate-pulse-slow" style={{ animationDelay: "5s" }} />
      </div>

      {/* ════════════════════ NAVBAR ════════════════════ */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/[0.06] bg-[#060910]/80 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between h-16 sm:h-20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00FFB2] to-[#00b87a] flex items-center justify-center shadow-[0_0_20px_rgba(0,255,178,.35)]">
              <TrendingUp size={18} className="text-[#060910]" strokeWidth={3} />
            </div>
            <span className="text-lg font-black tracking-tight text-white">
              Edge<span className="text-[#00FFB2]">cipline</span>
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/login" className="text-sm font-semibold text-gray-400 hover:text-white transition-colors hidden sm:block">
              Log in
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 rounded-full bg-[#00FFB2] text-[#060910] text-sm font-black hover:bg-white transition-all shadow-[0_0_24px_rgba(0,255,178,.3)] hover:shadow-[0_0_32px_rgba(0,255,178,.5)]"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10">

        {/* ════════════════════ HERO ════════════════════ */}
        <section ref={heroRef} className="min-h-screen flex flex-col items-center justify-center pt-24 pb-20 px-5 sm:px-8 text-center relative grid-lines overflow-hidden">
          <motion.div style={{ y: heroY, opacity: heroOpacity }} className="flex flex-col items-center w-full max-w-5xl mx-auto">

            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="mb-8"
            >
              <Tag color="emerald">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FFB2] opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00FFB2]" />
                </span>
                Built for traders who are serious about growth
              </Tag>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.05 }}
              className="text-gray-500 text-base sm:text-lg font-medium mb-5 max-w-2xl leading-relaxed"
            >
              Every trader starts the same way. Random wins. Brutal losses. No idea why.
              <br className="hidden sm:block" /> The market doesn't care about your intuition — it rewards data.
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl sm:text-7xl lg:text-[5.5rem] font-black tracking-[-0.03em] leading-[1.0] mb-6 text-white"
            >
              Your Edge Is Already
              <br />
              <span className="text-shimmer">In Your Data.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.22 }}
              className="text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto font-medium leading-relaxed"
            >
              Edgecipline turns your trade screenshots into ruthless self-awareness.
              Upload. Analyze. Evolve. No spreadsheets. No excuses.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link
                href="/register"
                className="group w-full sm:w-auto px-8 py-4 rounded-full bg-[#00FFB2] text-[#060910] text-base font-black hover:bg-white transition-all shadow-[0_0_40px_rgba(0,255,178,.35)] hover:shadow-[0_0_60px_rgba(0,255,178,.55)] flex items-center justify-center gap-2 relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Find My Edge <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/[0.04] text-white border border-white/10 text-base font-bold hover:bg-white/[0.08] transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
              >
                See Live Demo
              </Link>
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-10 flex items-center gap-3 text-sm text-gray-500 font-medium"
            >
              <div className="flex -space-x-2">
                {["#00FFB2","#00d4ff","#a78bfa","#f472b6"].map((c, i) => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-[#060910] flex items-center justify-center text-[10px] font-black text-[#060910]" style={{ background: c }}>
                    {["A","J","K","R"][i]}
                  </div>
                ))}
              </div>
              <span>Trusted by <strong className="text-white">2,400+</strong> traders</span>
            </motion.div>
          </motion.div>

          {/* Hero dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, y: 70 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-20 relative mx-auto max-w-5xl w-full rounded-2xl sm:rounded-[2rem] border border-white/[0.08] bg-[#0d1117]/90 backdrop-blur-2xl shadow-[0_60px_120px_rgba(0,0,0,.7),0_0_80px_rgba(0,255,178,.07)] overflow-hidden"
          >
            {/* macOS dots */}
            <div className="h-11 bg-white/[0.02] border-b border-white/[0.06] flex items-center px-5 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
              <div className="w-3 h-3 rounded-full bg-[#00FFB2]/70" />
              <div className="flex-1 mx-6 h-6 rounded-md bg-white/[0.04] flex items-center px-3 gap-2">
                <Lock size={10} className="text-gray-600" />
                <span className="text-gray-600 text-xs font-mono">app.edgecipline.com/dashboard</span>
              </div>
            </div>

            <div className="p-4 sm:p-7 grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Left column */}
              <div className="col-span-2 space-y-5">
                {/* PnL chart card */}
                <div className="h-52 rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-end opacity-80">
                    <svg viewBox="0 0 400 160" preserveAspectRatio="none" className="w-full h-full">
                      <defs>
                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00FFB2" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#00FFB2" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0,130 Q60,120 90,90 T160,100 T230,60 T310,40 T400,10 L400,160 L0,160Z" fill="url(#g1)" />
                      <path d="M0,130 Q60,120 90,90 T160,100 T230,60 T310,40 T400,10" fill="none" stroke="#00FFB2" strokeWidth="2.5" className="drop-shadow-[0_0_10px_rgba(0,255,178,.8)]" />
                      {/* dots */}
                      {[[90,90],[160,100],[230,60],[310,40],[400,10]].map(([x,y],i) => (
                        <circle key={i} cx={x} cy={y} r="3.5" fill="#00FFB2" className="drop-shadow-[0_0_6px_rgba(0,255,178,.9)]" />
                      ))}
                    </svg>
                  </div>
                  <div className="relative z-10 flex justify-between items-start">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Net P&L — This Month</p>
                      <p className="text-4xl font-black text-white tracking-tight">+$14,820</p>
                      <span className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00FFB2]/10 text-[#00FFB2] text-xs font-bold">
                        <TrendingUp size={11} strokeWidth={3} /> +18.4% vs last month
                      </span>
                    </div>
                    <div className="text-right text-xs text-gray-600 font-mono space-y-1">
                      <p>Max DD: <span className="text-red-400">-4.2%</span></p>
                      <p>Sharpe: <span className="text-[#00FFB2]">2.14</span></p>
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Win Rate", value: "71.3%", up: true },
                    { label: "Avg RR", value: "2.4R", up: true },
                    { label: "Trades", value: "148", up: null },
                  ].map((s, i) => (
                    <div key={i} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4">
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">{s.label}</p>
                      <p className="text-2xl font-black text-white">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right column */}
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 flex flex-col gap-3 overflow-hidden">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Recent Trades</p>
                {[
                  { pair: "XAUUSD", rr: "+3.2R", profit: "+$840", win: true },
                  { pair: "NQ1!", rr: "+1.8R", profit: "+$460", win: true },
                  { pair: "EURUSD", rr: "-1R", profit: "-$200", win: false },
                  { pair: "US30", rr: "+2.5R", profit: "+$620", win: true },
                  { pair: "GBPJPY", rr: "+4R", profit: "+$1,100", win: true },
                ].map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 rounded-xl hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black ${t.win ? "bg-[#00FFB2]/10 text-[#00FFB2]" : "bg-red-500/10 text-red-400"}`}>
                        {t.win ? <TrendingUp size={13} strokeWidth={3} /> : <TrendingDown size={13} strokeWidth={3} />}
                      </div>
                      <div>
                        <p className="font-bold text-white text-xs">{t.pair}</p>
                        <p className="text-gray-600 text-[10px] font-mono">{t.rr}</p>
                      </div>
                    </div>
                    <span className={`font-black text-xs ${t.win ? "text-[#00FFB2]" : "text-red-400"}`}>{t.profit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* bottom badge */}
            <div className="border-t border-white/[0.05] px-7 py-3 flex items-center justify-between text-xs text-gray-600 font-mono bg-white/[0.01]">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FFB2] animate-pulse" />
                AI Coach is analyzing your patterns…
              </span>
              <span>Edgecipline v2.0</span>
            </div>
          </motion.div>

          {/* scroll hint */}
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="mt-12 text-gray-700"
          >
            <ChevronDown size={22} />
          </motion.div>
        </section>

        {/* ════════════════════ STORY / THE PROBLEM ════════════════════ */}
        <section className="py-32 relative">
          <div className="absolute inset-0 bg-[#04060A]" />
          <div className="max-w-6xl mx-auto px-5 sm:px-8 relative z-10">

            <Reveal className="text-center mb-20">
              <Tag color="red">The Brutal Truth</Tag>
              <h2 className="mt-6 text-4xl sm:text-6xl font-black tracking-[-0.03em] leading-tight text-white">
                You don't have a strategy problem.
                <br />
                <span className="text-red-400">You have a self-awareness problem.</span>
              </h2>
              <p className="mt-6 text-xl text-gray-500 max-w-3xl mx-auto font-medium leading-relaxed">
                Every serious trader has been there. You follow the rules for three days, blow up on day four. You know what to do — but under pressure, you don't do it. Why?<br /><br />
                Because you've never seen your own patterns in cold, hard data.
              </p>
            </Reveal>

            {/* Story timeline */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
              {/* connector line */}
              <div className="hidden sm:block absolute top-[52px] left-[17%] right-[17%] h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />

              {[
                {
                  step: "01",
                  icon: <Star size={28} strokeWidth={1.5} />,
                  title: "The False Start",
                  desc: "You hit 5 wins in a row. You feel unstoppable. You double your lot size. Then reality shows up — and it's merciless.",
                  accent: "text-amber-400",
                  bg: "bg-amber-400/5 border-amber-400/15",
                },
                {
                  step: "02",
                  icon: <Flame size={28} strokeWidth={1.5} />,
                  title: "The Spiral",
                  desc: "You revenge trade. You overtrade on Mondays. You stop-out at the exact same level every week. You know it's happening — and you can't stop.",
                  accent: "text-red-400",
                  bg: "bg-red-500/5 border-red-500/15",
                },
                {
                  step: "03",
                  icon: <Eye size={28} strokeWidth={1.5} />,
                  title: "The Realization",
                  desc: "The traders who make it consistently don't have better strategies. They know themselves. Every bias, every pattern, every leak — documented and destroyed.",
                  accent: "text-[#00FFB2]",
                  bg: "bg-[#00FFB2]/5 border-[#00FFB2]/15",
                },
              ].map((s, i) => (
                <Reveal key={i} delay={i * 0.12}>
                  <div className={`p-8 rounded-[1.75rem] border ${s.bg} h-full flex flex-col`}>
                    <div className={`w-14 h-14 rounded-2xl ${s.bg} border ${s.bg} flex items-center justify-center mb-6 ${s.accent}`}>
                      {s.icon}
                    </div>
                    <p className={`text-xs font-black uppercase tracking-widest mb-2 ${s.accent} font-mono`}>{s.step}</p>
                    <h3 className="text-xl font-black text-white mb-3">{s.title}</h3>
                    <p className="text-gray-500 font-medium leading-relaxed flex-1">{s.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* Problem deep-dive */}
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: <FileSpreadsheet size={30} strokeWidth={1.5} />,
                  title: "Spreadsheets Are a Lie",
                  desc: "You spend 20 minutes updating formulas after an exhausting session. Then you stop. The data gaps kill any meaningful analysis.",
                },
                {
                  icon: <RefreshCw size={30} strokeWidth={1.5} />,
                  title: "Patterns Stay Hidden",
                  desc: "You revenge-trade every Thursday. Your Friday afternoon win rate is 28%. You have no idea. The proof is there — you just can't see it yet.",
                },
                {
                  icon: <Brain size={30} strokeWidth={1.5} />,
                  title: "Gut Feel Is Your Enemy",
                  desc: "Your Breakout setup feels profitable. But data shows Mean Reversion returns 3x more per trade. You've been betting on the wrong horse.",
                },
              ].map((p, i) => (
                <Reveal key={i} delay={i * 0.1}>
                  <div className="p-7 rounded-[1.75rem] bg-white/[0.018] border border-white/[0.07] hover:border-red-500/30 hover:bg-red-500/[0.04] transition-all group">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                      {p.icon}
                    </div>
                    <h3 className="text-lg font-black text-white mb-3">{p.title}</h3>
                    <p className="text-gray-500 font-medium leading-relaxed text-sm">{p.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════ TICKER ════════════════════ */}
        <div className="py-6 border-y border-white/[0.06] bg-white/[0.01] ticker-wrap overflow-hidden">
          <div className="ticker-inner">
            {[...Array(2)].map((_, outer) => (
              <div key={outer} className="flex items-center gap-12 pr-12">
                {[
                  "Discipline creates edge",
                  "Your data is your edge",
                  "Stop guessing",
                  "Know your patterns",
                  "Trade with clarity",
                  "Self-awareness = profit",
                  "AI-powered insights",
                  "Zero manual entry",
                ].map((t, i) => (
                  <span key={i} className="flex items-center gap-3 text-sm font-bold text-gray-600 whitespace-nowrap uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00FFB2]/50" />
                    {t}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ════════════════════ INTRODUCING EDGECIPLINE ════════════════════ */}
        <section className="py-32 relative">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <Reveal className="text-center mb-20">
              <Tag color="emerald">The Solution</Tag>
              <h2 className="mt-6 text-4xl sm:text-6xl font-black tracking-[-0.03em] leading-tight text-white">
                Introducing
                <span className="text-shimmer"> Edgecipline.</span>
              </h2>
              <p className="mt-5 text-xl text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed">
                Not another journal. Not another analytics tool. A self-awareness engine built for traders who are done guessing and ready to trade with data-backed precision.
              </p>
            </Reveal>

            {/* HOW IT WORKS — 3 steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
              <div className="hidden md:block absolute top-14 left-[22%] right-[22%] h-px border-t border-dashed border-[#00FFB2]/20" />

              {[
                {
                  n: "01",
                  icon: <Upload size={36} strokeWidth={1} />,
                  title: "Screenshot. Done.",
                  desc: "Took a trade? Screenshot it. That's literally all you do. MetaTrader, TradingView, any platform — our AI handles the rest.",
                  accent: "border-[#00FFB2]/40 shadow-[0_0_40px_rgba(0,255,178,.15)]",
                  num_bg: "bg-[#00FFB2] text-[#060910]",
                },
                {
                  n: "02",
                  icon: <Zap size={36} strokeWidth={1.5} />,
                  title: "AI Reads Everything.",
                  desc: "In under 2 seconds, our specialized vision AI extracts pair, direction, entry, exit, P&L, lot size, time of day — every data point, automatically.",
                  accent: "border-[#00FFB2] shadow-[0_0_60px_rgba(0,255,178,.25)]",
                  num_bg: "bg-[#00FFB2] text-[#060910]",
                  highlight: true,
                },
                {
                  n: "03",
                  icon: <Target size={36} strokeWidth={1} />,
                  title: "Clarity Replaces Chaos.",
                  desc: "Your dashboard updates instantly. Your edge reveals itself. Your patterns become undeniable. Your next trade becomes smarter.",
                  accent: "border-[#00FFB2]/40 shadow-[0_0_40px_rgba(0,255,178,.15)]",
                  num_bg: "bg-[#00FFB2] text-[#060910]",
                },
              ].map((s, i) => (
                <Reveal key={i} delay={i * 0.15} className="flex flex-col items-center text-center">
                  <div className={`relative w-24 h-24 rounded-[1.75rem] ${s.highlight ? "bg-[#0d1a14] border-2" : "bg-[#0d1117] border"} ${s.accent} flex items-center justify-center mb-8`}>
                    <span className="text-[#00FFB2]">{s.icon}</span>
                    <div className={`absolute -right-4 -top-4 w-9 h-9 rounded-full ${s.num_bg} font-black flex items-center justify-center text-sm border-4 border-[#060910]`}>
                      {s.n.slice(1)}
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-white mb-3">{s.title}</h3>
                  <p className="text-gray-500 font-medium leading-relaxed text-sm max-w-[260px]">{s.desc}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════ PHILOSOPHY SECTION ════════════════════ */}
        <section className="py-32 relative">
          <div className="absolute inset-0 bg-[#04060A]" />
          <div className="max-w-5xl mx-auto px-5 sm:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <Reveal>
                <Tag color="amber">The Philosophy</Tag>
                <h2 className="mt-6 text-4xl sm:text-5xl font-black tracking-[-0.03em] text-white leading-tight">
                  Trading is not a<br />math problem.
                  <br />
                  <span className="text-amber-400">It's a mirror.</span>
                </h2>
                <p className="mt-6 text-gray-400 font-medium leading-relaxed text-lg">
                  Edgecipline was built on one core belief: <strong className="text-white">discipline creates edge.</strong> Not better indicators. Not secret strategies. The traders who win long-term are the ones who study themselves as relentlessly as they study the charts.
                </p>
                <p className="mt-4 text-gray-500 font-medium leading-relaxed">
                  We built this out of frustration. After years of journaling in spreadsheets, writing in notebooks, and watching patterns repeat — we realized the data was always there. We just had no system to see it clearly.
                </p>
                <p className="mt-4 text-gray-500 font-medium leading-relaxed">
                  Edgecipline is that system.
                </p>
              </Reveal>

              {/* Pillars */}
              <div className="space-y-4">
                {[
                  {
                    icon: <Brain size={22} />,
                    title: "Self-Awareness > Strategy",
                    desc: "Knowing when you trade poorly is more valuable than any setup. We make your blindspots visible.",
                  },
                  {
                    icon: <BarChart2 size={22} />,
                    title: "Data Reveals Truth",
                    desc: "Feelings lie. Numbers don't. Every trade logged is a data point that sharpens your edge.",
                  },
                  {
                    icon: <Shield size={22} />,
                    title: "Consistency Compounds",
                    desc: "A small, consistent edge executed with discipline beats a great strategy traded emotionally.",
                  },
                  {
                    icon: <Activity size={22} />,
                    title: "Feedback Loops Drive Growth",
                    desc: "Without structured review, you're doomed to repeat the same mistakes in bigger size.",
                  },
                ].map((p, i) => (
                  <Reveal key={i} delay={i * 0.1}>
                    <div className="flex gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-amber-400/25 hover:bg-amber-400/[0.03] transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        {p.icon}
                      </div>
                      <div>
                        <h4 className="font-black text-white text-sm mb-1">{p.title}</h4>
                        <p className="text-gray-500 text-sm font-medium leading-relaxed">{p.desc}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════ FEATURES ════════════════════ */}
        <section className="py-32 relative">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <Reveal className="text-center mb-20">
              <Tag color="emerald">What's Inside</Tag>
              <h2 className="mt-6 text-4xl sm:text-6xl font-black tracking-[-0.03em] text-white">
                Every tool you need.<br />
                <span className="text-[#00FFB2]">Nothing you don't.</span>
              </h2>
              <p className="mt-5 text-lg text-gray-500 max-w-2xl mx-auto font-medium">
                Features built around one goal: making you a more self-aware, more consistent, more profitable trader.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  icon: <Upload size={22} />,
                  title: "Never log a trade manually again",
                  desc: "Screenshot → uploaded → extracted. The entire data entry process is gone. Permanently.",
                  badge: "Core",
                },
                {
                  icon: <Brain size={22} />,
                  title: "Your AI trading coach, always on",
                  desc: "Weekly performance breakdowns written in plain language. Personalized to your patterns, not generic advice.",
                  badge: "AI",
                },
                {
                  icon: <Eye size={22} />,
                  title: "See which setups actually make you money",
                  desc: "Rank your strategies by RR, win rate, and frequency. Stop trading your ego's favorite setups.",
                  badge: "Analytics",
                },
                {
                  icon: <Activity size={22} />,
                  title: "Live performance dashboard",
                  desc: "Real-time equity curve, win rate, profit factor, and streak tracking — all updating as you trade.",
                  badge: "Core",
                },
                {
                  icon: <Shield size={22} />,
                  title: "Catch your emotional leaks",
                  desc: "Track your mental state per trade and watch the correlation. Angry trades cost you more than you think.",
                  badge: "Psychology",
                },
                {
                  icon: <Lock size={22} />,
                  title: "Your trade history, forever",
                  desc: "Every trade, every screenshot, every insight — stored securely in the cloud. Your edge is an asset worth protecting.",
                  badge: "Security",
                },
              ].map((f, i) => (
                <Reveal key={i} delay={i * 0.05}>
                  <div className="p-7 rounded-[1.75rem] bg-white/[0.018] border border-white/[0.06] hover:border-[#00FFB2]/30 hover:bg-[#00FFB2]/[0.03] transition-all group h-full relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#00FFB2]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute top-4 right-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-700 bg-white/[0.03] border border-white/[0.06] px-2 py-1 rounded-full">
                        {f.badge}
                      </span>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-[#00FFB2]/8 text-[#00FFB2] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform border border-[#00FFB2]/15">
                      {f.icon}
                    </div>
                    <h3 className="font-black text-white text-base mb-3 pr-10 leading-snug">{f.title}</h3>
                    <p className="text-gray-500 font-medium leading-relaxed text-sm">{f.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* Differentiation callout */}
            <Reveal className="mt-16">
              <div className="p-8 sm:p-12 rounded-[2rem] bg-gradient-to-br from-[#00FFB2]/8 to-[#00d4ff]/4 border border-[#00FFB2]/20 text-center">
                <p className="text-xs font-black uppercase tracking-widest text-[#00FFB2] mb-4">The Real Difference</p>
                <h3 className="text-3xl sm:text-4xl font-black text-white mb-5 tracking-tight">
                  Edgecipline isn't a journal. It's a mirror.
                </h3>
                <p className="text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed text-lg">
                  Excel tracks your trades. Analytics tools show you charts. But Edgecipline reveals <em className="text-white not-italic font-bold">you</em> — your habits, your biases, your most destructive patterns, and your most profitable moments. That self-knowledge compounds into edge.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ════════════════════ PRICING ════════════════════ */}
        <section className="py-32 bg-[#04060A] border-t border-white/[0.05]">
          <div className="max-w-4xl mx-auto px-5 sm:px-8">
            <Reveal className="text-center mb-20">
              <Tag color="emerald">Pricing</Tag>
              <h2 className="mt-6 text-4xl sm:text-5xl font-black tracking-[-0.03em] text-white">
                Less than a losing trade.
              </h2>
              <p className="mt-4 text-lg text-gray-500 font-medium">
                The cost of not knowing your patterns is far higher.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
              {/* Free */}
              <Reveal>
                <div className="p-9 rounded-[2rem] bg-white/[0.025] border border-white/[0.08] flex flex-col h-full hover:border-white/20 transition-colors">
                  <h3 className="text-xl font-black text-white mb-1">Explorer</h3>
                  <p className="text-gray-500 font-medium mb-6 text-sm">Dip your toes in. No card required.</p>
                  <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-5xl font-black text-white tracking-tight">₹0</span>
                    <span className="text-gray-500 font-medium">/forever</span>
                  </div>
                  <ul className="space-y-4 mb-10 flex-1">
                    {[
                      { t: "10 manual trade entries", ok: true },
                      { t: "Basic P&L dashboard", ok: true },
                      { t: "Screenshot extraction", ok: false },
                      { t: "AI Coach insights", ok: false },
                      { t: "Psychology tracking", ok: false },
                    ].map((item, i) => (
                      <li key={i} className={`flex items-center gap-3 text-sm font-medium ${item.ok ? "text-gray-300" : "text-gray-700"}`}>
                        {item.ok
                          ? <Check size={16} className="text-[#00FFB2] shrink-0" strokeWidth={3} />
                          : <X size={16} className="shrink-0" strokeWidth={2} />
                        }
                        {item.t}
                      </li>
                    ))}
                  </ul>
                  <Link href="/register" className="w-full py-3.5 rounded-full border border-white/10 text-white font-bold text-center hover:bg-white/5 transition-colors text-sm">
                    Get Started Free
                  </Link>
                </div>
              </Reveal>

              {/* Pro */}
              <Reveal delay={0.1}>
                <div className="p-9 rounded-[2rem] bg-[#051210] border border-[#00FFB2]/35 flex flex-col h-full relative overflow-hidden shadow-[0_40px_80px_rgba(0,255,178,.15)]">
                  <div className="absolute top-0 right-0 w-72 h-72 bg-[#00FFB2]/8 rounded-full blur-[80px] pointer-events-none" />
                  <div className="absolute top-0 right-8 py-1.5 px-4 bg-[#00FFB2] text-[#060910] text-[10px] font-black rounded-b-xl uppercase tracking-widest shadow-lg">
                    Most Popular
                  </div>
                  <h3 className="text-xl font-black text-white mb-1">Professional</h3>
                  <p className="text-gray-500 font-medium mb-6 text-sm">The full self-awareness system.</p>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-5xl font-black text-white tracking-tight">₹150</span>
                    <span className="text-[#00FFB2] font-bold">/ 3 months</span>
                  </div>
                  <p className="text-gray-600 text-xs font-mono mb-8">~₹1.65 per day. Less than one bad trade.</p>
                  <ul className="space-y-4 mb-10 flex-1">
                    {[
                      "Unlimited trade journals",
                      "AI screenshot extraction",
                      "Weekly AI Coach report",
                      "Setup & psychology analytics",
                      "Emotion-per-trade tracking",
                      "Priority support",
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-medium text-gray-300">
                        <Check size={16} className="text-[#00FFB2] shrink-0" strokeWidth={3} />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link href="/register" className="w-full py-3.5 rounded-full bg-[#00FFB2] text-[#060910] font-black text-center hover:bg-white transition-all shadow-[0_0_30px_rgba(0,255,178,.3)] text-sm">
                    Start Building My Edge
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ════════════════════ FINAL CTA ════════════════════ */}
        <section className="py-40 relative overflow-hidden">
          <div className="absolute inset-0 bg-[#060910]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[#00FFB2] blur-[200px] opacity-[0.07] pointer-events-none" />
          <div className="absolute inset-0 grid-lines opacity-50" />

          <div className="max-w-4xl mx-auto px-5 sm:px-8 text-center relative z-10">
            <Reveal>
              <p className="text-gray-600 font-mono text-sm uppercase tracking-widest mb-6">The choice is yours</p>
              <h2 className="text-5xl sm:text-7xl font-black tracking-[-0.04em] leading-tight text-white mb-8">
                Keep guessing.
                <br />
                <span className="text-shimmer">Or start knowing.</span>
              </h2>
              <p className="text-xl text-gray-500 mb-12 max-w-xl mx-auto font-medium leading-relaxed">
                The traders who study themselves win. Every consistent performer has a feedback loop. Edgecipline is yours.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  href="/register"
                  className="group px-10 py-5 rounded-full bg-[#00FFB2] text-[#060910] text-lg font-black hover:bg-white transition-all duration-300 shadow-[0_0_60px_rgba(0,255,178,.4)] hover:shadow-[0_0_80px_rgba(0,255,178,.6)] hover:scale-105 flex items-center gap-3"
                >
                  Build My Edge — It's Free
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <p className="mt-6 text-gray-700 text-sm font-medium">
                No credit card. No spreadsheets. No excuses.
              </p>
            </Reveal>
          </div>
        </section>

      </main>

      {/* ════════════════════ FOOTER ════════════════════ */}
      <footer className="bg-[#04060A] border-t border-white/[0.05] py-14 relative z-10">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00FFB2] to-[#00b87a] flex items-center justify-center shadow-[0_0_16px_rgba(0,255,178,.3)]">
                <TrendingUp size={16} className="text-[#060910]" strokeWidth={3} />
              </div>
              <span className="text-lg font-black tracking-tight text-white">
                Edge<span className="text-[#00FFB2]">cipline</span>
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-8 text-sm font-semibold text-gray-600">
              {["Terms of Service", "Privacy Policy", "Refund Policy", "Contact"].map((t) => (
                <Link key={t} href="#" className="hover:text-[#00FFB2] transition-colors">{t}</Link>
              ))}
            </div>
          </div>
          <div className="pt-8 border-t border-white/[0.04] flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-700 font-medium">
            <span>© 2026 Edgecipline Technologies. All rights reserved.</span>
            <span>Past performance ≠ future results. Trading carries inherent risk.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}