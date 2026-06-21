"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

interface AnalyticsData {
  dailyStats: Array<{ date: string; totalMessages: number; totalReplies: number; aiReplies: number }>;
  totals: { totalMessages: number; totalReplies: number; aiReplies: number; manualReplies: number; aiTokensUsed: number };
  activeConversations: number;
  recentMessages: Array<{ contactName: string; content: string; replyContent: string; createdAt: string; replyMode: string }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState("7d");
  const [autoReply, setAutoReply] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/analytics?period=${period}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
    fetch("/api/settings").then(r => r.json()).then(d => setAutoReply(d.settings?.isEnabled || false));
  }, [period]);

  const toggleAutoReply = async () => {
    const newVal = !autoReply;
    setAutoReply(newVal);
    await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isEnabled: newVal }) });
  };

  const stats = [
    { label: "Total Messages", value: data?.totals?.totalMessages || 0, icon: "💬", color: "#6366f1", suffix: "" },
    { label: "Replies Sent", value: data?.totals?.totalReplies || 0, icon: "✅", color: "#10b981", suffix: "" },
    { label: "AI Replies", value: data?.totals?.aiReplies || 0, icon: "🤖", color: "#8b5cf6", suffix: "" },
    { label: "Active Chats", value: data?.activeConversations || 0, icon: "👥", color: "#f59e0b", suffix: "" },
    { label: "Success Rate", value: data?.totals?.totalMessages ? Math.round((data.totals.totalReplies / data.totals.totalMessages) * 100) : 0, icon: "📈", color: "#3b82f6", suffix: "%" },
    { label: "AI Tokens Used", value: data?.totals?.aiTokensUsed || 0, icon: "⚡", color: "#ec4899", suffix: "" },
  ];

  const chartData = data?.dailyStats?.map(d => ({
    date: new Date(d.date).toLocaleDateString("en", { month: "short", day: "numeric" }),
    Messages: d.totalMessages,
    Replies: d.totalReplies,
    "AI Replies": d.aiReplies,
  })) || [];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>Dashboard</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>Monitor your WhatsApp automation</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <select value={period} onChange={e => setPeriod(e.target.value)} className="input-field" style={{ width: "auto", padding: "8px 14px" }}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "8px 16px" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: autoReply ? "#10b981" : "var(--text-muted)" }}>{autoReply ? "● Auto-Reply ON" : "○ Auto-Reply OFF"}</span>
            <label className="toggle">
              <input type="checkbox" checked={autoReply} onChange={toggleAutoReply} />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 20, marginBottom: 32 }}>
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="stat-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 28 }}>{s.icon}</span>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: s.color }}>{loading ? "—" : s.value.toLocaleString()}{s.suffix}</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6 }}>{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: 28, marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Message Activity</h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorReply" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, color: "white" }} />
            <Area type="monotone" dataKey="Messages" stroke="#6366f1" fill="url(#colorMsg)" strokeWidth={2} />
            <Area type="monotone" dataKey="Replies" stroke="#10b981" fill="url(#colorReply)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Messages */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Recent Messages</h2>
          <a href="/dashboard/messages" style={{ color: "var(--brand-purple-light)", fontSize: 14, textDecoration: "none" }}>View all →</a>
        </div>
        <div>
          {data?.recentMessages?.length === 0 && <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>No messages yet. Install the Android app to start.</p>}
          {data?.recentMessages?.map((msg, i) => (
            <div key={i} style={{ display: "flex", gap: 16, padding: "16px 0", borderBottom: i < (data.recentMessages.length - 1) ? "1px solid var(--border)" : "none" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--gradient-brand)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                {msg.contactName?.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{msg.contactName}</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11, background: msg.replyMode === "ai" ? "rgba(139,92,246,0.15)" : "rgba(16,185,129,0.15)", color: msg.replyMode === "ai" ? "#8b5cf6" : "#10b981", border: `1px solid ${msg.replyMode === "ai" ? "rgba(139,92,246,0.3)" : "rgba(16,185,129,0.3)"}`, borderRadius: 100, padding: "2px 8px", fontWeight: 600 }}>{msg.replyMode?.toUpperCase()}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>📩 {msg.content}</p>
                {msg.replyContent && <p style={{ fontSize: 13, color: "#10b981", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>↩ {msg.replyContent}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
