"use client";
import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

export default function AnalyticsPage() {
  const [data, setData] = useState<Record<string, unknown>>({});
  const [period, setPeriod] = useState("30d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?period=${period}`).then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, [period]);

  const totals = (data.totals as Record<string, number>) || {};
  const dailyStats = (data.dailyStats as Array<Record<string, unknown>>) || [];

  const chartData = dailyStats.map((d) => ({
    date: new Date(d.date as string).toLocaleDateString("en", { month: "short", day: "numeric" }),
    Messages: d.totalMessages,
    Replies: d.totalReplies,
    "AI": d.aiReplies,
    "Manual": d.manualReplies,
  }));

  const pieData = [
    { name: "AI Replies", value: totals.aiReplies || 0, color: "#8b5cf6" },
    { name: "Manual Replies", value: totals.manualReplies || 0, color: "#10b981" },
    { name: "Failed", value: totals.failedReplies || 0, color: "#ef4444" },
  ];

  const statCards = [
    { label: "Total Messages", value: totals.totalMessages || 0, icon: "💬", color: "#6366f1" },
    { label: "Replies Sent", value: totals.totalReplies || 0, icon: "✅", color: "#10b981" },
    { label: "AI Replies", value: totals.aiReplies || 0, icon: "🤖", color: "#8b5cf6" },
    { label: "Manual Replies", value: totals.manualReplies || 0, icon: "📋", color: "#f59e0b" },
    { label: "AI Tokens Used", value: totals.aiTokensUsed || 0, icon: "⚡", color: "#3b82f6" },
    { label: "Success Rate", value: totals.totalMessages ? `${Math.round((totals.totalReplies / totals.totalMessages) * 100)}%` : "0%", icon: "📈", color: "#ec4899" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>Analytics</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>Track your automation performance</p>
        </div>
        <select value={period} onChange={e => setPeriod(e.target.value)} className="input-field" style={{ width: "auto" }}>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 20, marginBottom: 32 }}>
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 28 }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: s.color }}>{loading ? "—" : typeof s.value === "number" ? s.value.toLocaleString() : s.value}</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Area Chart */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: 28, marginBottom: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 24 }}>Messages Over Time</h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              {[{ id: "msg", color: "#6366f1" }, { id: "rep", color: "#10b981" }].map(g => (
                <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={g.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={g.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10 }} />
            <Area type="monotone" dataKey="Messages" stroke="#6366f1" fill="url(#msg)" strokeWidth={2} />
            <Area type="monotone" dataKey="Replies" stroke="#10b981" fill="url(#rep)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        {/* Bar Chart */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: 28 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 24 }}>AI vs Manual Replies</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10 }} />
              <Bar dataKey="AI" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Manual" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: 28 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 24 }}>Reply Breakdown</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={0}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
            {pieData.map(p => (
              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                <span style={{ color: "var(--text-secondary)", flex: 1 }}>{p.name}</span>
                <span style={{ fontWeight: 600 }}>{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
