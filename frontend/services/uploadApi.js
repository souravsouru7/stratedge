import apiClient from "./apiClient";

export const uploadTradeImage = async ({ file, marketType, broker, tradeSubType }) => {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("marketType", marketType);
  if (broker) formData.append("broker", broker);
  if (tradeSubType) formData.append("tradeSubType", tradeSubType);

  return await apiClient.post(`/upload?marketType=${marketType}`, formData);
};
