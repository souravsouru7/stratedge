"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { loginUser, googleLogin, testConnection as apiTestConnection } from "@/services/api";
import { signInWithFirebaseGoogle } from "@/services/firebaseAuth";

/**
 * useLogin
 * Refactored to use TanStack Query mutations for robust authentication handling.
 * Manages form state, animation triggers, and redirection logic.
 */
export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // 1. Local UI State
  const [form, setForm]               = useState({ email: "", password: "" });
  const [focused, setFocused]         = useState(null);
  const [showPass, setShowPass]       = useState(false);
  const [mounted, setMounted]         = useState(false);
  const [shake, setShake]             = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = typeof window !== "undefined" && localStorage.getItem("token");
    if (token) router.push("/dashboard");
  }, [router]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  // 2. Email/Password Login Mutation
  const loginMutation = useMutation({
    mutationFn: (credentials) => loginUser(credentials),
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem("token", data.token);
        // Clear all previous queries to ensure new user starts with fresh data
        queryClient.clear();
        router.push("/dashboard");
      } else {
        triggerShake();
        alert(data.message || "Login failed");
      }
    },
    onError: (err) => {
      triggerShake();
      alert("Manual Login Error: " + (err.message || "Check your credentials."));
    }
  });

  // 3. Google Sign-In Mutation
  const googleMutation = useMutation({
    mutationFn: async () => {
      const idToken = await signInWithFirebaseGoogle();
      return googleLogin(idToken);
    },
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem("token", data.token);
        queryClient.clear();
        router.push("/dashboard");
      } else {
        triggerShake();
        alert(data.message || "Google login failed.");
      }
    },
    onError: (err) => {
      triggerShake();
      alert("Google login failed: " + (err.message || "Could not connect to Google."));
    }
  });

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    loginMutation.mutate(form);
  };

  const handleGoogleSignIn = () => {
    googleMutation.mutate();
  };

  const testConnection = async () => {
    try {
      await apiTestConnection();
      alert("Connection test SUCCESS");
    } catch (err) {
      alert("Connection test ERROR: " + err.message);
    }
  };

  return {
    form, handleChange,
    focused, setFocused,
    loading: loginMutation.isPending, 
    googleLoading: googleMutation.isPending,
    showPass, setShowPass,
    mounted, shake,
    handleSubmit,
    handleGoogleSignIn,
    testConnection,
  };
}
