import { API_URL as BASE_URL } from "@/config/api";

const handleResponse = async (res, redirectOnAuthError = true) => {
  if (!res.ok) {
    if (res.status === 401 && redirectOnAuthError && typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
      return new Promise(() => {});
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  return res.json();
};

export const registerUser = async (data) => {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  return handleResponse(res, false);
};

export const loginUser = async (data) => {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  return handleResponse(res, false);
};

export const googleLogin = async (credential) => {
  const res = await fetch(`${BASE_URL}/auth/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ credential })
  });

  return handleResponse(res, false);
};

// Get basic profile of the logged-in user
export const getProfile = async () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const res = await fetch(`${BASE_URL}/auth/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  return handleResponse(res, true);
};

export const forgotPassword = async (email) => {
  const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email })
  });

  return handleResponse(res, false);
};

export const verifyOTP = async (email, otp) => {
  const res = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, otp })
  });

  return handleResponse(res, false);
};

export const resetPassword = async (email, otp, password) => {
  const res = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, otp, password })
  });

  return handleResponse(res, false);
};