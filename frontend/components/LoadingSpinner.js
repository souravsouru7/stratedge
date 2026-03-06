"use client";

import React from 'react';
import { useMarket } from '@/context/MarketContext';

export default function LoadingSpinner({ message = "LOADING DATA...", fullPage = false }) {
    const { getThemeColors } = useMarket();
    const colors = getThemeColors();

    const containerStyle = fullPage ? {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        width: '100%',
        gap: '20px',
    } : {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        gap: '16px',
        width: '100%',
    };

    return (
        <div style={containerStyle}>
            <style>{`
        @keyframes dashProgress {
          0% { stroke-dashoffset: 70; transform: rotate(0deg); }
          50% { stroke-dashoffset: 20; transform: rotate(180deg); }
          100% { stroke-dashoffset: 70; transform: rotate(360deg); }
        }
        @keyframes pulseOpacity {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>

            <div style={{ position: 'relative', width: 50, height: 50 }}>
                {/* Outer Ring */}
                <svg width="50" height="50" viewBox="0 0 50 50">
                    <circle
                        cx="25"
                        cy="25"
                        r="20"
                        fill="none"
                        stroke={colors.primary}
                        strokeWidth="3"
                        strokeDasharray="80"
                        strokeLinecap="round"
                        style={{
                            opacity: 0.2,
                        }}
                    />
                    <circle
                        cx="25"
                        cy="25"
                        r="20"
                        fill="none"
                        stroke={colors.primary}
                        strokeWidth="3"
                        strokeDasharray="80"
                        strokeLinecap="round"
                        style={{
                            animation: 'dashProgress 1.5s ease-in-out infinite',
                            transformOrigin: 'center',
                        }}
                    />
                </svg>

                {/* Center Logo */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 24,
                    height: 24,
                    animation: 'pulseOpacity 1s ease-in-out infinite',
                }}>
                    <img
                        src="/load.png"
                        alt="Loading"
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentNode.style.background = colors.bull;
                            e.target.parentNode.style.borderRadius = '50%';
                            e.target.parentNode.style.width = '8px';
                            e.target.parentNode.style.height = '8px';
                            e.target.parentNode.style.boxShadow = `0 0 10px ${colors.bull}`;
                        }}
                    />
                </div>
            </div>

            <div style={{
                fontSize: '11px',
                fontWeight: '700',
                color: colors.primary,
                letterSpacing: '0.15em',
                fontFamily: "'JetBrains Mono', monospace",
                animation: 'pulseOpacity 1.5s ease-in-out infinite',
            }}>
                {message}
            </div>
        </div>
    );
}
