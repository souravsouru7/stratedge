import { MARKETS } from '@/context/MarketContext';

/**
 * Theme configuration for each market
 * Contains colors, styling, and visual preferences
 */
export const marketThemes = {
  [MARKETS.FOREX]: {
    // Primary Colors
    primary: '#0D9E6E',        // Bull Green
    primaryLight: '#22C78E',   // Light Bull Green
    primaryDark: '#0A7A56',    // Dark Bull Green
    
    // Secondary Colors
    secondary: '#0F1923',      // Deep Navy
    secondaryLight: '#1A2D3D', // Light Navy
    secondaryDark: '#081018',  // Dark Navy
    
    // Background Colors
    background: '#F0EEE9',     // Warm Light Gray
    backgroundLight: '#F8F6F2',// Lighter Warm Gray
    backgroundDark: '#E2E8F0', // Border Gray
    
    // Accent Colors
    accent: '#B8860B',         // Gold
    accentLight: '#FFD700',    // Light Gold
    accentDark: '#9A7008',     // Dark Gold
    
    // Trading Colors
    bull: '#0D9E6E',           // Bullish/Buy
    bear: '#D63B3B',           // Bearish/Sell
    bullLight: 'rgba(13, 158, 110, 0.1)',
    bearLight: 'rgba(214, 59, 59, 0.1)',
    
    // Text Colors
    textPrimary: '#0F1923',    // Primary Text
    textSecondary: '#4A5568',  // Secondary Text
    textMuted: '#94A3B8',      // Muted Text
    textLight: '#FFFFFF',      // Light Text on dark bg
    
    // UI Elements
    border: '#E2E8F0',         // Border Color
    shadow: 'rgba(15, 25, 35, 0.06)', // Shadow Color
    overlay: 'rgba(15, 25, 35, 0.5)', // Overlay for modals
    
    // Gradients
    gradients: {
      primary: 'linear-gradient(135deg, #0D9E6E 0%, #22C78E 100%)',
      secondary: 'linear-gradient(135deg, #0F1923 0%, #1A2D3D 100%)',
      bull: 'linear-gradient(135deg, #0D9E6E 0%, #22C78E 100%)',
      bear: 'linear-gradient(135deg, #D63B3B 0%, #F87171 100%)',
      accent: 'linear-gradient(135deg, #B8860B 0%, #FFD700 100%)',
    },
    
    // Box Shadows
    shadows: {
      sm: '0 1px 3px rgba(15, 25, 35, 0.04)',
      md: '0 2px 8px rgba(15, 25, 35, 0.05)',
      lg: '0 4px 16px rgba(15, 25, 35, 0.1)',
      xl: '0 8px 32px rgba(15, 25, 35, 0.15)',
      glow: '0 0 20px rgba(13, 158, 110, 0.3)',
    },
    
    // Typography
    fonts: {
      primary: "'Plus Jakarta Sans', sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    
    // Market Label
    label: 'Forex',
    name: 'Currency Trading',
    icon: '💱'
  },
  
  [MARKETS.INDIAN_MARKET]: {
    // Primary Colors - Deep emerald / matches logo accent
    primary: '#14532D',        // Deep Emerald
    primaryLight: '#22C55E',   // Emerald
    primaryDark: '#0B3A1F',    // Very Dark Emerald
    
    // Secondary Colors - Supportive green for UI chrome
    secondary: '#166534',      // Mid Green
    secondaryLight: '#4ADE80', // Light Green
    secondaryDark: '#052E16',  // Near-black green
    
    // Background Colors - Neutral, pro dashboard style
    background: '#F3F4F6',     // Slate-Gray Light
    backgroundLight: '#F9FAFB',// Softer Light
    backgroundDark: '#E5E7EB', // Border Gray
    
    // Accent Colors - Refined gold accent
    accent: '#FBBF24',         // Amber / Gold
    accentLight: '#FCD34D',    // Lighter Amber
    accentDark: '#D97706',     // Deep Amber
    
    // Trading Colors
    bull: '#16A34A',           // Positive (Buy)
    bear: '#DC2626',           // Negative (Sell)
    bullLight: 'rgba(22, 163, 74, 0.10)',
    bearLight: 'rgba(220, 38, 38, 0.10)',
    
    // Text Colors
    textPrimary: '#0F172A',    // Slate 900
    textSecondary: '#334155',  // Slate 700
    textMuted: '#9CA3AF',      // Slate 400
    textLight: '#FFFFFF',      // White
    
    // UI Elements
    border: '#E5E7EB',         // Neutral border
    shadow: 'rgba(15, 23, 42, 0.08)', // Subtle dark shadow
    overlay: 'rgba(15, 23, 42, 0.55)', // Modal overlay
    
    // Gradients
    gradients: {
      primary: 'linear-gradient(135deg, #14532D 0%, #22C55E 100%)',
      secondary: 'linear-gradient(135deg, #052E16 0%, #166534 100%)',
      bull: 'linear-gradient(135deg, #16A34A 0%, #22C55E 100%)',
      bear: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
      accent: 'linear-gradient(135deg, #D97706 0%, #FBBF24 100%)',
    },
    
    // Box Shadows
    shadows: {
      sm: '0 1px 3px rgba(15, 23, 42, 0.04)',
      md: '0 2px 8px rgba(15, 23, 42, 0.06)',
      lg: '0 4px 16px rgba(15, 23, 42, 0.10)',
      xl: '0 8px 32px rgba(15, 23, 42, 0.16)',
      glow: '0 0 24px rgba(34, 197, 94, 0.35)',
    },
    
    // Typography
    fonts: {
      primary: "'Plus Jakarta Sans', sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    
    // Market Label
    label: 'Indian Market',
    name: 'Nifty & Bank Nifty',
    icon: '🇮🇳'
  }
};

/**
 * Get theme by market type
 * @param {string} market - Market type
 * @returns {object} Theme object
 */
export const getTheme = (market) => {
  return marketThemes[market] || marketThemes[MARKETS.FOREX];
};

/**
 * Get color value from theme
 * @param {string} market - Market type
 * @param {string} colorKey - Color key (e.g., 'primary', 'bull', 'bear')
 * @returns {string} Color value
 */
export const getColor = (market, colorKey) => {
  const theme = getTheme(market);
  return theme[colorKey] || theme.primary;
};

/**
 * Merge custom styles with base theme
 * @param {string} market - Market type
 * @param {object} customStyles - Custom styles to merge
 * @returns {object} Merged theme
 */
export const mergeTheme = (market, customStyles) => {
  const baseTheme = getTheme(market);
  return { ...baseTheme, ...customStyles };
};

/**
 * Get CSS variables string for theme
 * @param {string} market - Market type
 * @returns {string} CSS variables
 */
export const getThemeCSSVariables = (market) => {
  const theme = getTheme(market);
  
  return `
    --color-primary: ${theme.primary};
    --color-primary-light: ${theme.primaryLight};
    --color-primary-dark: ${theme.primaryDark};
    --color-secondary: ${theme.secondary};
    --color-background: ${theme.background};
    --color-accent: ${theme.accent};
    --color-bull: ${theme.bull};
    --color-bear: ${theme.bear};
    --color-text-primary: ${theme.textPrimary};
    --color-text-secondary: ${theme.textSecondary};
    --color-border: ${theme.border};
    --shadow-sm: ${theme.shadows.sm};
    --shadow-md: ${theme.shadows.md};
    --shadow-lg: ${theme.shadows.lg};
  `.trim();
};

export default {
  marketThemes,
  getTheme,
  getColor,
  mergeTheme,
  getThemeCSSVariables
};
