"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/services/api";

const colors = {
  bg: "#F0EEE9",
  card: "#FFFFFF",
  primary: "#0F1923",
  secondary: "#4A5568",
  muted: "#94A3B8",
  border: "#E2E8F0",
  accent: "#0D9E6E"
};

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.push("/login");
      return;
    }

    const loadProfile = async () => {
      try {
        const data = await getProfile();
        if (data && !data.message) {
          setProfile(data);
        } else if (data && data.message === "Not authorized") {
          router.push("/login");
        }
      } catch (e) {
        console.error("Failed to load profile", e);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  const joinedDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString()
    : "-";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bg,
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        color: colors.primary
      }}
    >
      <header
        style={{
          background: "rgba(255,255,255,0.95)",
          borderBottom: `1px solid ${colors.border}`,
          padding: "10px 24px",
          minHeight: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <Link
          href="/dashboard"
          style={{
            textDecoration: "none",
            color: colors.primary,
            display: "flex",
            alignItems: "center",
            gap: 12
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <img
              src="/mainlogo.png"
              alt="LOGNERA"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.06em"
              }}
            >
              LOGNERA
            </div>
            <div
              style={{
                fontSize: 9,
                color: colors.accent,
                letterSpacing: "0.14em",
                fontFamily: "'JetBrains Mono',monospace",
                marginTop: 1
              }}
            >
              PROFILE
            </div>
          </div>
        </Link>
      </header>

      <main
        style={{
          maxWidth: 720,
          margin: "24px auto",
          padding: "0 16px"
        }}
      >
        <div
          style={{
            background: colors.card,
            borderRadius: 14,
            border: `1px solid ${colors.border}`,
            boxShadow: "0 2px 12px rgba(15,25,35,0.06)",
            padding: 24
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 16
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: colors.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#22C78E",
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 20,
                textTransform: "uppercase"
              }}
            >
              {profile?.name ? profile.name.charAt(0) : "U"}
            </div>
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700
                }}
              >
                {profile?.name || "Loading..."}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: colors.muted
                }}
              >
                {profile?.email || ""}
              </div>
            </div>
          </div>

          {loading && (
            <div
              style={{
                fontSize: 12,
                color: colors.muted
              }}
            >
              Loading profile...
            </div>
          )}

          {!loading && (
            <>
              <div
                style={{
                  marginTop: 8,
                  paddingTop: 8,
                  borderTop: `1px solid ${colors.border}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  fontSize: 12
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: colors.muted }}>Name</span>
                  <span>{profile?.name || "-"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: colors.muted }}>Email</span>
                  <span>{profile?.email || "-"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: colors.muted }}>Member since</span>
                  <span>{joinedDate}</span>
                </div>
              </div>

              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  flexWrap: "wrap"
                }}
              >
                <Link
                  href="/analytics"
                  style={{
                    fontSize: 11,
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    textDecoration: "none",
                    color: colors.secondary
                  }}
                >
                  View analytics →
                </Link>

                <button
                  onClick={() => {
                    localStorage.removeItem("token");
                    router.push("/login");
                  }}
                  style={{
                    fontSize: 11,
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "1px solid rgba(214,59,59,0.3)",
                    background: "rgba(214,59,59,0.06)",
                    color: "#D63B3B",
                    cursor: "pointer"
                  }}
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

