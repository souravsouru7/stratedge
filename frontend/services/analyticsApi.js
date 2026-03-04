const BASE_URL = "http://localhost:5000/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

// Basic Analytics
export const getSummary = async () => {
  const res = await fetch(`${BASE_URL}/analytics/summary`, getAuthHeaders());
  return res.json();
};

export const getWeeklyStats = async () => {
  const res = await fetch(`${BASE_URL}/analytics/weekly`, getAuthHeaders());
  return res.json();
};

// Advanced Analytics
export const getRiskRewardAnalysis = async () => {
  const res = await fetch(`${BASE_URL}/analytics/risk-reward`, getAuthHeaders());
  return res.json();
};

export const getTradeDistribution = async () => {
  const res = await fetch(`${BASE_URL}/analytics/distribution`, getAuthHeaders());
  return res.json();
};

export const getPerformanceMetrics = async () => {
  const res = await fetch(`${BASE_URL}/analytics/performance`, getAuthHeaders());
  return res.json();
};

export const getTimeAnalysis = async () => {
  const res = await fetch(`${BASE_URL}/analytics/time`, getAuthHeaders());
  return res.json();
};

export const getTradeQuality = async () => {
  const res = await fetch(`${BASE_URL}/analytics/quality`, getAuthHeaders());
  return res.json();
};

export const getDrawdownAnalysis = async () => {
  const res = await fetch(`${BASE_URL}/analytics/drawdown`, getAuthHeaders());
  return res.json();
};

export const getAIInsights = async () => {
  const res = await fetch(`${BASE_URL}/analytics/insights`, getAuthHeaders());
  return res.json();
};

// All-in-one advanced analytics
export const getAdvancedAnalytics = async () => {
  const res = await fetch(`${BASE_URL}/analytics/advanced`, getAuthHeaders());
  return res.json();
};
