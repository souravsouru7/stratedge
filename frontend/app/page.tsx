"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  TrendingUp, 
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
  Layers,
  Activity,
  ArrowDownRight,
  TrendingDown
} from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, [router]);

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1515] text-[#0F172A] dark:text-[#F8FAFC] font-sans selection:bg-[#1FBF8F]/30 selection:text-inherit">
      
      {/* Premium Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] sm:top-[-20%] left-[-10%] w-[40%] sm:w-[50%] h-[40%] sm:h-[60%] rounded-full bg-emerald-500/10 blur-[100px] mix-blend-multiply dark:mix-blend-screen opacity-50 dark:opacity-20 animate-pulse-slow"></div>
        <div className="absolute top-[20%] right-[-10%] w-[30%] sm:w-[40%] h-[40%] sm:h-[50%] rounded-full bg-teal-500/10 blur-[100px] mix-blend-multiply dark:mix-blend-screen opacity-50 dark:opacity-20"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[40%] sm:w-[60%] h-[40%] sm:h-[50%] rounded-full bg-emerald-400/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-40 dark:opacity-10"></div>
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] dark:opacity-[0.04] mix-blend-overlay"></div>
      </div>

      {/* NAVBAR */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 dark:bg-[#0B1515]/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#1FBF8F] to-[#149f75] flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <TrendingUp size={18} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="text-xl font-extrabold tracking-tight">StratEdge</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/login" className="text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-[#1FBF8F] dark:hover:text-[#1FBF8F] transition-colors">
                Log in
              </Link>
              <Link href="/register" className="hidden sm:inline-flex px-5 py-2.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-black text-sm font-bold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shrink-0">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-32 sm:pt-40">
        
        {/* 1. HERO SECTION */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-bold mb-8 uppercase tracking-wider"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            The Future of Trading Journals
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl sm:text-6xl lg:text-8xl font-black tracking-tighter mb-6 leading-[1.05]"
          >
            Stop Guessing.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1FBF8F] via-[#2DD4BF] to-[#1FBF8F] bg-[length:200%_auto] animate-gradient">
              Find Your Edge.
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-3xl mx-auto font-medium leading-relaxed"
          >
            Manual journals are dead. Upload a screenshot of your trade and let StratEdge's AI instantly extract, analyze, and tell you exactly which setups make you profitable.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link href="/register" className="group w-full sm:w-auto px-8 py-4 rounded-full bg-[#1FBF8F] text-white text-base font-bold hover:bg-[#189e75] transition-all shadow-[0_0_40px_rgba(31,191,143,0.3)] hover:shadow-[0_0_60px_rgba(31,191,143,0.5)] flex items-center justify-center gap-2 relative overflow-hidden">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
              <span className="relative z-10 flex items-center gap-2">Start for Free <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></span>
            </Link>
            <Link href="/login" className="w-full sm:w-auto px-8 py-4 rounded-full bg-white dark:bg-white/5 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 text-base font-bold hover:bg-gray-50 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2 backdrop-blur-sm">
              View Demo
            </Link>
          </motion.div>

          {/* Hero Visual */}
          <motion.div 
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-20 relative mx-auto max-w-5xl rounded-2xl sm:rounded-3xl border border-gray-200/80 dark:border-white/10 bg-white/50 dark:bg-[#111C1C]/80 backdrop-blur-2xl shadow-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/5"
          >
            {/* macOS styled window header */}
            <div className="h-12 bg-gray-100/50 dark:bg-white/5 border-b border-gray-200/50 dark:border-white/5 flex items-center px-4 gap-2 backdrop-blur-md">
              <div className="w-3 h-3 rounded-full bg-[#E45858] shadow-sm"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-sm"></div>
              <div className="w-3 h-3 rounded-full bg-[#1FBF8F] shadow-sm"></div>
            </div>
            <div className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1 md:col-span-2 space-y-6">
                <div className="h-56 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 p-6 relative overflow-hidden shadow-sm">
                  <div className="absolute inset-0 flex items-end opacity-60 dark:opacity-100">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full stroke-[#1FBF8F] fill-[#1FBF8F]/10 stroke-[2px]">
                      <path d="M0,100 L0,80 Q15,85 25,60 T50,70 T75,40 T100,20 L100,100 Z" stroke="none" />
                      <path d="M0,80 Q15,85 25,60 T50,70 T75,40 T100,20" fill="none" className="drop-shadow-[0_0_8px_rgba(31,191,143,0.8)]" />
                    </svg>
                  </div>
                  <div className="relative z-10 flex flex-col justify-between h-full">
                    <div>
                      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Net Profit</p>
                      <p className="text-4xl font-black text-gray-900 dark:text-white mt-1">+$12,450.00</p>
                    </div>
                    <div className="flex gap-2">
                       <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">+14.2% this week</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-28 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 p-5 shadow-sm flex flex-col justify-center">
                     <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Win Rate</p>
                     <p className="text-3xl font-bold mt-1">72.5%</p>
                  </div>
                  <div className="h-28 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 p-5 shadow-sm flex flex-col justify-center">
                     <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Profit Factor</p>
                     <p className="text-3xl font-bold mt-1">2.8</p>
                  </div>
                </div>
              </div>
              <div className="col-span-1 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 p-5 shadow-sm flex flex-col gap-4">
                 <p className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Recent Trades</p>
                 <div className="flex flex-col gap-3">
                   {[
                     { pair: 'XAUUSD', profit: '+$450.00', win: true },
                     { pair: 'EURUSD', profit: '+$120.00', win: true },
                     { pair: 'GBPUSD', profit: '-$80.00', win: false },
                     { pair: 'US30', profit: '+$890.00', win: true },
                   ].map((trade, i) => (
                     <div key={i} className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                       <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${trade.win ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                           {trade.win ? <TrendingUp size={16} strokeWidth={3}/> : <TrendingDown size={16} strokeWidth={3}/>}
                         </div>
                         <span className="font-bold">{trade.pair}</span>
                       </div>
                       <span className={`font-extrabold ${trade.win ? 'text-emerald-500' : 'text-red-500'}`}>
                         {trade.profit}
                       </span>
                     </div>
                   ))}
                 </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* 2. THE PROBLEM (STARK CONTRAST SECTION) */}
        <section className="py-32 relative mt-20">
          <div className="absolute inset-0 bg-[#0F172A] dark:bg-[#070B14] skew-y-[-3deg] origin-bottom-left -z-10 shadow-inner"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white relative z-10 pt-16 pb-24">
            <div className="text-center mb-16 sm:mb-24">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="inline-block px-4 py-1.5 rounded-full bg-[#E45858]/10 border border-[#E45858]/20 text-[#E45858] text-sm font-bold mb-6 uppercase tracking-wider"
              >
                The Grim Reality
              </motion.div>
              <h2 className="text-4xl sm:text-6xl font-black mb-8 tracking-tight">
                90% of traders fail because <br className="hidden sm:block"/>
                <span className="text-[#E45858] relative">
                  they don't know their own data.
                  <svg className="absolute w-full h-4 -bottom-2 left-0 text-[#E45858] opacity-50" viewBox="0 0 100 20" preserveAspectRatio="none">
                    <path d="M0 10 Q 50 20 100 10" fill="transparent" stroke="currentColor" strokeWidth="4" />
                  </svg>
                </span>
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed">
                If you are relying on sticky notes, memory, or broken Excel sheets to track your wins and losses, you hold no edge over the market. You are flying blind.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                 { icon: <FileSpreadsheet size={32} strokeWidth={1.5}/>, title: "Spreadsheets Suck", desc: "You forget to log trades, mess up formulas, and dread entering data after a long session." },
                 { icon: <AlertTriangle size={32} strokeWidth={1.5}/>, title: "Emotional Blindspots", desc: "You revenge trade on Fridays and bleed profit, but you have no hard data to prove the pattern." },
                 { icon: <Brain size={32} strokeWidth={1.5}/>, title: "Guessing Strategies", desc: "You think your Breakout strategy works, but in reality, your Mean Reversion setup is paying the bills." },
              ].map((problem, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ delay: i * 0.15 }}
                  className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/10 hover:border-[#E45858]/40 hover:bg-[#E45858]/5 transition-all"
                >
                  <div className="w-16 h-16 rounded-2xl bg-[#E45858]/10 text-[#E45858] flex items-center justify-center mb-8">
                    {problem.icon}
                  </div>
                  <h3 className="text-2xl font-black mb-4">{problem.title}</h3>
                  <p className="text-gray-400 font-medium leading-relaxed">{problem.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. THE SOLUTION / HOW IT WORKS (THE 'AHA' MOMENT) */}
        <section className="py-32 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="inline-block px-4 py-1.5 rounded-full bg-[#1FBF8F]/10 border border-[#1FBF8F]/20 text-[#1FBF8F] text-sm font-bold mb-6 uppercase tracking-wider"
              >
                The StratEdge Advantage
              </motion.div>
              <h2 className="text-4xl sm:text-6xl font-black mb-8 tracking-tight">
                Zero Data Entry. <br className="hidden sm:block"/>
                <span className="text-[#1FBF8F]">Infinite Insights.</span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-medium">
                We've built a radically unique workflow. Throw away your spreadsheets. Here is how seamless tracking your trades is meant to be.
              </p>
            </div>

            <div className="relative">
              {/* Central connection line */}
              <div className="hidden md:block absolute top-[50%] left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#1FBF8F]/30 to-transparent -z-10"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center relative z-10">
                
                {/* Step 1 */}
                <motion.div 
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="flex flex-col items-center"
                >
                  <div className="w-24 h-24 rounded-[2rem] bg-white dark:bg-[#111C1C] border border-gray-200 dark:border-white/10 shadow-2xl flex items-center justify-center mb-8 relative">
                    <Upload size={40} className="text-gray-900 dark:text-gray-100" strokeWidth={1} />
                    <div className="absolute -right-4 -top-4 w-10 h-10 rounded-full bg-gray-900 text-white font-black flex items-center justify-center text-lg border-4 border-[#F8FAFC] dark:border-[#0B1515]">1</div>
                  </div>
                  <h3 className="text-2xl font-black mb-3">Drop a Screenshot</h3>
                  <p className="text-gray-600 dark:text-gray-400 font-medium max-w-[280px]">
                    Took a trade on MetaTrader? Just screenshot it. No need to log lot sizes, pairs, or entry prices manually.
                  </p>
                </motion.div>

                {/* Step 2 */}
                <motion.div 
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-24 h-24 rounded-[2rem] bg-white dark:bg-[#111C1C] border-2 border-[#1FBF8F] shadow-[0_0_40px_rgba(31,191,143,0.3)] flex items-center justify-center mb-8 relative">
                    <Zap size={40} className="text-[#1FBF8F]" strokeWidth={1.5} />
                    <div className="absolute -right-4 -top-4 w-10 h-10 rounded-full bg-[#1FBF8F] text-white font-black flex items-center justify-center text-lg border-4 border-[#F8FAFC] dark:border-[#0B1515]">2</div>
                  </div>
                  <h3 className="text-2xl font-black mb-3">AI Parses Everything</h3>
                  <p className="text-gray-600 dark:text-gray-400 font-medium max-w-[280px]">
                    Our specialized OCR AI reads your screenshot and accurately extracts every data point in less than 2 seconds.
                  </p>
                </motion.div>

                {/* Step 3 */}
                <motion.div 
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-24 h-24 rounded-[2rem] bg-white dark:bg-[#111C1C] border border-gray-200 dark:border-white/10 shadow-2xl flex items-center justify-center mb-8 relative">
                    <Target size={40} className="text-gray-900 dark:text-gray-100" strokeWidth={1} />
                    <div className="absolute -right-4 -top-4 w-10 h-10 rounded-full bg-gray-900 text-white font-black flex items-center justify-center text-lg border-4 border-[#F8FAFC] dark:border-[#0B1515]">3</div>
                  </div>
                  <h3 className="text-2xl font-black mb-3">Find Your Edge</h3>
                  <p className="text-gray-600 dark:text-gray-400 font-medium max-w-[280px]">
                    Your dashboard is instantly updated. We show you your true win rate, most profitable pairs, and deadly habits.
                  </p>
                </motion.div>

              </div>
            </div>
          </div>
        </section>

        {/* 4. FEATURES SECTION */}
        <section className="py-24 sm:py-32 relative">
          <div className="absolute inset-0 bg-[#1FBF8F]/5 dark:bg-[#1FBF8F]/[0.02] skew-y-3 origin-top-left -z-10"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 sm:mb-20">
              <h2 className="text-3xl sm:text-5xl font-black mb-6 tracking-tight">Built to build <span className="text-[#1FBF8F]">consistency.</span></h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-medium">Tools designed to bridge the gap between amateur guessing and professional analytics.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: <Zap strokeWidth={2}/>, title: "Lightning Fast Extraction", desc: "Upload screenshots and extract trade data globally in milliseconds." },
                { icon: <Brain strokeWidth={2}/>, title: "AI Trading Copilot", desc: "Get highly personalized weekly performance analysis tailored to you." },
                { icon: <Target strokeWidth={2}/>, title: "Setup Analytics", desc: "Discover which technical setups or timeframes make you the most money." },
                { icon: <LayoutDashboard strokeWidth={2}/>, title: "Real-time Dashboard", desc: "Live win rate, dynamic profit curve, and active trading metrics." },
                { icon: <History strokeWidth={2}/>, title: "Immutable History", desc: "Maintain a complete history of all your trades forever in the cloud." },
                { icon: <Shield strokeWidth={2}/>, title: "Emotion Tracking", desc: "Review your mental state per trade to eliminate self-sabotage." }
              ].map((feat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="p-8 rounded-[2rem] bg-white/80 dark:bg-white/[0.02] backdrop-blur-md border border-gray-200/80 dark:border-white/5 hover:border-[#1FBF8F]/50 dark:hover:border-[#1FBF8F]/30 hover:shadow-[0_20px_40px_-15px_rgba(31,191,143,0.1)] transition-all group overflow-hidden relative"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#1FBF8F]/10 rounded-full blur-3xl group-hover:bg-[#1FBF8F]/20 transition-colors pointer-events-none"></div>
                  <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-white/5 group-hover:bg-[#1FBF8F]/10 flex items-center justify-center mb-6 text-gray-900 dark:text-white group-hover:text-[#1FBF8F] transition-all duration-300 relative z-10 border border-gray-100 dark:border-white/5">
                    {feat.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3 relative z-10">{feat.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 font-medium leading-relaxed relative z-10">{feat.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. PRICING SECTION */}
        <section className="py-24 sm:py-32 bg-white/30 dark:bg-black/30 border-t border-gray-200/50 dark:border-white/5 backdrop-blur-lg">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 sm:mb-20">
              <h2 className="text-3xl sm:text-5xl font-black mb-6 tracking-tight">Clear Pricing. No Surprises.</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">Invest in your edge for less than the cost of a blown prop firm challenge.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Free Plan */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="p-8 sm:p-10 rounded-[2.5rem] bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 flex flex-col hover:border-gray-300 dark:hover:border-white/20 transition-colors shadow-sm"
              >
                <h3 className="text-2xl font-black mb-2">Hobbyist</h3>
                <p className="text-gray-500 font-medium mb-6">Test the waters risk-free.</p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-5xl font-black tracking-tighter">₹0</span>
                  <span className="text-gray-500 font-medium">/forever</span>
                </div>
                <ul className="space-y-4 mb-10 flex-1 font-medium">
                  <li className="flex items-center gap-4"><Check size={20} className="text-[#1FBF8F] shrink-0" strokeWidth={3}/> <span>Add up to 10 manual trades</span></li>
                  <li className="flex items-center gap-4"><Check size={20} className="text-[#1FBF8F] shrink-0" strokeWidth={3}/> <span>Basic dashboard overview</span></li>
                  <li className="flex items-center gap-4 text-gray-400 dark:text-gray-600"><X size={20} className="shrink-0" strokeWidth={2}/> <span>No screenshot parsing</span></li>
                  <li className="flex items-center gap-4 text-gray-400 dark:text-gray-600"><X size={20} className="shrink-0" strokeWidth={2}/> <span>No AI insights</span></li>
                </ul>
                <Link href="/register" className="w-full py-4 rounded-full border border-gray-200 dark:border-white/10 font-bold text-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  Get Started
                </Link>
              </motion.div>

              {/* Pro Plan */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="p-8 sm:p-10 rounded-[2.5rem] bg-gray-900 dark:bg-[#0B1515] text-white border border-[#1FBF8F]/50 flex flex-col shadow-[0_30px_60px_-15px_rgba(31,191,143,0.3)] relative overflow-hidden group"
              >
                {/* Glow effects */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#1FBF8F]/10 rounded-full blur-[80px] group-hover:bg-[#1FBF8F]/20 transition-colors"></div>
                
                <div className="absolute top-0 right-8 py-1.5 px-4 bg-gradient-to-r from-[#1FBF8F] to-[#2DD4BF] text-white text-xs font-black rounded-b-xl shadow-lg uppercase tracking-wider">
                  Most Popular
                </div>
                
                <h3 className="text-2xl font-black mb-2">Professional</h3>
                <p className="text-gray-400 font-medium mb-6">Full systematic tracking & AI analytics.</p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-5xl font-black tracking-tighter">₹150</span>
                  <span className="text-[#1FBF8F] font-medium">/ 3 months</span>
                </div>
                <ul className="space-y-4 mb-10 flex-1 font-medium text-gray-300">
                  <li className="flex items-center gap-4"><Check size={20} className="text-[#1FBF8F] shrink-0" strokeWidth={3}/> <span className="text-white">Unlimited trade journals</span></li>
                  <li className="flex items-center gap-4"><Check size={20} className="text-[#1FBF8F] shrink-0" strokeWidth={3}/> <span className="text-white">Automated OCR Extraction</span></li>
                  <li className="flex items-center gap-4"><Check size={20} className="text-[#1FBF8F] shrink-0" strokeWidth={3}/> <span className="text-white">AI trading weekly insights</span></li>
                  <li className="flex items-center gap-4"><Check size={20} className="text-[#1FBF8F] shrink-0" strokeWidth={3}/> <span className="text-white">Setup & psychology analytics</span></li>
                  <li className="flex items-center gap-4"><Check size={20} className="text-[#1FBF8F] shrink-0" strokeWidth={3}/> <span className="text-white">Priority support</span></li>
                </ul>
                <Link href="/register" className="w-full py-4 rounded-full bg-[#1FBF8F] text-white font-bold text-center hover:bg-[#189e75] transition-all shadow-[0_0_20px_rgba(31,191,143,0.3)] hover:shadow-[0_0_30px_rgba(31,191,143,0.5)]">
                  Upgrade to Pro
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 6. FINAL CTA */}
        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-[#0F172A] dark:bg-[#070B14]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#1FBF8F] rounded-full blur-[150px] opacity-20 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]"></div>
          
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <motion.div
               initial={{ opacity: 0, y: 30 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
            >
              <h2 className="text-4xl sm:text-6xl font-black mb-8 text-white tracking-tight">Stop Guessing. <br/>Start Analyzing.</h2>
              <p className="text-xl text-gray-400 mb-10 max-w-xl mx-auto font-medium">Join traders who have turned their random setups into systematic, profitable strategies.</p>
              
              <Link href="/register" className="inline-flex items-center justify-center px-10 py-5 rounded-full bg-[#1FBF8F] text-white text-lg font-bold hover:bg-white hover:text-gray-900 transition-all duration-300 shadow-[0_0_40px_rgba(31,191,143,0.4)] hover:shadow-none hover:scale-105">
                Create Free Account
              </Link>
            </motion.div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-white dark:bg-[#0B1515] border-t border-gray-200/80 dark:border-white/5 py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#1FBF8F] to-[#149f75] flex items-center justify-center">
                 <TrendingUp size={18} className="text-white" strokeWidth={2.5} />
               </div>
               <span className="text-xl font-black tracking-tight">StratEdge</span>
            </div>
            
            <div className="flex flex-wrap justify-center gap-8 text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white">
              <Link href="#" className="hover:text-[#1FBF8F] transition-colors">Terms of Service</Link>
              <Link href="#" className="hover:text-[#1FBF8F] transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-[#1FBF8F] transition-colors">Refund Policy</Link>
              <Link href="#" className="hover:text-[#1FBF8F] transition-colors">Contact</Link>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-100 dark:border-white/5 flex justify-between items-center text-sm text-gray-500 font-medium">
            <span>© 2026 StratEdge Technologies. All rights reserved.</span>
            <span>Trading carries inherent risks.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
