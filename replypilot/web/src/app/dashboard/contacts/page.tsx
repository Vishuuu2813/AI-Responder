"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Contact { _id: string; name: string; phone: string; type: string; source: string; messageCount: number; lastMessageAt?: string; notes?: string; }

const typeColors: Record<string, { bg: string; color: string; border: string }> = {
  vip: { bg: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "rgba(245,158,11,0.3)" },
  normal: { bg: "rgba(99,102,241,0.1)", color: "#6366f1", border: "rgba(99,102,241,0.3)" },
  blocked: { bg: "rgba(239,68,68,0.1)", color: "#ef4444", border: "rgba(239,68,68,0.3)" },
  selected: { bg: "rgba(16,185,129,0.1)", color: "#10b981", border: "rgba(16,185,129,0.3)" },
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", type: "normal", source: "both", notes: "" });

  const fetch_ = () => fetch("/api/contacts").then(r => r.json()).then(d => { setContacts(d.contacts || []); setLoading(false); });
  useEffect(() => { fetch_(); }, []);

  const handleSave = async () => {
    await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false); setForm({ name: "", phone: "", type: "normal", source: "both", notes: "" }); fetch_();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this contact?")) return;
    await fetch(`/api/contacts/${id}`, { method: "DELETE" }); fetch_();
  };

  const handleTypeChange = async (id: string, type: string) => {
    await fetch(`/api/contacts/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }) }); fetch_();
  };

  const groups = { vip: contacts.filter(c => c.type === "vip"), blocked: contacts.filter(c => c.type === "blocked"), selected: contacts.filter(c => c.type === "selected"), normal: contacts.filter(c => c.type === "normal") };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>Contacts</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>Manage contact filters and VIP lists</p>
        </div>
        <button className="btn-brand" onClick={() => setShowForm(true)}>+ Add Contact</button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {Object.entries(groups).map(([type, list]) => {
          const c = typeColors[type];
          const icons: Record<string, string> = { vip: "⭐", blocked: "🚫", selected: "✅", normal: "👤" };
          return (
            <div key={type} style={{ background: "var(--bg-card)", border: `1px solid ${c.border}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{icons[type]}</div>
              <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: c.color }}>{list.length}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "capitalize", marginTop: 4 }}>{type} Contacts</div>
            </div>
          );
        })}
      </div>

      {/* Add Form */}
      {showForm && (
        <div style={{ background: "var(--bg-card)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 16, padding: 28, marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Add Contact</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>Name</label>
              <input className="input-field" placeholder="Contact name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>Phone Number</label>
              <input className="input-field" placeholder="+91XXXXXXXXXX" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>Type</label>
              <select className="input-field" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="normal">Normal</option>
                <option value="vip">⭐ VIP</option>
                <option value="selected">✅ Selected Only</option>
                <option value="blocked">🚫 Blocked</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>Notes</label>
              <input className="input-field" placeholder="Optional notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn-brand" onClick={handleSave}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ padding: "12px 20px", borderRadius: 10, border: "1px solid var(--border)", background: "none", color: "var(--text-secondary)", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Contact List */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
              {["Contact", "Phone", "Type", "Messages", "Last Active", "Actions"].map(h => (
                <th key={h} style={{ padding: "14px 20px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>Loading...</td></tr>}
            {!loading && contacts.length === 0 && <tr><td colSpan={6} style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>No contacts yet. They appear automatically when messages are received.</td></tr>}
            {contacts.map((c, i) => {
              const tc = typeColors[c.type];
              return (
                <tr key={c._id} style={{ borderBottom: i < contacts.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--gradient-brand)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{c.name?.charAt(0).toUpperCase()}</div>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: 13, color: "var(--text-secondary)" }}>{c.phone}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <select value={c.type} onChange={e => handleTypeChange(c._id, e.target.value)} style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`, borderRadius: 100, padding: "3px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      <option value="normal">Normal</option>
                      <option value="vip">⭐ VIP</option>
                      <option value="selected">✅ Selected</option>
                      <option value="blocked">🚫 Blocked</option>
                    </select>
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: 13, color: "var(--text-secondary)" }}>{c.messageCount}</td>
                  <td style={{ padding: "14px 20px", fontSize: 12, color: "var(--text-muted)" }}>{c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleDateString() : "Never"}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <button onClick={() => handleDelete(c._id)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "6px 12px", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>Remove</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
