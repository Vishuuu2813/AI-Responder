"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function AISettingsPage() {
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [ai, setAi] = useState({
    useSystemKey: true, userApiKey: "", model: "gpt-4o-mini",
    temperature: 0.7, maxTokens: 500,
    language: "auto", tone: "friendly", replyLength: "medium",
    personality: "helpful customer support assistant",
    customInstructions: "", memoryType: "short", memoryMessageCount: 5,
  });

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => {
      if (d.settings?.ai) setAi({ ...ai, ...d.settings.ai });
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ai }) });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 5 }}>{hint}</p>}
    </div>
  );

  const Section = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, marginBottom: 24 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22 }}>{icon}</span> {title}
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>{children}</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>AI Settings</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>Configure how the AI generates replies</p>
        </div>
        <button className="btn-brand" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : saved ? "✅ Saved!" : "Save Changes"}
        </button>
      </div>

      {/* API Key */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, marginBottom: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}><span>🔑</span> API Key</h2>
        <div style={{ display: "flex", gap: 16, marginBottom: ai.useSystemKey ? 0 : 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, background: ai.useSystemKey ? "rgba(99,102,241,0.1)" : "var(--bg-glass)", border: `1px solid ${ai.useSystemKey ? "rgba(99,102,241,0.3)" : "var(--border)"}`, borderRadius: 12, padding: 16, cursor: "pointer" }}>
            <input type="radio" checked={ai.useSystemKey} onChange={() => setAi({ ...ai, useSystemKey: true })} />
            <div><div style={{ fontSize: 14, fontWeight: 600 }}>Use System Key</div><div style={{ fontSize: 12, color: "var(--text-muted)" }}>Included in Pro/Business plans</div></div>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, background: !ai.useSystemKey ? "rgba(99,102,241,0.1)" : "var(--bg-glass)", border: `1px solid ${!ai.useSystemKey ? "rgba(99,102,241,0.3)" : "var(--border)"}`, borderRadius: 12, padding: 16, cursor: "pointer" }}>
            <input type="radio" checked={!ai.useSystemKey} onChange={() => setAi({ ...ai, useSystemKey: false })} />
            <div><div style={{ fontSize: 14, fontWeight: 600 }}>Use My API Key</div><div style={{ fontSize: 12, color: "var(--text-muted)" }}>Use your own OpenAI key</div></div>
          </label>
        </div>
        {!ai.useSystemKey && (
          <div style={{ marginTop: 16 }}>
            <input className="input-field" type="password" placeholder="sk-..." value={ai.userApiKey} onChange={e => setAi({ ...ai, userApiKey: e.target.value })} />
          </div>
        )}
      </div>

      <Section title="Model & Performance" icon="⚡">
        <Field label="AI Model">
          <select className="input-field" value={ai.model} onChange={e => setAi({ ...ai, model: e.target.value })}>
            <option value="gpt-5.5">GPT-5.5 (New Class of Intelligence)</option>
            <option value="gpt-5.4">GPT-5.4 (Intelligence at Scale)</option>
            <option value="gpt-5.4-mini">GPT-5.4 Mini (Fast & Cost-Efficient)</option>
            <option value="gpt-4o-mini">GPT-4o Mini (Fast & Affordable)</option>
            <option value="gpt-4o">GPT-4o (Most Capable)</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Legacy)</option>
          </select>
        </Field>
      </Section>

      <Section title="Reply Style" icon="🎨">
        <Field label="Language">
          <select className="input-field" value={ai.language} onChange={e => setAi({ ...ai, language: e.target.value })}>
            <option value="auto">Auto Detect</option>
            <option value="english">English</option>
            <option value="hindi">Hindi (हिंदी)</option>
            <option value="hinglish">Hinglish</option>
          </select>
        </Field>
        <Field label="Tone">
          <select className="input-field" value={ai.tone} onChange={e => setAi({ ...ai, tone: e.target.value })}>
            <option value="friendly">😊 Friendly</option>
            <option value="professional">💼 Professional</option>
            <option value="formal">🎩 Formal</option>
            <option value="sales">💰 Sales</option>
            <option value="support">🛟 Customer Support</option>
          </select>
        </Field>
        <Field label="Reply Length">
          <select className="input-field" value={ai.replyLength} onChange={e => setAi({ ...ai, replyLength: e.target.value })}>
            <option value="short">Short (1-2 sentences)</option>
            <option value="medium">Medium (2-4 sentences)</option>
            <option value="long">Long (detailed)</option>
          </select>
        </Field>
        <Field label="AI Personality">
          <input className="input-field" placeholder="e.g. helpful customer support agent" value={ai.personality} onChange={e => setAi({ ...ai, personality: e.target.value })} />
        </Field>
      </Section>

      {/* Custom Instructions */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}><span>📝</span> Custom Instructions</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>Tell the AI exactly how to behave. These instructions apply to every conversation.</p>
        <textarea className="input-field" value={ai.customInstructions} onChange={e => setAi({ ...ai, customInstructions: e.target.value })} rows={6} placeholder={`Example:\nYou are my customer support assistant for TechStore.\nAlways be polite and professional.\nIf asked about pricing, mention our plans start at ₹499/month.\nNever mention competitors.\nUse Hinglish language.`} style={{ resize: "vertical" }} />
      </div>
    </div>
  );
}
