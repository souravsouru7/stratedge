"use client";

import React from "react";

/**
 * Skeleton component with shimmer animation.
 * 
 * @param {string} variant - 'text' | 'rect' | 'circle'
 * @param {string|number} width - CSS width
 * @param {string|number} height - CSS height
 * @param {object} style - Additional styles
 * @param {string} className - Additional class names
 */
export const Skeleton = ({ 
  variant = "rect", 
  width, 
  height, 
  style = {}, 
  className = "" 
}) => {
  const baseStyle = {
    display: "inline-block",
    width: width || "100%",
    height: height || (variant === "text" ? "1em" : "100%"),
    borderRadius: variant === "circle" ? "50%" : "8px",
    position: "relative",
    overflow: "hidden",
    background: "#EDF2F7",
    ...style,
  };

  return (
    <div className={`skeleton-container ${className}`} style={baseStyle}>
      <div className="skeleton-shimmer" />
      <style jsx>{`
        .skeleton-container {
          position: relative;
          background: #EDF2F7;
          overflow: hidden;
        }
        .skeleton-shimmer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.6) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};
