"use client";

import React from 'react';

/**
 * Mobile-Optimized Button Component
 * Ensures proper touch target sizes (min 48x48px) for mobile UX
 * with hardware-accelerated animations for smooth performance
 */
export default function TouchButton({ 
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  icon,
  className = '',
  style = {},
  ...props
}) {
  // Base styles - all buttons meet WCAG touch target guidelines
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    minWidth: size === 'small' ? '44px' : '48px',
    minHeight: size === 'small' ? '44px' : '48px',
    padding: size === 'small' ? '10px 16px' : '14px 20px',
    borderRadius: '12px',
    border: 'none',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    willChange: 'transform, box-shadow',
    transform: 'translateZ(0)', // Hardware acceleration
    backfaceVisibility: 'hidden',
    fontSize: '14px',
    fontWeight: '700',
    letterSpacing: '0.02em',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
    ...style,
  };

  // Variant styles
  const variants = {
    primary: {
      background: loading 
        ? 'rgba(13, 158, 110, 0.2)' 
        : 'linear-gradient(135deg, #0D9E6E 0%, #22C78E 100%)',
      color: '#FFFFFF',
      boxShadow: loading 
        ? 'none' 
        : '0 4px 14px rgba(13, 158, 110, 0.3)',
    },
    secondary: {
      background: '#FFFFFF',
      color: '#334155',
      border: '1px solid #CBD5E1',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    },
    danger: {
      background: loading 
        ? 'rgba(214, 59, 59, 0.2)' 
        : 'linear-gradient(135deg, #D63B3B 0%, #F87171 100%)',
      color: '#FFFFFF',
      boxShadow: loading 
        ? 'none' 
        : '0 4px 14px rgba(214, 59, 59, 0.3)',
    },
    ghost: {
      background: 'transparent',
      color: '#0D9E6E',
      border: '1px solid rgba(13, 158, 110, 0.3)',
      boxShadow: 'none',
    },
  };

  // Full width modifier
  if (fullWidth) {
    baseStyles.width = '100%';
  }

  // Loading state
  const finalStyle = {
    ...baseStyles,
    ...variants[variant],
    opacity: disabled || loading ? 0.6 : 1,
  };

  // Handle hover for better mobile feedback
  const handleMouseEnter = (e) => {
    if (!disabled && !loading) {
      e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
      if (variant === 'primary' || variant === 'danger') {
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.15)';
      }
    }
  };

  const handleMouseLeave = (e) => {
    e.currentTarget.style.transform = 'translateY(0) scale(1)';
    if (variant === 'primary' || variant === 'danger') {
      e.currentTarget.style.boxShadow = finalStyle.boxShadow;
    }
  };

  // Handle touch for instant feedback
  const handleTouchStart = (e) => {
    if (!disabled && !loading) {
      e.currentTarget.style.transform = 'scale(0.98)';
    }
  };

  const handleTouchEnd = (e) => {
    if (!disabled && !loading) {
      e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`touch-button ${className}`}
      style={finalStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      {...props}
    >
      {/* Loading spinner */}
      {loading && (
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="3"
          style={{ 
            animation: 'spin 0.8s linear infinite',
            marginRight: children ? '8px' : '0',
          }}
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      )}
      
      {/* Icon */}
      {icon && !loading && (
        <span style={{ display: 'flex', alignItems: 'center' }}>
          {icon}
        </span>
      )}
      
      {/* Children */}
      {children && (
        <span style={{ 
          display: 'flex', 
          alignItems: 'center',
          whiteSpace: 'nowrap',
        }}>
          {children}
        </span>
      )}
      
      {/* Ripple effect container (optional enhancement) */}
      <span 
        className="ripple-container"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
          borderRadius: 'inherit',
        }}
      />
    </button>
  );
}

/**
 * Icon Button - For actions with just icons
 */
export function IconButton({ 
  icon, 
  onClick, 
  disabled = false,
  label,
  size = 'medium',
  ...props 
}) {
  const sizeMap = {
    small: { width: '40px', height: '40px', iconSize: 18 },
    medium: { width: '48px', height: '48px', iconSize: 22 },
    large: { width: '56px', height: '56px', iconSize: 26 },
  };

  const { width, height, iconSize } = sizeMap[size];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label || 'Icon button'}
      style={{
        width,
        height,
        minWidth: width,
        minHeight: height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(13, 158, 110, 0.1)',
        border: 'none',
        borderRadius: '12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = 'rgba(13, 158, 110, 0.15)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(13, 158, 110, 0.1)';
        e.currentTarget.style.transform = 'scale(1)';
      }}
      {...props}
    >
      {React.cloneElement(icon, {
        width: iconSize,
        height: iconSize,
        style: { ...icon.props?.style, color: disabled ? '#94A3B8' : '#0D9E6E' },
      })}
    </button>
  );
}
