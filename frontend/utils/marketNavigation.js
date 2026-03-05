import { MARKETS } from '@/context/MarketContext';

/**
 * Get dashboard URL based on current market
 */
export const getDashboardUrl = (market) => {
  return market === MARKETS.INDIAN_MARKET 
    ? '/indian-market/dashboard' 
    : '/dashboard';
};

/**
 * Get add trade URL based on current market
 */
export const getAddTradeUrl = (market) => {
  return market === MARKETS.INDIAN_MARKET 
    ? '/indian-market/add' 
    : '/add-trade';
};

/**
 * Get analytics URL based on current market
 */
export const getAnalyticsUrl = (market) => {
  return market === MARKETS.INDIAN_MARKET 
    ? '/indian-market/analytics' 
    : '/analytics';
};

/**
 * Get trades journal URL based on current market
 */
export const getTradesUrl = (market) => {
  return market === MARKETS.INDIAN_MARKET 
    ? '/indian-market/trades' 
    : '/trades';
};

/**
 * Get edit trade URL based on current market
 */
export const getEditTradeUrl = (id, market) => {
  const basePath = market === MARKETS.INDIAN_MARKET 
    ? '/indian-market/trades' 
    : '/trades';
  return `${basePath}/${id}/edit`;
};

/**
 * Get trade detail URL based on current market
 */
export const getTradeDetailUrl = (id, market) => {
  const basePath = market === MARKETS.INDIAN_MARKET 
    ? '/indian-market/trades' 
    : '/trades';
  return `${basePath}/${id}`;
};

/**
 * Navigate to appropriate page based on current market
 * Usage: router.push(getMarketPath('dashboard', currentMarket))
 */
export const getMarketPath = (page, market) => {
  const routes = {
    dashboard: getDashboardUrl(market),
    'add-trade': getAddTradeUrl(market),
    analytics: getAnalyticsUrl(market),
    trades: getTradesUrl(market),
  };
  return routes[page] || '/dashboard';
};

/**
 * Check if current path is for Indian Market
 */
export const isIndianMarketPath = (pathname) => {
  return pathname?.startsWith('/indian-market');
};

/**
 * Convert a Forex path to Indian Market path
 */
export const toIndianMarketPath = (pathname) => {
  if (!pathname || pathname.startsWith('/indian-market')) {
    return pathname;
  }
  
  // Map common paths
  const mapping = {
    '/dashboard': '/indian-market/dashboard',
    '/trades': '/indian-market/trades',
    '/add-trade': '/indian-market/add',
    '/analytics': '/indian-market/analytics',
  };
  
  return mapping[pathname] || `/indian-market${pathname}`;
};

/**
 * Convert an Indian Market path to Forex path
 */
export const toForexPath = (pathname) => {
  if (!pathname || !pathname.startsWith('/indian-market')) {
    return pathname;
  }
  
  return pathname.replace('/indian-market', '') || '/dashboard';
};

/**
 * Get base API URL based on market
 */
export const getApiBaseUrl = (market) => {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  
  return market === MARKETS.INDIAN_MARKET
    ? `${BASE_URL}/indian`
    : BASE_URL;
};

/**
 * Get full API endpoint for trades
 */
export const getTradesApiUrl = (market, endpoint = '') => {
  const base = getApiBaseUrl(market);
  return `${base}/trades${endpoint}`;
};

/**
 * Get full API endpoint for analytics
 */
export const getAnalyticsApiUrl = (market, endpoint = '') => {
  const base = getApiBaseUrl(market);
  return `${base}/analytics${endpoint}`;
};

export default {
  getDashboardUrl,
  getAddTradeUrl,
  getAnalyticsUrl,
  getTradesUrl,
  getEditTradeUrl,
  getTradeDetailUrl,
  getMarketPath,
  isIndianMarketPath,
  toIndianMarketPath,
  toForexPath,
  getApiBaseUrl,
  getTradesApiUrl,
  getAnalyticsApiUrl
};
