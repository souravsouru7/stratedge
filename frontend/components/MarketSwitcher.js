"use client";

import { useMarket, MARKETS } from '@/context/MarketContext';
import { useRouter, usePathname } from 'next/navigation';

export default function MarketSwitcher() {
  const { currentMarket, switchMarket, getCurrencySymbol, getMarketLabel } = useMarket();
  const router = useRouter();
  const pathname = usePathname();

  const handleSwitch = () => {
    // Navigate to appropriate page based on new market
    // The MarketContext will automatically sync currentMarket when the pathname changes

    // Map current path to new market equivalent
    let newPath = pathname;

    // If we're on a market-specific page, switch to the other market's version
    if (pathname.startsWith('/indian-market')) {
      newPath = pathname.replace('/indian-market', '');
      if (newPath === '' || newPath === '/') newPath = '/dashboard';
    } else {
      // If we're in the standard dashboard or other main pages, switch to indian-market version
      if (pathname === '/dashboard' || pathname === '/trades' || pathname === '/add-trade' || pathname === '/upload-trade' || pathname === '/analytics' || pathname === '/') {
        newPath = `/indian-market${pathname === '/' ? '/dashboard' : pathname}`;

        // Ensure /dashboard becomes /indian-market/dashboard
        if (pathname === '/dashboard' || pathname === '/') newPath = '/indian-market/dashboard';
      }
    }

    // Navigate immediately. The Context URL-sync will handle the rest.
    router.push(newPath);
  };

  const isForex = currentMarket === MARKETS.FOREX;
  const currencySymbol = getCurrencySymbol();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}>
      {/* Toggle Container */}
      <button
        onClick={handleSwitch}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          background: '#FFFFFF',
          border: `2px solid ${isForex ? '#0D9E6E' : '#2E7D32'}`,
          borderRadius: '24px',
          padding: '4px',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isForex
            ? '0 2px 8px rgba(13, 158, 110, 0.2)'
            : '0 2px 8px rgba(46, 125, 50, 0.2)',
          minWidth: '140px',
          height: '40px',
        }}
        title={`Switch to ${isForex ? 'Indian Market' : 'Forex'}`}
      >
        {/* Sliding Background */}
        <div
          style={{
            position: 'absolute',
            left: isForex ? '4px' : 'calc(50% - 2px)',
            width: 'calc(50% - 4px)',
            height: '32px',
            background: `linear-gradient(135deg, ${isForex ? '#0D9E6E' : '#2E7D32'} 0%, ${isForex ? '#22C78E' : '#43A047'} 100%)`,
            borderRadius: '20px',
            transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
          }}
        />

        {/* Forex Side */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            zIndex: 1,
            transition: 'color 0.3s ease',
            color: isForex ? '#FFFFFF' : '#4A5568',
            fontSize: '11px',
            fontWeight: '700',
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.05em',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
            <line x1="12" y1="18" x2="12" y2="2" />
          </svg>
          FOREX
        </div>

        {/* Indian Market Side */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            zIndex: 1,
            transition: 'color 0.3s ease',
            color: !isForex ? '#FFFFFF' : '#4A5568',
            fontSize: '11px',
            fontWeight: '700',
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.05em',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
          NIFTY
        </div>
      </button>

      {/* Currency Symbol Indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          background: `linear-gradient(135deg, ${isForex ? '#0D9E6E' : '#2E7D32'} 0%, ${isForex ? '#22C78E' : '#43A047'} 100%)`,
          borderRadius: '10px',
          boxShadow: `0 2px 8px ${isForex ? 'rgba(13, 158, 110, 0.3)' : 'rgba(46, 125, 50, 0.3)'}`,
          color: '#FFFFFF',
          fontSize: '18px',
          fontWeight: '700',
          fontFamily: "'JetBrains Mono', monospace",
          transition: 'all 0.3s ease',
        }}
        title={`Current: ${getMarketLabel()}`}
      >
        {currencySymbol}
      </div>

      {/* Market Status Tooltip */}
      <div
        style={{
          fontSize: '10px',
          fontWeight: '600',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: isForex ? '#0D9E6E' : '#2E7D32',
          background: isForex ? 'rgba(13, 158, 110, 0.1)' : 'rgba(46, 125, 50, 0.1)',
          padding: '6px 12px',
          borderRadius: '8px',
          border: `1px solid ${isForex ? 'rgba(13, 158, 110, 0.3)' : 'rgba(46, 125, 50, 0.3)'}`,
          whiteSpace: 'nowrap',
          transition: 'all 0.3s ease',
        }}
      >
        {getMarketLabel()}
      </div>
    </div>
  );
}
