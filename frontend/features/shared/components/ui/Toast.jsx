"use client";

import React, { useState, useEffect, createContext, useContext, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info, Loader2 } from "lucide-react";

const ToastContext = createContext();

/**
 * ToastProvider
 * Wraps the app and provides a way to trigger notifications.
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 5000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    if (duration !== Infinity) {
      setTimeout(() => removeToast(id), duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <ToastItem key={t.id} {...t} onRemove={() => removeToast(t.id)} />
        ))}
      </div>
      <style jsx>{`
        .toast-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          z-index: 9999;
          max-width: 400px;
          width: calc(100% - 48px);
        }
        @media (max-width: 640px) {
          .toast-container {
            bottom: 16px;
            right: 16px;
            width: calc(100% - 32px);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};

const ToastItem = ({ message, type, onRemove }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const icons = {
    success: <CheckCircle size={18} color="#0D9E6E" />,
    error: <AlertCircle size={18} color="#D63B3B" />,
    info: <Info size={18} color="#3182CE" />,
    loading: <Loader2 size={18} color="#718096" className="animate-spin" />,
  };

  const bgColors = {
    success: "#F0FFF4",
    error: "#FFF5F5",
    info: "#EBF8FF",
    loading: "#F7FAFC",
  };

  const borderColors = {
    success: "rgba(13, 158, 110, 0.2)",
    error: "rgba(214, 59, 59, 0.2)",
    info: "rgba(49, 130, 206, 0.2)",
    loading: "rgba(113, 128, 150, 0.2)",
  };

  return (
    <div 
      className={`toast-item ${mounted ? "visible" : ""}`}
      style={{
        background: bgColors[type],
        border: `1px solid ${borderColors[type]}`,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderRadius: 12,
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        transform: mounted ? "translateX(0)" : "translateX(32px)",
        opacity: mounted ? 1 : 0,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div style={{ flexShrink: 0 }}>{icons[type]}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#2D3748", flex: 1 }}>{message}</div>
      <button 
        onClick={onRemove}
        style={{ 
          background: "none", border: "none", padding: 4, cursor: "pointer", 
          color: "#A0AEC0", borderRadius: 4, display: "flex" 
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}
        onMouseLeave={e => e.currentTarget.style.background = "none"}
      >
        <X size={14} />
      </button>

      <style jsx>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
