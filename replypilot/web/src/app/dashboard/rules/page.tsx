"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Rule { _id: string; name: string; keyword: string; reply: string; isActive: boolean; priority: number; matchCount: number; source: string; isRegex: boolean; }

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editRule, setEditRule] = useState<Rule | null>(null);
  const [form, setForm] = useState({ name: "", keyword: "", reply: "", priority: 0, source: "both", isRegex: false, caseSensitive: false });

  const fetchRules = () => {
    fetch("/api/rules").then(r => r.json()).then(d => { setRules(d.rules || []); setLoading(false); });
  };

  useEffect(() => { fetchRules(); }, []);

  const handleSave = async () => {
    const method = editRule ? "PUT" : "POST";
    const url = editRule ? `/api/rules/${editRule._id}` : "/api/rules";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false); setEditRule(null);
    setForm({ name: "", keyword: "", reply: "", priority: 0, source: "both", isRegex: false, caseSensitive: false });
    fetchRules();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    await fetch(`/api/rules/${id}`, { method: "DELETE" });
    fetchRules();
  };

  const handleToggle = async (rule: Rule) => {
    await fetch(`/api/rules/${rule._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !rule.isActive }) });
    fetchRules();
  };

  const openEdit = (rule: Rule) => {
    setEditRule(rule);
    setForm({ name: rule.name, keyword: rule.keyword, reply: rule.reply, priority: rule.priority, source: rule.source, isRegex: rule.isRegex, caseSensitive: false });
    setShowForm(true);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>Manual Rules</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>Keyword-based auto-reply rules</p>
        </div>
        <button className="btn-brand" onClick={() => { setEditRule(null); setForm({ name: "", keyword: "", reply: "", priority: 0, source: "both", isRegex: false, caseSensitive: false }); setShowForm(true); }}>+ Add Rule</button>
      </div>

      {/* Quick examples */}
      <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 14, padding: 20, marginBottom: 28 }}>
        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "var(--brand-purple-light)" }}>💡 Example Rules</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[["Hi", "Hello 👋 How can I help you?"], ["Price", "Our plans start from ₹499/month. Visit replypilot.app/pricing"], ["Thanks", "You're welcome 😊 Have a great day!"]].map(([k, r]) => (
            <div key={k} style={{ background: "var(--bg-glass)", borderRadius: 10, padding: "8px 14px", fontSize: 13 }}>
              <span style={{ color: "#f59e0b", fontWeight: 700 }}>{k}</span>
              <span style={{ color: "var(--text-muted)", margin: "0 6px" }}>→</span>
              <span style={{ color: "var(--text-secondary)" }}>{r}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ background: "var(--bg-card)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 16, padding: 28, marginBottom: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>{editRule ? "Edit Rule" : "New Rule"}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>Rule Name</label>
              <input className="input-field" placeholder="e.g. Greeting Reply" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>Keyword / Trigger</label>
              <input className="input-field" placeholder="e.g. hi, hello, price" value={form.keyword} onChange={e => setForm({ ...form, keyword: e.target.value })} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>Reply Message</label>
            <textarea className="input-field" placeholder="The reply to send when keyword matches..." value={form.reply} onChange={e => setForm({ ...form, reply: e.target.value })} rows={3} style={{ resize: "vertical" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>Source</label>
              <select className="input-field" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                <option value="both">Both</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="whatsapp_business">WhatsApp Business</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>Priority (higher = first)</label>
              <input className="input-field" type="number" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) })} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--text-secondary)" }}>
                <input type="checkbox" checked={form.isRegex} onChange={e => setForm({ ...form, isRegex: e.target.checked })} />
                Use Regex
              </label>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn-brand" onClick={handleSave}>Save Rule</button>
            <button onClick={() => setShowForm(false)} style={{ padding: "12px 20px", borderRadius: 10, border: "1px solid var(--border)", background: "none", color: "var(--text-secondary)", cursor: "pointer" }}>Cancel</button>
          </div>
        </motion.div>
      )}

      {/* Rules List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {loading && <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>Loading rules...</p>}
        {!loading && rules.length === 0 && <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No rules yet</p>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Create your first keyword rule to start auto-replying</p>
        </div>}
        {rules.map((rule, i) => (
          <motion.div key={rule._id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{rule.name}</span>
                <span style={{ fontSize: 11, background: "rgba(99,102,241,0.1)", color: "var(--brand-purple-light)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 100, padding: "2px 8px" }}>{rule.source}</span>
                {rule.isRegex && <span style={{ fontSize: 11, background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 100, padding: "2px 8px" }}>REGEX</span>}
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Priority: {rule.priority}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                <span style={{ color: "#f59e0b", fontWeight: 600 }}>&quot;{rule.keyword}&quot;</span>
                <span style={{ margin: "0 8px" }}>→</span>
                <span>{rule.reply}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Matched {rule.matchCount} times</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label className="toggle"><input type="checkbox" checked={rule.isActive} onChange={() => handleToggle(rule)} /><span className="toggle-slider" /></label>
              <button onClick={() => openEdit(rule)} style={{ background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 14px", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13 }}>Edit</button>
              <button onClick={() => handleDelete(rule._id)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "7px 14px", color: "#ef4444", cursor: "pointer", fontSize: 13 }}>Delete</button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
