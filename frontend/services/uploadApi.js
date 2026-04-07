import apiClient from "./apiClient";

export const uploadTradeImage = async ({ file, marketType, broker }) => {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("marketType", marketType);
  if (broker) {
    formData.append("broker", broker);
  }

  // Pass formData directly. Axios automatically sets multipart/form-data.
  // Note: Since apiClient defaults to 'application/json', we override it.
  return await apiClient.post(`/upload?marketType=${marketType}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};
