"use client";

/**
 * EquityCurve
 * SVG sparkline showing account equity trend, bull (up) or bear (down).
 */
export default function EquityCurve({ bull }) {
  const bullPts = "0,52 20,46 40,48 60,36 80,38 100,24 120,28 140,14 160,18 180,8";
  const bearPts = "0,8  20,12 40,10 60,22 80,18 100,32 120,28 140,40 160,36 180,52";
  const pts   = bull ? bullPts : bearPts;
  const color = bull ? "#0D9E6E" : "#D63B3B";
  return (
    <svg width="100%" height="64" viewBox="0 0 180 60" preserveAspectRatio="none" fill="none">
      <defs>
        <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <polygon points={`0,52 ${pts} 180,60 0,60`} fill="url(#eqGrad)" />
      <polyline points={pts} stroke={color} strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="0"   cy="52"              r="3" fill={color} opacity="0.4" />
      <circle cx="180" cy={bull ? "8" : "52"} r="4" fill={color} />
    </svg>
  );
}
