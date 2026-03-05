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
    // Primary Colors - Forest Green theme
    primary: '#2E7D32',        // Forest Green
    primaryLight: '#43A047',   // Light Forest Green
    primaryDark: '#1B5E20',    // Dark Forest Green
    
    // Secondary Colors - Earth tones
    secondary: '#1B5E20',      // Dark Green
    secondaryLight: '#2E7D32', // Medium Green
    secondaryDark: '#0D3D12',  // Very Dark Green
    
    // Background Colors - Warm beige
    background: '#F5F5DC',     // Beige/Cream
    backgroundLight: '#FAF9D6',// Light Cream
    backgroundDark: '#E8E4C9', // Darker Beige
    
    // Accent Colors - Golden
    accent: '#FFD700',         // Pure Gold
    accentLight: '#FFE135',    // Light Gold
    accentDark: '#DAA520',     // Golden Rod
    
    // Trading Colors
    bull: '#2E7D32',           // Forest Green (Bullish)
    bear: '#C62828',           // Deep Red (Bearish)
    bullLight: 'rgba(46, 125, 50, 0.1)',
    bearLight: 'rgba(198, 40, 40, 0.1)',
    
    // Text Colors
    textPrimary: '#1B5E20',    // Dark Green
    textSecondary: '#2E7D32',  // Forest Green
    textMuted: '#6B8E23',      // Olive Green
    textLight: '#FFFFFF',      // White
    
    // UI Elements
    border: '#D4C9A8',         // Beige Border
    shadow: 'rgba(27, 94, 32, 0.08)', // Green-tinted Shadow
    overlay: 'rgba(27, 94, 32, 0.5)', // Green Overlay
    
    // Gradients
    gradients: {
      primary: 'linear-gradient(135deg, #2E7D32 0%, #43A047 100%)',
      secondary: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)',
      bull: 'linear-gradient(135deg, #2E7D32 0%, #43A047 100%)',
      bear: 'linear-gradient(135deg, #C62828 0%, #E53935 100%)',
      accent: 'linear-gradient(135deg, #FFD700 0%, #FFE135 100%)',
    },
    
    // Box Shadows
    shadows: {
      sm: '0 1px 3px rgba(27, 94, 32, 0.06)',
      md: '0 2px 8px rgba(27, 94, 32, 0.08)',
      lg: '0 4px 16px rgba(27, 94, 32, 0.12)',
      xl: '0 8px 32px rgba(27, 94, 32, 0.18)',
      glow: '0 0 20px rgba(46, 125, 50, 0.3)',
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
