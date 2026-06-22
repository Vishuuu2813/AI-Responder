"use client";
import { useEffect, useState } from "react";

interface PaymentRecord {
  _id: string;
  contactPhone: string;
  contactName: string;
  transactionId: string;
  amount: number;
  paymentMethod: string;
  recipientName: string;
  paymentDate: string;
  status: "verified" | "wrong_recipient" | "duplicate" | "incomplete";
  createdAt: string;
}

const statusConfig = {
  verified: { label: "✅ Verified", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  wrong_recipient: { label: "❌ Wrong Recipient", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  duplicate: { label: "⚠️ Duplicate", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  incomplete: { label: "📸 Incomplete", color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
};

export default function PaymentRecordsPage() {
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Recipient names config state
  const [recipientNames, setRecipientNames] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [verificationEnabled, setVerificationEnabled] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    // Load settings
    fetch("/api/settings").then(r => r.json()).then(d => {
      if (d.settings?.ai) {
        setRecipientNames(d.settings.ai.paymentRecipientNames || []);
        setVerificationEnabled(d.settings.ai.paymentVerificationEnabled || false);
      }
    });
  }, []);

  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page]);

  const loadRecords = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (filter !== "all") params.set("status", filter);
    fetch(`/api/payment/screenshot?${params}`, {
      headers: { "x-api-key": "" }, // will be filled by server from session
    }).then(r => r.json()).then(d => {
      setRecords(d.records || []);
      setTotal(d.total || 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "ai.paymentRecipientNames": recipientNames,
          "ai.paymentVerificationEnabled": verificationEnabled,
        }),
      });
      if (res.ok) {
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 2000);
      } else {
        alert("Failed to save settings. Please try again.");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving settings. Please try again.");
    } finally {
      setSettingsSaving(false);
    }
  };

  const addName = () => {
    const trimmed = newName.trim();
    if (trimmed && !recipientNames.includes(trimmed)) {
      setRecipientNames([...recipientNames, trimmed]);
      setNewName("");
    }
  };

  const removeName = (name: string) => {
    setRecipientNames(recipientNames.filter(n => n !== name));
  };

  const stats = {
    verified: records.filter(r => r.status === "verified").length,
    wrong_recipient: records.filter(r => r.status === "wrong_recipient").length,
    duplicate: records.filter(r => r.status === "duplicate").length,
    incomplete: records.filter(r => r.status === "incomplete").length,
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>💳 Payment Verification</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
          Auto-verify payment screenshots from WhatsApp users
        </p>
      </div>

      {/* ── Settings Card ─────────────────────────────────── */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            ⚙️ Verification Settings
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
              <div
                onClick={() => setVerificationEnabled(!verificationEnabled)}
                style={{
                  width: 44, height: 24, borderRadius: 12, cursor: "pointer", transition: "all 0.3s",
                  background: verificationEnabled ? "var(--brand)" : "var(--border)",
                  position: "relative",
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: "50%", background: "white",
                  position: "absolute", top: 3, transition: "all 0.3s",
                  left: verificationEnabled ? 23 : 3,
                }} />
              </div>
              {verificationEnabled ? "✅ Enabled" : "❌ Disabled"}
            </label>
            <button
              className="btn-brand"
              onClick={saveSettings}
              disabled={settingsSaving}
              style={{ padding: "8px 20px", fontSize: 13 }}
            >
              {settingsSaving ? "Saving..." : settingsSaved ? "✅ Saved!" : "Save Settings"}
            </button>
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)" }}>
            ✅ Approved Recipient Names
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400, marginLeft: 8 }}>
              (Payment must be sent to one of these names)
            </span>
          </label>
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <input
              className="input-field"
              placeholder='e.g. "Vishal Sharma" or "Main Mumbai"'
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addName()}
              style={{ flex: 1 }}
            />
            <button
              onClick={addName}
              style={{ padding: "0 20px", background: "var(--brand)", color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14 }}
            >
              + Add
            </button>
          </div>
          {recipientNames.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {recipientNames.map(name => (
                <div key={name} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)",
                  borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 500,
                }}>
                  <span>👤 {name}</span>
                  <button
                    onClick={() => removeName(name)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 16, lineHeight: 1, padding: 0 }}
                  >×</button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>
              No names added yet. If empty, all recipients will be accepted.
            </p>
          )}
        </div>
      </div>

      {/* ── Stats Row ─────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <div key={key} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{cfg.label.split(" ")[0]}</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>
              {records.filter(r => r.status === key).length}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {cfg.label.replace(/^[^\s]+\s/, "")}
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Tabs ─────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[{ key: "all", label: "All" }, { key: "verified", label: "✅ Verified" }, { key: "wrong_recipient", label: "❌ Wrong" }, { key: "duplicate", label: "⚠️ Duplicate" }, { key: "incomplete", label: "📸 Incomplete" }].map(f => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); setPage(1); }}
            style={{
              padding: "7px 16px", borderRadius: 8, border: "1px solid var(--border)",
              background: filter === f.key ? "var(--brand)" : "var(--bg-card)",
              color: filter === f.key ? "white" : "var(--text-secondary)",
              cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.2s",
            }}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={loadRecords}
          style={{ marginLeft: "auto", padding: "7px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13 }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* ── Records Table ─────────────────────────────────── */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>
        ) : records.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💳</div>
            <p style={{ color: "var(--text-muted)", fontSize: 15 }}>No payment records yet</p>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>
              When users send payment screenshots on WhatsApp, records will appear here
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-glass)" }}>
                  {["User", "Amount", "Transaction ID", "Method", "Recipient", "Date", "Status"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => {
                  const cfg = statusConfig[r.status];
                  return (
                    <tr key={r._id} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "var(--bg-glass)" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{r.contactName || "—"}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.contactPhone}</div>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#10b981" }}>
                          {r.amount ? `₹${r.amount}` : "—"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <code style={{ fontSize: 12, background: "var(--bg-glass)", padding: "3px 7px", borderRadius: 5, color: "var(--text-secondary)" }}>
                          {r.transactionId || "—"}
                        </code>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "var(--text-secondary)" }}>
                        {r.paymentMethod || "—"}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "var(--text-secondary)" }}>
                        {r.recipientName || "—"}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 12, color: "var(--text-muted)" }}>
                        {r.paymentDate || new Date(r.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center",
                          padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                          color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}40`,
                        }}>
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer" }}>← Prev</button>
          <span style={{ padding: "8px 16px", fontSize: 14, color: "var(--text-muted)" }}>Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={records.length < 20} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer" }}>Next →</button>
        </div>
      )}
    </div>
  );
}
