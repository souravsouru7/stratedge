import { API_URL } from "@/config/api";

export const fetchSetups = async (marketType = "Forex") => {
  const token = localStorage.getItem("token");
  const params = new URLSearchParams({ marketType });
  const res = await fetch(`${API_URL}/setups?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Failed to load setups");
  }

  return data;
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

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Failed to save setups");
  }

  return data;
};

