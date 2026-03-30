import { API_URL as BASE_URL } from "@/config/api";

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

export const uploadTradeImage = async ({ file, marketType, broker }) => {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("image", file);
  formData.append("marketType", marketType);
  if (broker) {
    formData.append("broker", broker);
  }

  const res = await fetch(`${BASE_URL}/upload?marketType=${marketType}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  return handleResponse(res);
};
