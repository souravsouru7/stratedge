"use client";

import { useEffect } from "react";

export default function RootPage() {
  useEffect(() => {
    const token = localStorage.getItem("token");
    window.location.replace(token ? "/dashboard" : "/login");
  }, []);

  return null;
}
