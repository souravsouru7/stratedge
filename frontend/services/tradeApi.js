import { API_URL as BASE_URL } from "@/config/api";

// Helper to get base URL based on market
const getBaseUrl = (marketType) => {
  if (marketType === 'Indian_Market') {
    return `${BASE_URL}/indian`;
  }
  return BASE_URL;
};

export const createTrade = async (tradeData, marketType = 'Forex') => {
  const token = localStorage.getItem("token");

  // Use dedicated Indian Market endpoint if applicable
  const baseUrl = marketType === 'Indian_Market'
    ? `${BASE_URL}/indian`
    : BASE_URL;

  const res = await fetch(`${baseUrl}/trades`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(tradeData)
  });

  // Parse response - throw error if not OK
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Failed to create trade");
  }

  return data;
};



export const getTrades = async (marketType = 'Forex') => {
  const token = localStorage.getItem("token");
  const baseUrl = getBaseUrl(marketType);
  const url = marketType === 'Indian_Market' ? `${baseUrl}/trades` : `${baseUrl}/trades`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
};

export const getTrade = async (id, marketType = 'Forex') => {
  const token = localStorage.getItem("token");
  const baseUrl = getBaseUrl(marketType);
  const res = await fetch(`${baseUrl}/trades/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
};

export const deleteTrade = async (id, marketType = 'Forex') => {
  const token = localStorage.getItem("token");
  const baseUrl = getBaseUrl(marketType);
  const res = await fetch(`${baseUrl}/trades/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
};

export const updateTrade = async (id, tradeData, marketType = 'Forex') => {
  const token = localStorage.getItem("token");
  const baseUrl = getBaseUrl(marketType);
  const res = await fetch(`${baseUrl}/trades/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(tradeData)
  });
  return res.json();
};
