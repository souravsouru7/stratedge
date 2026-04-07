import apiClient from "./apiClient";

export const fetchSetups = async (marketType = "Forex") => {
  const params = new URLSearchParams({ marketType });
  return await apiClient.get(`/setups?${params.toString()}`);
};

export const saveSetups = async (strategies, marketType = "Forex") => {
  const params = new URLSearchParams({ marketType });
  return await apiClient.put(`/setups?${params.toString()}`, { strategies });
};
