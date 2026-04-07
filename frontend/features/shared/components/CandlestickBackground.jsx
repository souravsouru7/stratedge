"use client";

import { useEffect } from "react";

/**
 * CandlestickBackground
 * Renders a subtle animated candlestick chart on a canvas as a full-screen background.
 * @param {string} canvasId - Unique id for the canvas element (must be unique per page).
 */
export default function CandlestickBackground({ canvasId = "bg-canvas" }) {
  useEffect(() => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const draw = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const count = Math.floor(W / 32);
      let price = 200;
      const candles = [];
      for (let i = 0; i < count; i++) {
        const open = price + (Math.random() - 0.5) * 20;
        const close = open + (Math.random() - 0.5) * 28;
        const high = Math.max(open, close) + Math.random() * 12;
        const low = Math.min(open, close) - Math.random() * 12;
        price = close;
        candles.push({ open, close, high, low });
      }

      const all = candles.flatMap(c => [c.high, c.low]);
      const mx = Math.max(...all), mn = Math.min(...all), rng = mx - mn || 1;
      const toY = p => H * 0.1 + (H * 0.8 * (mx - p)) / rng;

      // Subtle grid
      ctx.strokeStyle = "rgba(0,0,0,0.04)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 7; i++) {
        ctx.beginPath(); ctx.moveTo(0, (H / 7) * i); ctx.lineTo(W, (H / 7) * i); ctx.stroke();
      }

      // Candles
      candles.forEach((c, i) => {
        const x = i * 32 + 16, bull = c.close >= c.open;
        ctx.strokeStyle = bull ? "rgba(13,158,110,0.22)" : "rgba(214,59,59,0.18)";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, toY(c.high)); ctx.lineTo(x, toY(c.low)); ctx.stroke();
        ctx.fillStyle = bull ? "rgba(13,158,110,0.14)" : "rgba(214,59,59,0.11)";
        const bTop = toY(Math.max(c.open, c.close)), bBot = toY(Math.min(c.open, c.close));
        ctx.fillRect(x - 8, bTop, 16, Math.max(bBot - bTop, 1));
      });

      // Moving average line
      const ma = candles.map((_, i) => {
        const sl = candles.slice(Math.max(0, i - 5), i + 1);
        return sl.reduce((a, c) => a + c.close, 0) / sl.length;
      });
      ctx.strokeStyle = "rgba(184,134,11,0.28)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ma.forEach((p, i) => {
        const x = i * 32 + 16, y = toY(p);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    };

    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [canvasId]);

  return (
    <canvas
      id={canvasId}
      style={{
        position: "fixed", inset: 0,
        width: "100%", height: "100%",
        opacity: 1, zIndex: 0, pointerEvents: "none",
      }}
    />
  );
}
