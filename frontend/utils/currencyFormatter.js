import { MARKETS } from '@/context/MarketContext';

/**
 * Currency symbols for each market
 */
const CURRENCY_SYMBOLS = {
  [MARKETS.FOREX]: '$',
  [MARKETS.INDIAN_MARKET]: '₹'
};

/**
 * Format currency amount based on market type
 * @param {number} amount - The amount to format
 * @param {string} market - Market type (Forex or Indian_Market)
 * @param {boolean} showSymbol - Whether to show currency symbol
 * @param {boolean} showSign - Whether to show + / - sign
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, market = MARKETS.FOREX, showSymbol = true, showSign = false) => {
  const symbol = CURRENCY_SYMBOLS[market] || '$';
  const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  const formatted = Math.abs(numAmount).toFixed(2);
  
  let result = '';
  
  if (showSign && numAmount !== 0) {
    result += numAmount > 0 ? '+' : '-';
  }
  
  if (showSymbol) {
    result += symbol;
  }
  
  result += formatted;
  
  return result;
};

/**
 * Format currency with compact notation (e.g., 1.5K, 2.3M)
 * @param {number} amount - The amount to format
 * @param {string} market - Market type (Forex or Indian_Market)
 * @returns {string} Compact formatted currency string
 */
export const formatCurrencyCompact = (amount, market = MARKETS.FOREX) => {
  const symbol = CURRENCY_SYMBOLS[market] || '$';
  const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  const absAmount = Math.abs(numAmount);
  
  let compactValue;
  let suffix = '';
  
  if (absAmount >= 1000000) {
    compactValue = (absAmount / 1000000).toFixed(1);
    suffix = 'M';
  } else if (absAmount >= 1000) {
    compactValue = (absAmount / 1000).toFixed(1);
    suffix = 'K';
  } else {
    compactValue = absAmount.toFixed(2);
  }
  
  const sign = numAmount < 0 ? '-' : '';
  return `${sign}${symbol}${compactValue}${suffix}`;
};

/**
 * Format percentage value
 * @param {number} value - The percentage value
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, decimals = 1) => {
  const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  return `${numValue.toFixed(decimals)}%`;
};

/**
 * Format large numbers with commas
 * @param {number} amount - The amount to format
 * @param {string} market - Market type (Forex or Indian_Market)
 * @returns {string} Formatted string with commas
 */
export const formatNumber = (amount, market = MARKETS.FOREX) => {
  const symbol = CURRENCY_SYMBOLS[market] || '$';
  const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  const formatted = numAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${symbol}${formatted}`;
};

/**
 * Get only the currency symbol for a market
 * @param {string} market - Market type
 * @returns {string} Currency symbol
 */
export const getCurrencySymbol = (market = MARKETS.FOREX) => {
  return CURRENCY_SYMBOLS[market] || '$';
};

/**
 * Parse currency string back to number
 * @param {string} currencyString - Currency string (e.g., "$100.50" or "₹100.50")
 * @returns {number} Parsed number
 */
export const parseCurrency = (currencyString) => {
  if (typeof currencyString === 'number') {
    return currencyString;
  }
  
  // Remove currency symbols and commas
  const cleaned = currencyString
    .replace(/[$₹,]/g, '')
    .trim();
  
  return parseFloat(cleaned) || 0;
};

/**
 * Format profit/loss with color coding
 * @param {number} profit - Profit/Loss amount
 * @param {string} market - Market type
 * @returns {object} Object with formatted value and color
 */
export const formatProfitLoss = (profit, market = MARKETS.FOREX) => {
  const numProfit = typeof profit === 'number' ? profit : parseFloat(profit) || 0;
  const isPositive = numProfit > 0;
  const isNegative = numProfit < 0;
  const isZero = numProfit === 0;
  
  return {
    value: formatCurrency(numProfit, market, true, true),
    color: isPositive ? '#0D9E6E' : isNegative ? '#D63B3B' : '#94A3B8',
    isPositive,
    isNegative,
    isZero
  };
};

export default {
  formatCurrency,
  formatCurrencyCompact,
  formatPercentage,
  formatNumber,
  getCurrencySymbol,
  parseCurrency,
  formatProfitLoss
};
