"use client";
import { useEffect, useState } from "react";

interface AdminUser { _id: string; name: string; email: string; role: string; isActive: boolean; createdAt: string; lastSeen?: string; }

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, totalMessages: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("users");

  useEffect(() => {
    fetch("/api/admin/stats").then(r => r.json()).then(d => { setStats(d.stats || {}); setLoading(false); });
    fetch("/api/admin/users").then(r => r.json()).then(d => setUsers(d.users || []));
  }, []);

  const statCards = [
    { label: "Total Users", value: stats.totalUsers, icon: "👥", color: "#6366f1" },
    { label: "Active Users", value: stats.activeUsers, icon: "✅", color: "#10b981" },
    { label: "Total Messages", value: stats.totalMessages, icon: "💬", color: "#8b5cf6" },
    { label: "Revenue (₹)", value: stats.totalRevenue, icon: "💰", color: "#f59e0b" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", padding: 32 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, background: "linear-gradient(135deg,#ef4444,#dc2626)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🛡️</div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>Admin Panel</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>ReplyPilot Platform Management</p>
          </div>
        </div>

        {/* Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 32 }}>
          {statCards.map(s => (
            <div key={s.label} className="stat-card">
              <span style={{ fontSize: 28 }}>{s.icon}</span>
              <div style={{ fontSize: 30, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: s.color, marginTop: 12 }}>{loading ? "—" : s.value.toLocaleString()}</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "var(--bg-secondary)", borderRadius: 12, padding: 4, width: "fit-content" }}>
          {["users", "subscriptions", "analytics"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "8px 20px", borderRadius: 9, border: "none", background: tab === t ? "var(--bg-card)" : "transparent", color: tab === t ? "var(--text-primary)" : "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{t}</button>
          ))}
        </div>

        {/* Users Table */}
        {tab === "users" && (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>All Users ({users.length})</h2>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                  {["User", "Email", "Role", "Status", "Joined", "Last Seen", "Actions"].map(h => (
                    <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u._id} style={{ borderBottom: i < users.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--gradient-brand)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>{u.name?.charAt(0).toUpperCase()}</div>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: 13, color: "var(--text-secondary)" }}>{u.email}</td>
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{ fontSize: 11, background: u.role === "admin" ? "rgba(239,68,68,0.1)" : "rgba(99,102,241,0.1)", color: u.role === "admin" ? "#ef4444" : "#6366f1", border: `1px solid ${u.role === "admin" ? "rgba(239,68,68,0.3)" : "rgba(99,102,241,0.3)"}`, borderRadius: 100, padding: "3px 10px", fontWeight: 700, textTransform: "uppercase" }}>{u.role}</span>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span className={u.isActive ? "badge-active" : "badge-inactive"}>{u.isActive ? "Active" : "Suspended"}</span>
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: 12, color: "var(--text-muted)" }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: "14px 20px", fontSize: 12, color: "var(--text-muted)" }}>{u.lastSeen ? new Date(u.lastSeen).toLocaleDateString() : "Never"}</td>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button style={{ background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 7, padding: "5px 10px", color: "var(--text-secondary)", cursor: "pointer", fontSize: 12 }}>View</button>
                        <button style={{ background: u.isActive ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", border: `1px solid ${u.isActive ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`, borderRadius: 7, padding: "5px 10px", color: u.isActive ? "#ef4444" : "#10b981", cursor: "pointer", fontSize: 12 }}>{u.isActive ? "Suspend" : "Activate"}</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={7} style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>No users yet</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === "subscriptions" && (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💳</div>
            <p style={{ fontSize: 16, fontWeight: 600 }}>Subscription Management</p>
            <p style={{ color: "var(--text-muted)", marginTop: 8 }}>Configure Razorpay/Stripe to enable subscription tracking</p>
          </div>
        )}

        {tab === "analytics" && (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <p style={{ fontSize: 16, fontWeight: 600 }}>Platform Analytics</p>
            <p style={{ color: "var(--text-muted)", marginTop: 8 }}>Coming soon — global message stats, revenue charts, user growth</p>
          </div>
        )}
      </div>
    </div>
  );
}
