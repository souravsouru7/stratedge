"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { loginUser, googleLogin, testConnection as apiTestConnection } from "@/services/api";
import { signInWithFirebaseGoogle, handleGoogleRedirectResult } from "@/services/firebaseAuth";

/**
 * useLogin
 * Manages login form state, terms acceptance gate, and authentication mutations.
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

  // Terms were accepted at registration — login never re-checks them

  useEffect(() => {
    setMounted(true);
    const token = typeof window !== "undefined" && localStorage.getItem("token");
    if (token) { router.push("/dashboard"); return; }

    // Pick up the idToken after a mobile redirect Google sign-in
    handleGoogleRedirectResult()
      .then(idToken => { if (idToken) return googleLogin(idToken); })
      .then(data => { if (data) handleAuthSuccess(data); })
      .catch(err => alert("Google login failed: " + (err?.message || err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  /** Shared post-auth redirect: if backend signals terms not yet accepted,
   *  store the token and go to /accept-terms; otherwise go straight to dashboard. */
  const handleAuthSuccess = (data) => {
    if (!data.token) {
      triggerShake();
      alert(data.message || "Login failed");
      return;
    }
    localStorage.setItem("token", data.token);
    queryClient.clear();
    if (data.requiresTermsAcceptance) {
      router.push("/accept-terms");
    } else {
      router.push("/dashboard");
    }
  };

  // 3. Email/Password Login Mutation
  const loginMutation = useMutation({
    mutationFn: (credentials) => loginUser(credentials),
    onSuccess: handleAuthSuccess,
    onError: (err) => {
      triggerShake();
      alert("Login Error: " + (err.message || "Check your credentials."));
    },
  });

  // 4. Google Sign-In Mutation
  const googleMutation = useMutation({
    mutationFn: async () => {
      const idToken = await signInWithFirebaseGoogle();
      if (!idToken) return null;
      return googleLogin(idToken);
    },
    onSuccess: (data) => {
      if (!data) return;
      handleAuthSuccess(data);
    },
    onError: (err) => {
      triggerShake();
      alert("Google login failed: " + (err.message || "Could not connect to Google."));
    },
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
