"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  getAllAdminUsers, 
  deleteAdminUser, 
  toggleAdminUserStatus, 
  extendAdminUserPlan 
} from "@/services/adminApi";

import AdminHeader from "@/components/AdminHeader";

/* ─────────────────────────────────────────
   USER MANAGEMENT PAGE – Light theme
───────────────────────────────────────── */
export default function UserManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mounted, setMounted] = useState(false);
  const [extendingId, setExtendingId] = useState(null);
  const [extensionDays, setExtensionDays] = useState(30);

  useEffect(() => {
    setMounted(true);
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllAdminUsers();
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        setError("Failed to fetch users");
      }
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    try {
      await deleteAdminUser(id);
      setSuccess("User deleted successfully");
      fetchUsers();
    } catch (err) {
      setError(err.message || "Deletion failed");
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await toggleAdminUserStatus(id);
      setSuccess("Status updated");
      fetchUsers();
    } catch (err) {
      setError(err.message || "Update failed");
    }
  };

  const handleExtend = async (id) => {
    try {
      await extendUserPlan(id, extensionDays);
      setSuccess(`Plan extended by ${extensionDays} days`);
      setExtendingId(null);
      fetchUsers();
    } catch (err) {
      setError(err.message || "Extension failed");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active": return "#0D9E6E";
      case "expired": return "#D63B3B";
      default: return "#94A3B8";
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#F0EEE9",
      fontFamily: "'Plus Jakarta Sans',sans-serif",
      color: "#0F1923",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <AdminHeader title="USER MANAGEMENT" subtitle="ADMIN PORTAL" />

      {/* Accent bar */}
      <div style={{ height: 3, background: "linear-gradient(90deg,#B8860B 0%,#0D9E6E 50%,#B8860B 100%)" }} />

      <main style={{ padding: "32px 28px", maxWidth: 1400, margin: "0 auto" }}>
        
        {/* Alerts */}
        {error && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#B91C1C", padding: "12px 16px", borderRadius: 8, marginBottom: 20, fontSize: 13, display: "flex", justifyContent: "space-between" }}>
            {error} <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}>×</button>
          </div>
        )}
        {success && (
          <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", color: "#15803D", padding: "12px 16px", borderRadius: 8, marginBottom: 20, fontSize: 13, display: "flex", justifyContent: "space-between" }}>
            {success} <button onClick={() => setSuccess("")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}>×</button>
          </div>
        )}

        <div style={{
          background: "white", borderRadius: 16, border: "1px solid #E2E8F0",
          boxShadow: "0 1px 6px rgba(0,0,0,0.05)", overflow: "hidden"
        }}>
          <div style={{ padding: "24px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0F1923", margin: 0 }}>Registered Users</h2>
            <div style={{ color: "#94A3B8", fontSize: 12, fontFamily: "'JetBrains Mono',monospace" }}>{users.length} TOTAL USERS</div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #F1F5F9", background: "#F8FAFC" }}>
                  <th style={{ padding: "16px 24px", fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.05em" }}>USER</th>
                  <th style={{ padding: "16px 24px", fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.05em" }}>PLAN STATUS</th>
                  <th style={{ padding: "16px 24px", fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.05em" }}>SIGNUP DATE</th>
                  <th style={{ padding: "16px 24px", fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.05em" }}>EXPIRY</th>
                  <th style={{ padding: "16px 24px", fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.05em" }}>TRADES</th>
                  <th style={{ padding: "16px 24px", fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.05em", textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ padding: "40px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>Loading users...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: "40px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>No users found.</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user._id} style={{ borderBottom: "1px solid #F1F5F9", fontSize: 13, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#FBFBFA"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontWeight: 700, color: "#0F1923" }}>{user.name}</div>
                        <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace" }}>{user.email}</div>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          padding: "4px 10px", borderRadius: 20, 
                          background: `${getStatusColor(user.subscriptionStatus)}12`,
                          color: getStatusColor(user.subscriptionStatus),
                          fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em"
                        }}>
                          <div style={{ width: 5, height: 5, borderRadius: "50%", background: getStatusColor(user.subscriptionStatus) }} />
                          {user.subscriptionStatus || "inactive"}
                        </div>
                        <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 4 }}>{user.subscriptionPlan?.toUpperCase() || "FREE"}</div>
                      </td>
                      <td style={{ padding: "16px 24px", color: "#4A5568", fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "16px 24px", color: "#4A5568", fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>
                        {user.subscriptionExpiry ? new Date(user.subscriptionExpiry).toLocaleDateString() : "N/A"}
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                         <div style={{ fontWeight: 700, color: "#0F1923" }}>{user.tradeCount || 0}</div>
                         <div style={{ fontSize: 9, color: "#94A3B8", display: "flex", gap: 4 }}>
                            <span>F:{user.forexTradeCount || 0}</span>
                            <span>I:{user.indianTradeCount || 0}</span>
                         </div>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                          
                          {/* Extend Action */}
                          <div style={{ position: "relative" }}>
                            <button 
                              onClick={() => setExtendingId(extendingId === user._id ? null : user._id)}
                              style={{ padding: "6px", background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 6, cursor: "pointer", color: "#64748B" }}
                              title="Extend Plan"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                            </button>
                            
                            {extendingId === user._id && (
                              <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 8, background: "white", padding: "12px", borderRadius: 8, border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 10, width: 140 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", marginBottom: 8 }}>DAYS TO ADD</div>
                                <input type="number" value={extensionDays} onChange={e => setExtensionDays(e.target.value)} style={{ width: "100%", padding: "6px", border: "1px solid #E2E8F0", borderRadius: 4, fontSize: 12, marginBottom: 8 }} />
                                <button onClick={() => handleExtend(user._id)} style={{ width: "100%", background: "#B8860B", color: "white", border: "none", borderRadius: 4, padding: "6px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>APPLY</button>
                              </div>
                            )}
                          </div>

                          {/* Deactivate/Activate Action */}
                          <button 
                            onClick={() => handleToggleStatus(user._id)}
                            style={{ padding: "6px", background: user.subscriptionStatus === "active" ? "#FEF2F2" : "#F0FDF4", border: `1px solid ${user.subscriptionStatus === "active" ? "#FCA5A5" : "#86EFAC"}`, borderRadius: 6, cursor: "pointer", color: user.subscriptionStatus === "active" ? "#B91C1C" : "#15803D" }}
                            title={user.subscriptionStatus === "active" ? "Deactivate" : "Activate"}
                          >
                            {user.subscriptionStatus === "active" ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                            )}
                          </button>

                          {/* Delete Action */}
                          <button 
                            onClick={() => handleDelete(user._id)}
                            style={{ padding: "6px", background: "white", border: "1px solid #FCA5A5", borderRadius: 6, cursor: "pointer", color: "#B91C1C" }}
                            title="Delete User"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
