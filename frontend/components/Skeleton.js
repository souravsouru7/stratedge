"use client";

import React from 'react';

/**
 * Skeleton Loader Component
 * Provides visual loading placeholders to prevent layout shift
 * and improve perceived performance on mobile
 */
export default function Skeleton({ 
  width, 
  height, 
  borderRadius = 8, 
  variant = 'rectangular',
  className = '',
  style = {}
}) {
  const baseStyles = {
    background: 'linear-gradient(90deg, #f0f0f0 0%, #e0e0e0 20%, #f0f0f0 40%, #f0f0f0 100%)',
    backgroundSize: '1000px 100%',
    animation: 'shimmer 2s infinite',
    borderRadius: `${borderRadius}px`,
    width: width || '100%',
    height: height || 'auto',
    ...style,
  };

  const variants = {
    rectangular: {},
    circular: {
      borderRadius: '50%',
    },
    text: {
      height: '1em',
      borderRadius: '4px',
    },
  };

  return (
    <div 
      className={`skeleton ${className}`}
      style={{
        ...baseStyles,
        ...variants[variant],
      }}
    />
  );
}

/**
 * Card Skeleton - For trade cards, dashboard widgets
 */
export function CardSkeleton({ lines = 3 }) {
  return (
    <div style={{ 
      padding: '16px', 
      background: '#FFFFFF',
      borderRadius: '12px',
      border: '1px solid #E2E8F0',
    }}>
      <Skeleton width="60%" height={20} style={{ marginBottom: '12px' }} />
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <Skeleton width="40%" height={16} />
        <Skeleton width="40%" height={16} />
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          height={14} 
          style={{ marginBottom: i === lines - 1 ? 0 : '8px' }} 
        />
      ))}
    </div>
  );
}

/**
 * Table Row Skeleton - For trades tables
 */
export function TableRowSkeleton({ rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} style={{ borderBottom: '1px solid #E2E8F0' }}>
          <td style={{ padding: '12px 16px' }}>
            <Skeleton width="80%" height={16} />
          </td>
          <td style={{ padding: '12px 16px' }}>
            <Skeleton width="60%" height={16} />
          </td>
          <td style={{ padding: '12px 16px' }}>
            <Skeleton width="70%" height={16} />
          </td>
          <td style={{ padding: '12px 16px' }}>
            <Skeleton width="50%" height={16} />
          </td>
        </tr>
      ))}
    </>
  );
}

/**
 * Text Skeleton - For paragraphs, headings
 */
export function TextSkeleton({ lines = 2, width = '100%' }) {
  return (
    <div style={{ width }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i}
          height={16}
          variant="text"
          style={{ 
            marginBottom: i === lines - 1 ? 0 : '8px',
            width: i === lines - 1 ? '60%' : '100%',
          }} 
        />
      ))}
    </div>
  );
}

/**
 * Image Skeleton - For screenshots, avatars
 */
export function ImageSkeleton({ width, height, borderRadius = 8 }) {
  return (
    <Skeleton 
      width={width || '100%'}
      height={height || 200}
      borderRadius={borderRadius}
      style={{
        objectFit: 'cover',
      }}
    />
  );
}

/**
 * Button Skeleton - For action buttons
 */
export function ButtonSkeleton({ width = '120px', height = '48px' }) {
  return (
    <Skeleton 
      width={width}
      height={height}
      borderRadius={8}
    />
  );
}
