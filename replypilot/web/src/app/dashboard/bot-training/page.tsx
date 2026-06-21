"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface ChatMessage {
  contactName: string;
  contactPhone: string;
  content: string;
  replyContent?: string;
  replyMode: string;
  replyStatus: string;
  source: string;
  createdAt: string;
}

export default function BotTrainingPage() {
  const [activeTab, setActiveTab] = useState<"training" | "analytics">("training");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Bot Training Fields
  const [ai, setAi] = useState({
    greetingTemplate: "Hello {first_name}, welcome to Main Mumbai Support! How can I help you?",
    newAppLink: "https://mainmumbaisattamatkadpboss.in/",
    oldAppLink: "https://mainmumbaisattamatkadpboss.in/",
    websiteLink: "https://www.mainmumbaistarline.com/",
    whatsappSupport: "917339987622",
    minDeposit: 100,
    minWithdraw: 200,
    maxWithdraw: 50000,
    withdrawOpenTime: "10:00 AM",
    withdrawCloseTime: "04:00 PM",
    customInstructions: ""
  });

  // Chat Logs
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Fetch Settings
    fetch("/api/settings")
      .then(r => r.json())
      .then(d => {
        if (d.settings?.ai) {
          setAi(prev => ({
            ...prev,
            ...d.settings.ai
          }));
        }
        setLoading(false);
      })
      .catch(err => console.error("Error loading settings:", err));

    // Fetch Messages
    fetch("/api/messages/incoming?limit=50")
      .then(r => r.json())
      .then(d => {
        if (d.messages) setMessages(d.messages);
        if (d.total) setTotalMessages(d.total);
      })
      .catch(err => console.error("Error loading messages:", err));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai })
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error("Save error:", err);
    }
    setSaving(false);
  };

  const filteredMessages = messages.filter(msg =>
    msg.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.contactPhone?.includes(searchQuery)
  );

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>🤖 Bot Training & Analytics</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>Train your AI on application links and analyze incoming WhatsApp chats</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => setActiveTab("training")}
            style={{
              padding: "10px 20px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: activeTab === "training" ? "var(--gradient-brand)" : "var(--bg-glass)",
              color: activeTab === "training" ? "white" : "var(--text-primary)",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            🎓 Training Config
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            style={{
              padding: "10px 20px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: activeTab === "analytics" ? "var(--gradient-brand)" : "var(--bg-glass)",
              color: activeTab === "analytics" ? "white" : "var(--text-primary)",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            📊 Chat Analytics ({totalMessages})
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading configurations...</div>
      ) : activeTab === "training" ? (
        /* TRAINING TAB */
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 28, alignItems: "start" }}>
            
            {/* Form Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Greetings Template */}
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>💬 Greetings Setup</h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>Use <code>{`{first_name}`}</code> to automatically inject the contact's WhatsApp name.</p>
                <input
                  type="text"
                  className="input-field"
                  value={ai.greetingTemplate}
                  onChange={e => setAi({ ...ai, greetingTemplate: e.target.value })}
                  placeholder="e.g. Hello {first_name}, welcome to Main Mumbai Support!"
                />
              </div>

              {/* Links Config */}
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>🔗 App & Website Links</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>New App Link</label>
                    <input type="text" className="input-field" value={ai.newAppLink} onChange={e => setAi({ ...ai, newAppLink: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Old App Link</label>
                    <input type="text" className="input-field" value={ai.oldAppLink} onChange={e => setAi({ ...ai, oldAppLink: e.target.value })} />
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Website URL</label>
                    <input type="text" className="input-field" value={ai.websiteLink} onChange={e => setAi({ ...ai, websiteLink: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Transactions & Support */}
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>💳 Transaction Limits & Help</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Min Deposit (₹)</label>
                    <input type="number" className="input-field" value={ai.minDeposit} onChange={e => setAi({ ...ai, minDeposit: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Min Withdraw (₹)</label>
                    <input type="number" className="input-field" value={ai.minWithdraw} onChange={e => setAi({ ...ai, minWithdraw: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Max Withdraw (₹)</label>
                    <input type="number" className="input-field" value={ai.maxWithdraw} onChange={e => setAi({ ...ai, maxWithdraw: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Withdraw Open Time</label>
                    <input type="text" className="input-field" value={ai.withdrawOpenTime} onChange={e => setAi({ ...ai, withdrawOpenTime: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Withdraw Close Time</label>
                    <input type="text" className="input-field" value={ai.withdrawCloseTime} onChange={e => setAi({ ...ai, withdrawCloseTime: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>WhatsApp Support JID</label>
                    <input type="text" className="input-field" value={ai.whatsappSupport} onChange={e => setAi({ ...ai, whatsappSupport: e.target.value })} placeholder="91..." />
                  </div>
                </div>
              </div>

              {/* Prompt custom */}
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>📝 Custom Prompt Instructions</h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>Extra behavior details, price charts, or specific rules you want the AI to remember.</p>
                <textarea
                  className="input-field"
                  rows={6}
                  value={ai.customInstructions}
                  onChange={e => setAi({ ...ai, customInstructions: e.target.value })}
                  placeholder="e.g. Kalyan Market is open Monday to Saturday. Jodi rates are 10 ka 1000..."
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                <button className="btn-brand" onClick={handleSave} disabled={saving} style={{ padding: "12px 32px", fontSize: 15 }}>
                  {saving ? "Saving Changes..." : saved ? "✅ Changes Saved!" : "💾 Save Bot Training"}
                </button>
              </div>
            </div>

            {/* Guide Card */}
            <div style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05))", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 20, padding: 28, position: "sticky", top: 100 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>How to Train Your Bot</h3>
              <ul style={{ paddingLeft: 18, fontSize: 13, lineHeight: "1.7", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 12 }}>
                <li><strong>Greetings:</strong> The bot will trigger your customized greetings message when someone says "Hi" or matches your button invite.</li>
                <li><strong>Links Handlers:</strong> If a contact asks for your app, links will be parsed and formatted cleanly by the AI automatically.</li>
                <li><strong>Language Lock:</strong> It will lock to whatever language the contact responds with (Hindi, Tamil, English, etc.) automatically.</li>
                <li><strong>Strict Mode:</strong> AI will focus strictly on your app details and decline unrelated chatting.</li>
              </ul>
            </div>
          </div>
        </motion.div>
      ) : (
        /* ANALYTICS TAB */
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {/* Stats Bar */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 28 }}>
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Total Messages Checked</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--brand-purple-light)", marginTop: 6 }}>{totalMessages}</div>
            </div>
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Source Diversity</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#10b981", marginTop: 6 }}>WhatsApp / Web</div>
            </div>
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Status Check</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#f59e0b", marginTop: 6 }}>Active</div>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ marginBottom: 20 }}>
            <input
              type="text"
              className="input-field"
              placeholder="🔍 Search messages by contact name, JID, or keyword..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 18 }}
            />
          </div>

          {/* Messages Log */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Incoming Message Logs</h3>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Showing latest chats</span>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column" }}>
              {filteredMessages.length === 0 ? (
                <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>No matching logs found.</div>
              ) : (
                filteredMessages.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 24,
                      borderBottom: i < filteredMessages.length - 1 ? "1px solid var(--border)" : "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12
                    }}
                  >
                    {/* Log Meta */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>👤 {msg.contactName || "Unknown"}</span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>({msg.contactPhone})</span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ fontSize: 10, background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 100, padding: "2px 8px", fontWeight: 600 }}>
                          {msg.source?.toUpperCase()}
                        </span>
                        <span style={{ fontSize: 10, background: msg.replyMode === "ai" ? "rgba(139,92,246,0.15)" : "rgba(16,185,129,0.15)", color: msg.replyMode === "ai" ? "#8b5cf6" : "#10b981", border: `1px solid ${msg.replyMode === "ai" ? "rgba(139,92,246,0.3)" : "rgba(16,185,129,0.3)"}`, borderRadius: 100, padding: "2px 8px", fontWeight: 600 }}>
                          {msg.replyMode?.toUpperCase() || "NONE"}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Content bubbles */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 12, padding: 14 }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>📩 INCOMING MESSAGE</div>
                        <p style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "pre-line" }}>{msg.content}</p>
                      </div>
                      <div style={{ background: "rgba(16,185,129,0.02)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 12, padding: 14 }}>
                        <div style={{ fontSize: 11, color: "#10b981", marginBottom: 4 }}>↩ AUTO-REPLY SENT</div>
                        <p style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "pre-line" }}>{msg.replyContent || "No reply sent"}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
