"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/services/notificationApi";

function openNotification(notification) {
  if (notification.deepLink) {
    window.location.href = notification.deepLink;
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await getNotifications({ limit: 75 });
      setNotifications(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  return (
    <main style={{ minHeight: "100vh", background: "#020617", color: "#E5E7EB", padding: "24px 16px" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Bell size={24} color="#38BDF8" />
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Notifications</h1>
              <p style={{ margin: "4px 0 0", color: "#94A3B8", fontSize: 14 }}>{unreadCount} unread</p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await markAllNotificationsAsRead();
              await loadNotifications();
            }}
            disabled={!unreadCount}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              border: "1px solid #334155",
              background: unreadCount ? "#0F172A" : "#111827",
              color: unreadCount ? "#E5E7EB" : "#64748B",
              borderRadius: 8,
              padding: "10px 12px",
              cursor: unreadCount ? "pointer" : "not-allowed",
            }}
          >
            <CheckCheck size={16} />
            Mark all read
          </button>
        </header>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#94A3B8" }}>
            <Loader2 size={18} className="animate-spin" />
            Loading notifications
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ border: "1px solid #1E293B", borderRadius: 8, padding: 24, color: "#94A3B8" }}>
            No notifications yet.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {notifications.map((notification) => (
              <button
                key={notification._id}
                type="button"
                onClick={async () => {
                  if (!notification.isRead) {
                    await markNotificationAsRead(notification._id);
                  }
                  openNotification(notification);
                }}
                style={{
                  textAlign: "left",
                  border: `1px solid ${notification.isRead ? "#1E293B" : "#38BDF8"}`,
                  background: notification.isRead ? "#020617" : "#082F49",
                  color: "#E5E7EB",
                  borderRadius: 8,
                  padding: 16,
                  cursor: notification.deepLink ? "pointer" : "default",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <strong style={{ fontSize: 15 }}>{notification.title}</strong>
                  <span style={{ color: "#94A3B8", fontSize: 12, whiteSpace: "nowrap" }}>
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ margin: "8px 0 0", color: "#CBD5E1", fontSize: 14, lineHeight: 1.5 }}>
                  {notification.body}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
