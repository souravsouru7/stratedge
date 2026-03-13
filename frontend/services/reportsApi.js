import { API_URL as BASE_URL } from "@/config/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const handleResponse = async (res) => {
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
      return new Promise(() => {});
    }
    const errorText = await res.text();
    let errorMessage = `Request failed with status ${res.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorMessage;
    } catch (e) {
      // ignore
    }
    throw new Error(errorMessage);
  }
  return res.json();
};

export const listWeeklyReports = async (limit = 12, marketType = "Forex") => {
  const res = await fetch(
    `${BASE_URL}/reports/weekly?limit=${encodeURIComponent(limit)}&marketType=${encodeURIComponent(marketType)}`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(res);
};

export const getWeeklyReport = async (id) => {
  const res = await fetch(`${BASE_URL}/reports/weekly/${id}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const generateWeeklyFeedbackNow = async (marketType = "Forex") => {
  const res = await fetch(
    `${BASE_URL}/reports/weekly/generate-now?marketType=${encodeURIComponent(marketType)}`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    }
  );
  return handleResponse(res);
};

