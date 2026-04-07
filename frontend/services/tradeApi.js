import apiClient from "./apiClient";

// Helper to get URL path prefix based on market
const getMarketPath = (marketType) => {
  if (marketType === 'Indian_Market') {
    return `/indian`;
  }
  return ``;
};

export const createTrade = async (tradeData, marketType = 'Forex') => {
  const path = getMarketPath(marketType);
  // apiClient handles the 'Authorization' header and response data returning!
  return await apiClient.post(`${path}/trades`, tradeData);
};

export const getTrades = async (marketType = 'Forex') => {
  const path = getMarketPath(marketType);
  return await apiClient.get(`${path}/trades`);
};

export const getTrade = async (id, marketType = 'Forex') => {
  const path = getMarketPath(marketType);
  return await apiClient.get(`${path}/trades/${id}`);
};

export const getTradeStatus = async (id) => {
  return await apiClient.get(`/trade/status/${id}`);
};

export const deleteTrade = async (id, marketType = 'Forex') => {
  const path = getMarketPath(marketType);
  return await apiClient.delete(`${path}/trades/${id}`);
};

export const updateTrade = async (id, tradeData, marketType = 'Forex') => {
  const path = getMarketPath(marketType);
  return await apiClient.put(`${path}/trades/${id}`, tradeData);
};
