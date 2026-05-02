import { API_URL as BASE_URL } from "@/config/api";

const DEFAULT_MARKET = "Forex";
const VALID_MARKETS = new Set(["Forex", "Crypto", "Commodities", "Indices", "Stocks", "Indian_Market"]);

const normalizeMarketType = (marketType) => {
  if (typeof marketType !== "string") return DEFAULT_MARKET;
  const trimmed = marketType.trim();
  return VALID_MARKETS.has(trimmed) ? trimmed : DEFAULT_MARKET;
};

const normalizeTextParam = (value, fallback = "") => {
  if (typeof value !== "string") return fallback;
  return value.trim() || fallback;
};

// Helper to get base URL based on market
const getBaseUrl = (marketType) => {
  if (marketType === 'Indian_Market') {
    return `${BASE_URL}/indian`;
  }
  return BASE_URL;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getRetryDelayMs = (res, attempt) => {
  const retryAfter = res.headers.get("Retry-After");
  if (retryAfter) {
    const asSeconds = Number(retryAfter);
    if (!Number.isNaN(asSeconds)) {
      return Math.max(0, asSeconds * 1000);
    }

    const asDate = Date.parse(retryAfter);
    if (!Number.isNaN(asDate)) {
      return Math.max(0, asDate - Date.now());
    }
  }

  // Fallback exponential backoff with a tiny jitter.
  const base = 700;
  const jitter = Math.floor(Math.random() * 250);
  return base * Math.pow(2, attempt) + jitter;
};

// Helper to handle fetch responses and prevent JSON syntax errors on 404/500
const handleResponse = async (res) => {
  if (!res.ok) {
    const errorText = await res.text();
    let errorMessage = `Request failed with status ${res.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorMessage;
    } catch (e) {
      console.error("Non-JSON error response received:", errorText.substring(0, 100));
    }

    const authFailure =
      res.status === 401 ||
      (res.status === 403 &&
        /invalid token|not authorized|token expired|no token/i.test(String(errorMessage)));
    if (authFailure && typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
      return new Promise(() => {});
    }

    throw new Error(errorMessage);
  }
  return res.json();
};

const fetchWithRateLimitRetry = async (url, options, maxRetries = 4) => {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    // Small random stagger so concurrent requests don't all retry in sync
    if (attempt > 0) {
      const delayMs = getRetryDelayMs({ headers: { get: () => null } }, attempt - 1);
      await sleep(delayMs);
    }

    let res;
    try {
      res = await fetch(url, options);
    } catch (networkErr) {
      if (attempt >= maxRetries) throw networkErr;
      continue;
    }

    if (res.status !== 429) {
      return handleResponse(res);
    }

    if (attempt >= maxRetries) {
      // Return null instead of throwing so one failed endpoint doesn't crash the whole page
      console.warn(`Rate limit persisted after ${maxRetries} retries for: ${url}`);
      return null;
    }

    const delayMs = getRetryDelayMs(res, attempt);
    await sleep(delayMs);
  }

  return null;
};

const buildAnalyticsUrl = (marketType, path, params = {}) => {
  const safeMarketType = normalizeMarketType(marketType);
  const searchParams = new URLSearchParams({ marketType: safeMarketType });

  Object.entries(params).forEach(([key, value]) => {
    const safeValue = normalizeTextParam(value);
    if (safeValue) searchParams.set(key, safeValue);
  });

  return `${getBaseUrl(safeMarketType)}${path}?${searchParams.toString()}`;
};

// Basic Analytics
export const getSummary = async (marketType = 'Forex', instrumentType = '') => {
  return fetchWithRateLimitRetry(buildAnalyticsUrl(marketType, "/analytics/summary", { instrumentType }), getAuthHeaders());
};

export const getWeeklyStats = async (marketType = 'Forex', instrumentType = '') => {
  return fetchWithRateLimitRetry(buildAnalyticsUrl(marketType, "/analytics/weekly", { instrumentType }), getAuthHeaders());
};

// Advanced Analytics
export const getRiskRewardAnalysis = async (marketType = 'Forex', instrumentType = '') => {
  return fetchWithRateLimitRetry(buildAnalyticsUrl(marketType, "/analytics/risk-reward", { instrumentType }), getAuthHeaders());
};

export const getTradeDistribution = async (marketType = 'Forex', instrumentType = '') => {
  return fetchWithRateLimitRetry(buildAnalyticsUrl(marketType, "/analytics/distribution", { instrumentType }), getAuthHeaders());
};

export const getPerformanceMetrics = async (marketType = 'Forex', instrumentType = '') => {
  return fetchWithRateLimitRetry(buildAnalyticsUrl(marketType, "/analytics/performance", { instrumentType }), getAuthHeaders());
};

export const getTimeAnalysis = async (marketType = 'Forex', range = 'all', instrumentType = '') => {
  return fetchWithRateLimitRetry(buildAnalyticsUrl(marketType, "/analytics/time-analysis", { range: normalizeTextParam(range, "all"), instrumentType }), getAuthHeaders());
};

export const getTradeQuality = async (marketType = 'Forex', instrumentType = '') => {
  return fetchWithRateLimitRetry(buildAnalyticsUrl(marketType, "/analytics/quality", { instrumentType }), getAuthHeaders());
};

export const getDrawdownAnalysis = async (marketType = 'Forex', instrumentType = '') => {
  return fetchWithRateLimitRetry(buildAnalyticsUrl(marketType, "/analytics/drawdown", { instrumentType }), getAuthHeaders());
};

export const getAIInsights = async (marketType = 'Forex', instrumentType = '') => {
  return fetchWithRateLimitRetry(buildAnalyticsUrl(marketType, "/analytics/ai-insights", { instrumentType }), getAuthHeaders());
};

// All-in-one advanced analytics
export const getAdvancedAnalytics = async (marketType = 'Forex') => {
  return fetchWithRateLimitRetry(buildAnalyticsUrl(marketType, "/analytics/advanced"), getAuthHeaders());
};

export const getPnLBreakdown = async (marketType = 'Forex', instrumentType = '') => {
  return fetchWithRateLimitRetry(buildAnalyticsUrl(marketType, "/analytics/pnl-breakdown", { instrumentType }), getAuthHeaders());
};

export const getPsychologyAnalytics = async (marketType = 'Forex', instrumentType = '') => {
  return fetchWithRateLimitRetry(buildAnalyticsUrl(marketType, "/analytics/psychology", { instrumentType }), getAuthHeaders());
};
