const BASE_URL = "http://localhost:5000/api";

export const createTrade = async (tradeData) => {
  const token = localStorage.getItem("token");

  const res = await fetch(`${BASE_URL}/trades`, {
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



export const getTrades = async () => {

  const token = localStorage.getItem("token");

  const res = await fetch(`${BASE_URL}/trades`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return res.json();
};



export const getTrade = async (id) => {

  const token = localStorage.getItem("token");

  const res = await fetch(`${BASE_URL}/trades/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return res.json();
};



export const deleteTrade = async (id) => {

  const token = localStorage.getItem("token");

  const res = await fetch(`${BASE_URL}/trades/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return res.json();
};



export const updateTrade = async (id, tradeData) => {

  const token = localStorage.getItem("token");

  const res = await fetch(`${BASE_URL}/trades/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(tradeData)
  });

  return res.json();
};
