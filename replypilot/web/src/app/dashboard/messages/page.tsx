"use client";
import { useEffect, useState } from "react";

interface Message { _id: string; contactName: string; contactPhone: string; content: string; replyContent?: string; replyMode: string; replyStatus: string; source: string; isGroupMessage: boolean; groupName?: string; createdAt: string; aiTokensUsed?: number; }

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const fetchMessages = () => {
    setLoading(true);
    fetch(`/api/messages/incoming?page=${page}&limit=20`).then(r => r.json()).then(d => { setMessages(d.messages || []); setTotal(d.total || 0); setLoading(false); });
  };

  useEffect(() => { fetchMessages(); }, [page]);

  const filtered = messages.filter(m => {
    const matchesSearch = !search || m.contactName.toLowerCase().includes(search.toLowerCase()) || m.content.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || m.replyMode === filter || (filter === "failed" && m.replyStatus === "failed");
    return matchesSearch && matchesFilter;
  });

  const modeColor: Record<string, string> = { ai: "#8b5cf6", manual: "#10b981", hybrid: "#3b82f6", none: "#64748b" };

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>Messages</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>All incoming and outgoing messages</p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <input className="input-field" placeholder="Search by contact or message..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
        <select className="input-field" value={filter} onChange={e => setFilter(e.target.value)} style={{ width: "auto" }}>
          <option value="all">All Replies</option>
          <option value="ai">AI Replied</option>
          <option value="manual">Manual Rules</option>
          <option value="none">No Reply</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Stats Bar */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 20px", fontSize: 13, color: "var(--text-secondary)" }}>
          Total: <strong style={{ color: "var(--text-primary)" }}>{total}</strong>
        </div>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 20px", fontSize: 13, color: "var(--text-secondary)" }}>
          Showing: <strong style={{ color: "var(--text-primary)" }}>{filtered.length}</strong>
        </div>
      </div>

      {/* Messages Table */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
              {["Contact", "Message", "Reply", "Mode", "Source", "Time"].map(h => (
                <th key={h} style={{ padding: "14px 20px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>Loading...</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 60, textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
                <p style={{ color: "var(--text-muted)" }}>No messages yet. Install the Android app to start receiving messages.</p>
              </td></tr>
            )}
            {filtered.map((msg, i) => (
              <tr key={msg._id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none", transition: "background 0.2s" }} onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-glass)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "14px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--gradient-brand)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{msg.contactName?.charAt(0).toUpperCase()}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{msg.contactName}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{msg.contactPhone}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "14px 20px", maxWidth: 200 }}>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{msg.content}</div>
                </td>
                <td style={{ padding: "14px 20px", maxWidth: 200 }}>
                  <div style={{ fontSize: 13, color: msg.replyContent ? "#10b981" : "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{msg.replyContent || "—"}</div>
                </td>
                <td style={{ padding: "14px 20px" }}>
                  <span style={{ fontSize: 11, background: `${modeColor[msg.replyMode]}20`, color: modeColor[msg.replyMode], border: `1px solid ${modeColor[msg.replyMode]}40`, borderRadius: 100, padding: "3px 10px", fontWeight: 600 }}>{msg.replyMode?.toUpperCase()}</span>
                </td>
                <td style={{ padding: "14px 20px" }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{msg.source === "whatsapp_business" ? "WA Business" : "WhatsApp"}</span>
                </td>
                <td style={{ padding: "14px 20px" }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(msg.createdAt).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
          {Array.from({ length: Math.ceil(total / 20) }, (_, i) => i + 1).slice(0, 10).map(p => (
            <button key={p} onClick={() => setPage(p)} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid var(--border)", background: page === p ? "var(--gradient-brand)" : "var(--bg-glass)", color: "var(--text-primary)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}
