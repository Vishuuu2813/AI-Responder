"use client";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [settings, setSettings] = useState({ isEnabled: false, replyMode: "ai", whatsappSource: "both", ignoreGroups: true, replyInGroups: false, delay: { type: "instant", fixedSeconds: 1, randomMin: 1, randomMax: 5 }, businessHours: { enabled: false, timezone: "Asia/Kolkata", awayMessage: "We will get back to you soon.", schedule: Array.from({ length: 7 }, (_, i) => ({ day: i, isOpen: i > 0 && i < 6, openTime: "09:00", closeTime: "18:00" })) } });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => { if (d.settings) setSettings(s => ({ ...s, ...d.settings })); setLoading(false); });
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  if (loading) return <div style={{ color: "var(--text-muted)", padding: 40 }}>Loading settings...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>Settings</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>Configure your auto-reply settings</p>
        </div>
        <button className="btn-brand" onClick={save} disabled={saving}>{saving ? "Saving..." : saved ? "✅ Saved!" : "Save Changes"}</button>
      </div>

      {/* General */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, marginBottom: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 24 }}>⚙️ General</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>Reply Mode</label>
            <select className="input-field" value={settings.replyMode} onChange={e => setSettings(s => ({ ...s, replyMode: e.target.value }))}>
              <option value="ai">🤖 AI Auto Reply</option>
              <option value="manual">📋 Manual Rules Only</option>
              <option value="hybrid">🔀 Hybrid Mode</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>WhatsApp Source</label>
            <select className="input-field" value={settings.whatsappSource} onChange={e => setSettings(s => ({ ...s, whatsappSource: e.target.value }))}>
              <option value="both">Both WhatsApp & Business</option>
              <option value="whatsapp">WhatsApp Only</option>
              <option value="whatsapp_business">WhatsApp Business Only</option>
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
            <div><div style={{ fontSize: 14, fontWeight: 600 }}>Ignore Groups</div><div style={{ fontSize: 12, color: "var(--text-muted)" }}>Don&apos;t reply in group chats</div></div>
            <label className="toggle"><input type="checkbox" checked={settings.ignoreGroups} onChange={e => setSettings(s => ({ ...s, ignoreGroups: e.target.checked }))} /><span className="toggle-slider" /></label>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
            <div><div style={{ fontSize: 14, fontWeight: 600 }}>Auto-Reply Enabled</div><div style={{ fontSize: 12, color: "var(--text-muted)" }}>Master switch for all replies</div></div>
            <label className="toggle"><input type="checkbox" checked={settings.isEnabled} onChange={e => setSettings(s => ({ ...s, isEnabled: e.target.checked }))} /><span className="toggle-slider" /></label>
          </div>
        </div>
      </div>

      {/* Delay */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, marginBottom: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 24 }}>⏱️ Reply Delay</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          {[{ label: "Instant", value: "instant" }, { label: "1-5s", value: "random" }, { label: "Fixed", value: "fixed" }].map(opt => (
            <button key={opt.value} onClick={() => setSettings(s => ({ ...s, delay: { ...s.delay, type: opt.value } }))} style={{ padding: "12px", borderRadius: 12, border: `1px solid ${settings.delay.type === opt.value ? "var(--brand-purple)" : "var(--border)"}`, background: settings.delay.type === opt.value ? "rgba(99,102,241,0.15)" : "var(--bg-glass)", color: settings.delay.type === opt.value ? "var(--brand-purple-light)" : "var(--text-secondary)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              {opt.label}
            </button>
          ))}
        </div>
        {settings.delay.type === "fixed" && (
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>Delay (seconds): {settings.delay.fixedSeconds}s</label>
            <input type="range" min={1} max={60} value={settings.delay.fixedSeconds} onChange={e => setSettings(s => ({ ...s, delay: { ...s.delay, fixedSeconds: parseInt(e.target.value) } }))} style={{ width: "100%", accentColor: "var(--brand-purple)" }} />
          </div>
        )}
      </div>

      {/* Business Hours */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>🕐 Business Hours</h2>
          <label className="toggle"><input type="checkbox" checked={settings.businessHours.enabled} onChange={e => setSettings(s => ({ ...s, businessHours: { ...s.businessHours, enabled: e.target.checked } }))} /><span className="toggle-slider" /></label>
        </div>
        {settings.businessHours.enabled && (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>Away Message</label>
              <input className="input-field" value={settings.businessHours.awayMessage} onChange={e => setSettings(s => ({ ...s, businessHours: { ...s.businessHours, awayMessage: e.target.value } }))} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {settings.businessHours.schedule.map((day, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, background: "var(--bg-glass)", borderRadius: 10, padding: "12px 16px" }}>
                  <label className="toggle" style={{ flexShrink: 0 }}>
                    <input type="checkbox" checked={day.isOpen} onChange={e => {
                      const sc = [...settings.businessHours.schedule];
                      sc[i] = { ...sc[i], isOpen: e.target.checked };
                      setSettings(s => ({ ...s, businessHours: { ...s.businessHours, schedule: sc } }));
                    }} />
                    <span className="toggle-slider" />
                  </label>
                  <span style={{ fontSize: 14, fontWeight: 600, width: 90, flexShrink: 0 }}>{days[day.day]}</span>
                  {day.isOpen && (
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <input type="time" value={day.openTime} onChange={e => { const sc = [...settings.businessHours.schedule]; sc[i] = { ...sc[i], openTime: e.target.value }; setSettings(s => ({ ...s, businessHours: { ...s.businessHours, schedule: sc } })); }} className="input-field" style={{ width: 120 }} />
                      <span style={{ color: "var(--text-muted)" }}>to</span>
                      <input type="time" value={day.closeTime} onChange={e => { const sc = [...settings.businessHours.schedule]; sc[i] = { ...sc[i], closeTime: e.target.value }; setSettings(s => ({ ...s, businessHours: { ...s.businessHours, schedule: sc } })); }} className="input-field" style={{ width: 120 }} />
                    </div>
                  )}
                  {!day.isOpen && <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Closed</span>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
