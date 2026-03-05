const BASE_URL = "http://localhost:5000/api";

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

// Helper to handle fetch responses and prevent JSON syntax errors on 404/500
const handleResponse = async (res) => {
  if (!res.ok) {
    const errorText = await res.text();
    let errorMessage = `Request failed with status ${res.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorMessage;
    } catch (e) {
      // If not JSON, use the status text or first few chars of body
      console.error("Non-JSON error response received:", errorText.substring(0, 100));
    }
    throw new Error(errorMessage);
  }
  return res.json();
};

// Basic Analytics
export const getSummary = async (marketType = 'Forex') => {
  const baseUrl = getBaseUrl(marketType);
  const res = await fetch(`${baseUrl}/analytics/summary?marketType=${marketType}`, getAuthHeaders());
  return handleResponse(res);
};

export const getWeeklyStats = async (marketType = 'Forex') => {
  const baseUrl = getBaseUrl(marketType);
  const res = await fetch(`${baseUrl}/analytics/weekly?marketType=${marketType}`, getAuthHeaders());
  return handleResponse(res);
};

// Advanced Analytics
export const getRiskRewardAnalysis = async (marketType = 'Forex') => {
  const baseUrl = getBaseUrl(marketType);
  const res = await fetch(`${baseUrl}/analytics/risk-reward?marketType=${marketType}`, getAuthHeaders());
  return handleResponse(res);
};

export const getTradeDistribution = async (marketType = 'Forex') => {
  const baseUrl = getBaseUrl(marketType);
  const res = await fetch(`${baseUrl}/analytics/distribution?marketType=${marketType}`, getAuthHeaders());
  return handleResponse(res);
};

export const getPerformanceMetrics = async (marketType = 'Forex') => {
  const baseUrl = getBaseUrl(marketType);
  const res = await fetch(`${baseUrl}/analytics/performance?marketType=${marketType}`, getAuthHeaders());
  return handleResponse(res);
};

export const getTimeAnalysis = async (marketType = 'Forex') => {
  const baseUrl = getBaseUrl(marketType);
  const res = await fetch(`${baseUrl}/analytics/time-analysis?marketType=${marketType}`, getAuthHeaders());
  return handleResponse(res);
};

export const getTradeQuality = async (marketType = 'Forex') => {
  const baseUrl = getBaseUrl(marketType);
  const res = await fetch(`${baseUrl}/analytics/quality?marketType=${marketType}`, getAuthHeaders());
  return handleResponse(res);
};

export const getDrawdownAnalysis = async (marketType = 'Forex') => {
  const baseUrl = getBaseUrl(marketType);
  const res = await fetch(`${baseUrl}/analytics/drawdown?marketType=${marketType}`, getAuthHeaders());
  return handleResponse(res);
};

export const getAIInsights = async (marketType = 'Forex') => {
  const baseUrl = getBaseUrl(marketType);
  const res = await fetch(`${baseUrl}/analytics/ai-insights?marketType=${marketType}`, getAuthHeaders());
  return handleResponse(res);
};

// All-in-one advanced analytics
export const getAdvancedAnalytics = async (marketType = 'Forex') => {
  const baseUrl = getBaseUrl(marketType);
  const res = await fetch(`${baseUrl}/analytics/advanced?marketType=${marketType}`, getAuthHeaders());
  return handleResponse(res);
};
