import { API_URL as BASE_URL } from "@/config/api";

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

const fetchWithRateLimitRetry = async (url, options, maxRetries = 2) => {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const res = await fetch(url, options);
    if (res.status !== 429) {
      return handleResponse(res);
    }

    if (attempt >= maxRetries) {
      return handleResponse(res);
    }

    const delayMs = getRetryDelayMs(res, attempt);
    await sleep(delayMs);
  }

  throw new Error("Failed to complete request after retries.");
};

// Basic Analytics
export const getSummary = async (marketType = 'Forex') => {
  const baseUrl = getBaseUrl(marketType);
  return fetchWithRateLimitRetry(`${baseUrl}/analytics/summary?marketType=${marketType}`, getAuthHeaders());
};

export const getWeeklyStats = async (marketType = 'Forex') => {
  const baseUrl = getBaseUrl(marketType);
  return fetchWithRateLimitRetry(`${baseUrl}/analytics/weekly?marketType=${marketType}`, getAuthHeaders());
};

// Advanced Analytics
export const getRiskRewardAnalysis = async (marketType = 'Forex') => {
  const baseUrl = getBaseUrl(marketType);
  return fetchWithRateLimitRetry(`${baseUrl}/analytics/risk-reward?marketType=${marketType}`, getAuthHeaders());
};

export const getTradeDistribution = async (marketType = 'Forex') => {
  const baseUrl = getBaseUrl(marketType);
  return fetchWithRateLimitRetry(`${baseUrl}/analytics/distribution?marketType=${marketType}`, getAuthHeaders());
};

export const getPerformanceMetrics = async (marketType = 'Forex') => {
  const baseUrl = getBaseUrl(marketType);
  return fetchWithRateLimitRetry(`${baseUrl}/analytics/performance?marketType=${marketType}`, getAuthHeaders());
};

export const getTimeAnalysis = async (marketType = 'Forex', range = 'all') => {
  const baseUrl = getBaseUrl(marketType);
  return fetchWithRateLimitRetry(`${baseUrl}/analytics/time-analysis?marketType=${marketType}&range=${encodeURIComponent(range)}`, getAuthHeaders());
};

export const getTradeQuality = async (marketType = 'Forex') => {
  const baseUrl = getBaseUrl(marketType);
  return fetchWithRateLimitRetry(`${baseUrl}/analytics/quality?marketType=${marketType}`, getAuthHeaders());
};

export const getDrawdownAnalysis = async (marketType = 'Forex') => {
  const baseUrl = getBaseUrl(marketType);
  return fetchWithRateLimitRetry(`${baseUrl}/analytics/drawdown?marketType=${marketType}`, getAuthHeaders());
};

export const getAIInsights = async (marketType = 'Forex') => {
  const baseUrl = getBaseUrl(marketType);
  return fetchWithRateLimitRetry(`${baseUrl}/analytics/ai-insights?marketType=${marketType}`, getAuthHeaders());
};

// All-in-one advanced analytics
export const getAdvancedAnalytics = async (marketType = 'Forex') => {
  const baseUrl = getBaseUrl(marketType);
  return fetchWithRateLimitRetry(`${baseUrl}/analytics/advanced?marketType=${marketType}`, getAuthHeaders());
};

export const getPnLBreakdown = async (marketType = 'Forex') => {
  const baseUrl = getBaseUrl(marketType);
  return fetchWithRateLimitRetry(`${baseUrl}/analytics/pnl-breakdown?marketType=${marketType}`, getAuthHeaders());
};

export const getPsychologyAnalytics = async (marketType = 'Forex') => {
  const baseUrl = getBaseUrl(marketType);
  return fetchWithRateLimitRetry(`${baseUrl}/analytics/psychology?marketType=${marketType}`, getAuthHeaders());
};
