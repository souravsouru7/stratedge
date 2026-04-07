"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * useAuth
 * Redirects to /login if no token is found in localStorage.
 * Call this at the top of any protected page.
 */
export function useAuth() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);
}
