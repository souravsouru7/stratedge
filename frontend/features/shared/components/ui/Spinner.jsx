"use client";

import React from "react";

/**
 * Standard loading spinner component.
 * 
 * @param {string} size - CSS size for width and height
 * @param {string} color - CSS color
 * @param {string} className - Additional CSS classes
 */
export const Spinner = ({ 
  size = "20px", 
  color = "currentColor", 
  className = "" 
}) => {
  return (
    <div className={`spinner-container ${className}`}>
      <span className="spinner-inner" />
      <style jsx>{`
        .spinner-container {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: ${size};
          height: ${size};
          vertical-align: middle;
        }
        .spinner-inner {
          width: 100%;
          height: 100%;
          border: 2px solid ${color}33;
          border-top-color: ${color};
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
