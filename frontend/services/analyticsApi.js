import { API_URL as BASE_URL } from "@/config/api";

const normalizeMarketType = (marketType) => {
  if (typeof marketType === "string") {
    return marketType === "Indian_Market" ? "Indian_Market" : "Forex";
  }
  if (marketType && typeof marketType === "object") {
    const candidate = marketType.value || marketType.marketType || marketType.id || marketType.key;
    if (typeof candidate === "string") {
      return candidate === "Indian_Market" ? "Indian_Market" : "Forex";
    }
  }
  return "Forex";
};

const normalizeInstrumentType = (instrumentType) => {
  if (typeof instrumentType === "string") {
    return instrumentType.trim();
  }
  if (instrumentType && typeof instrumentType === "object") {
    const candidate = instrumentType.value || instrumentType.instrumentType || instrumentType.id || instrumentType.key;
    if (typeof candidate === "string") {
      return candidate.trim();
    }
  }
  return "";
};

const buildAnalyticsUrl = (baseUrl, marketType, extraParams = {}) => {
  const params = new URLSearchParams({
    marketType: normalizeMarketType(marketType),
  });

  Object.entries(extraParams).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const normalized = key === "instrumentType" ? normalizeInstrumentType(value) : String(value).trim();
    if (normalized) params.set(key, normalized);
  });

  return `${baseUrl}?${params.toString()}`;
};

// Helper to get base URL based on market
const getBaseUrl = (marketType) => {
  if (normalizeMarketType(marketType) === "Indian_Market") {
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

// Basic Analytics
export const getSummary = async (marketType = 'Forex', instrumentType = '') => {
  const baseUrl = getBaseUrl(marketType);
  return fetchWithRateLimitRetry(buildAnalyticsUrl(`${baseUrl}/analytics/summary`, marketType, { instrumentType }), getAuthHeaders());
};

export const getWeeklyStats = async (marketType = 'Forex', instrumentType = '') => {
  const baseUrl = getBaseUrl(marketType);
  return fetchWithRateLimitRetry(buildAnalyticsUrl(`${baseUrl}/analytics/weekly`, marketType, { instrumentType }), getAuthHeaders());
};

// Advanced Analytics
export const getRiskRewardAnalysis = async (marketType = 'Forex', instrumentType = '') => {
  const baseUrl = getBaseUrl(marketType);
  return fetchWithRateLimitRetry(buildAnalyticsUrl(`${baseUrl}/analytics/risk-reward`, marketType, { instrumentType }), getAuthHeaders());
};

export const getTradeDistribution = async (marketType = 'Forex', instrumentType = '') => {
  const baseUrl = getBaseUrl(marketType);
  return fetchWithRateLimitRetry(buildAnalyticsUrl(`${baseUrl}/analytics/distribution`, marketType, { instrumentType }), getAuthHeaders());
};

export const getPerformanceMetrics = async (marketType = 'Forex', instrumentType = '') => {
  const baseUrl = getBaseUrl(marketType);
  return fetchWithRateLimitRetry(buildAnalyticsUrl(`${baseUrl}/analytics/performance`, marketType, { instrumentType }), getAuthHeaders());
};

export const getTimeAnalysis = async (marketType = 'Forex', range = 'all', instrumentType = '') => {
  const baseUrl = getBaseUrl(marketType);
  return fetchWithRateLimitRetry(buildAnalyticsUrl(`${baseUrl}/analytics/time-analysis`, marketType, { range, instrumentType }), getAuthHeaders());
};

export const getTradeQuality = async (marketType = 'Forex', instrumentType = '') => {
  const baseUrl = getBaseUrl(marketType);
  return fetchWithRateLimitRetry(buildAnalyticsUrl(`${baseUrl}/analytics/quality`, marketType, { instrumentType }), getAuthHeaders());
};

export const getDrawdownAnalysis = async (marketType = 'Forex', instrumentType = '') => {
  const baseUrl = getBaseUrl(marketType);
  return fetchWithRateLimitRetry(buildAnalyticsUrl(`${baseUrl}/analytics/drawdown`, marketType, { instrumentType }), getAuthHeaders());
};

export const getAIInsights = async (marketType = 'Forex', instrumentType = '') => {
  const baseUrl = getBaseUrl(marketType);
  return fetchWithRateLimitRetry(buildAnalyticsUrl(`${baseUrl}/analytics/ai-insights`, marketType, { instrumentType }), getAuthHeaders());
};

// All-in-one advanced analytics
export const getAdvancedAnalytics = async (marketType = 'Forex') => {
  const baseUrl = getBaseUrl(marketType);
  return fetchWithRateLimitRetry(buildAnalyticsUrl(`${baseUrl}/analytics/advanced`, marketType), getAuthHeaders());
};

export const getPnLBreakdown = async (marketType = 'Forex', instrumentType = '') => {
  const baseUrl = getBaseUrl(marketType);
  return fetchWithRateLimitRetry(buildAnalyticsUrl(`${baseUrl}/analytics/pnl-breakdown`, marketType, { instrumentType }), getAuthHeaders());
};

export const getPsychologyAnalytics = async (marketType = 'Forex', instrumentType = '') => {
  const baseUrl = getBaseUrl(marketType);
  return fetchWithRateLimitRetry(buildAnalyticsUrl(`${baseUrl}/analytics/psychology`, marketType, { instrumentType }), getAuthHeaders());
};
