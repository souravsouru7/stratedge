import { API_URL } from "@/config/api";

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

export const fetchSetups = async (marketType = "Forex") => {
  const token = localStorage.getItem("token");
  const params = new URLSearchParams({ marketType });
  const res = await fetch(`${API_URL}/setups?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(res);
};

export const saveSetups = async (strategies, marketType = "Forex") => {
  const token = localStorage.getItem("token");
  const params = new URLSearchParams({ marketType });
  const res = await fetch(`${API_URL}/setups?${params.toString()}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ strategies }),
  });

  return handleResponse(res);
};

