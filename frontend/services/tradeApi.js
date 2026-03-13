import { API_URL as BASE_URL } from "@/config/api";

// Helper to get base URL based on market
const getBaseUrl = (marketType) => {
  if (marketType === 'Indian_Market') {
    return `${BASE_URL}/indian`;
  }
  return BASE_URL;
};

const handleResponse = async (res) => {
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
      return new Promise(() => {});
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  return res.json();
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

  return handleResponse(res);
};



export const getTrades = async (marketType = 'Forex') => {
  const token = localStorage.getItem("token");
  const baseUrl = getBaseUrl(marketType);
  const url = marketType === 'Indian_Market' ? `${baseUrl}/trades` : `${baseUrl}/trades`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return handleResponse(res);
};

export const getTrade = async (id, marketType = 'Forex') => {
  const token = localStorage.getItem("token");
  const baseUrl = getBaseUrl(marketType);
  const res = await fetch(`${baseUrl}/trades/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return handleResponse(res);
};

export const deleteTrade = async (id, marketType = 'Forex') => {
  const token = localStorage.getItem("token");
  const baseUrl = getBaseUrl(marketType);
  const res = await fetch(`${baseUrl}/trades/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  return handleResponse(res);
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
  return handleResponse(res);
};
