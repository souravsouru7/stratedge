"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      router.replace(token ? "/dashboard" : "/login");
    } catch {
      router.replace("/login");
    }
  }, [router]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#F0EEE9",
        color: "#0F1923",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <img
          src="/mainlogo1.png"
          alt="Edgecipline"
          style={{
            width: 180,
            maxWidth: "70vw",
            height: "auto",
            objectFit: "contain",
            display: "block",
            margin: "0 auto",
          }}
        />
      </div>
    </main>
  );
}
