"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SwitchCase {
  keyword: string;
  reply: string;
  isActive: boolean;
}

interface Profile {
  _id: string;
  name: string;
  apiKey: string;
  isEnabled: boolean;
  replyMode: "ai" | "manual" | "hybrid";
  whatsappSource: "whatsapp" | "whatsapp_business" | "both";
  ai: {
    useSystemKey: boolean;
    userApiKey?: string;
    model: string;
    temperature: number;
    maxTokens: number;
    language: "english" | "hindi" | "hinglish" | "auto";
    tone: "professional" | "friendly" | "formal" | "sales" | "support";
    replyLength: "short" | "medium" | "long";
    personality: string;
    customInstructions: string;
    memoryType: "short" | "long" | "none";
    memoryMessageCount: number;
    greetingTemplate: string;
    newAppLink: string;
    oldAppLink: string;
    websiteLink: string;
    whatsappSupport: string;
    minDeposit: number;
    minWithdraw: number;
    maxWithdraw: number;
    withdrawOpenTime: string;
    withdrawCloseTime: string;
    scannerUrl: string;
    scanners: string[];
    paymentRecipientNames: string[];
    paymentVerificationEnabled: boolean;
  };
  switchCases: SwitchCase[];
  delay: {
    type: "instant" | "fixed" | "random";
    fixedSeconds: number;
    randomMin: number;
    randomMax: number;
  };
  ignoreGroups: boolean;
  replyInGroups: boolean;
  selectedGroupsOnly: boolean;
  createdAt: string;
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [activeTab, setActiveTab] = useState<"training" | "switchcases" | "advanced">("training");

  // State for adding a new switch case
  const [newKeyword, setNewKeyword] = useState("");
  const [newReply, setNewReply] = useState("");

  // State for copying API keys
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profiles");
      const data = await res.json();
      if (data.profiles) {
        setProfiles(data.profiles);
        // Automatically select the first profile if none is selected
        if (data.profiles.length > 0 && !selectedProfile) {
          setSelectedProfile(data.profiles[0]);
        }
      }
    } catch (err) {
      console.error("Error loading profiles:", err);
    }
    setLoading(false);
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProfileName }),
      });
      const data = await res.json();
      if (data.profile) {
        setProfiles([data.profile, ...profiles]);
        setSelectedProfile(data.profile);
        setNewProfileName("");
        setShowCreateModal(false);
      } else {
        alert(data.error || "Failed to create profile");
      }
    } catch (err) {
      console.error("Error creating profile:", err);
    }
  };

  const handleSaveProfile = async () => {
    if (!selectedProfile) return;
    setSaving(true);
    setSavedMessage("");
    try {
      const res = await fetch(`/api/profiles/${selectedProfile._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedProfile),
      });
      const data = await res.json();
      if (data.profile) {
        // Update local list
        setProfiles(profiles.map(p => p._id === data.profile._id ? data.profile : p));
        setSelectedProfile(data.profile);
        setSavedMessage("💾 Bot settings saved successfully!");
        setTimeout(() => setSavedMessage(""), 3000);
      } else {
        alert(data.error || "Failed to save profile settings");
      }
    } catch (err) {
      console.error("Error saving profile settings:", err);
    }
    setSaving(false);
  };

  const handleDeleteProfile = async (id: string) => {
    if (!confirm("Are you sure you want to delete this AI bot? All conversations and training details for this bot will be disconnected.")) return;

    try {
      const res = await fetch(`/api/profiles/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        const remaining = profiles.filter(p => p._id !== id);
        setProfiles(remaining);
        if (selectedProfile?._id === id) {
          setSelectedProfile(remaining.length > 0 ? remaining[0] : null);
        }
      }
    } catch (err) {
      console.error("Error deleting profile:", err);
    }
  };

  const handleToggleEnable = async (profileToToggle: Profile) => {
    const updated = { ...profileToToggle, isEnabled: !profileToToggle.isEnabled };
    try {
      const res = await fetch(`/api/profiles/${profileToToggle._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data.profile) {
        setProfiles(profiles.map(p => p._id === data.profile._id ? data.profile : p));
        if (selectedProfile?._id === data.profile._id) {
          setSelectedProfile(data.profile);
        }
      }
    } catch (err) {
      console.error("Error toggling status:", err);
    }
  };

  const handleScannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedProfile) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        const updatedProfile = {
          ...selectedProfile,
          ai: {
            ...selectedProfile.ai,
            scanners: [...(selectedProfile.ai.scanners || []), data.url]
          }
        };
        setSelectedProfile(updatedProfile);
        alert("Scanner QR uploaded successfully! Save changes to persist.");
      } else {
        alert("Upload failed: " + (data.error || "unknown error"));
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Error uploading file.");
    }
  };

  const handleRemoveScanner = (index: number) => {
    if (!selectedProfile) return;
    const updatedProfile = {
      ...selectedProfile,
      ai: {
        ...selectedProfile.ai,
        scanners: selectedProfile.ai.scanners.filter((_, i) => i !== index)
      }
    };
    setSelectedProfile(updatedProfile);
  };

  const handleAddSwitchCase = () => {
    if (!selectedProfile || !newKeyword.trim() || !newReply.trim()) return;

    const newCase: SwitchCase = {
      keyword: newKeyword.trim(),
      reply: newReply.trim(),
      isActive: true
    };

    const updatedProfile = {
      ...selectedProfile,
      switchCases: [...(selectedProfile.switchCases || []), newCase]
    };

    setSelectedProfile(updatedProfile);
    setNewKeyword("");
    setNewReply("");
  };

  const handleRemoveSwitchCase = (index: number) => {
    if (!selectedProfile) return;
    const updatedProfile = {
      ...selectedProfile,
      switchCases: selectedProfile.switchCases.filter((_, i) => i !== index)
    };
    setSelectedProfile(updatedProfile);
  };

  const handleToggleSwitchCase = (index: number) => {
    if (!selectedProfile) return;
    const updatedProfile = {
      ...selectedProfile,
      switchCases: selectedProfile.switchCases.map((c, i) => i === index ? { ...c, isActive: !c.isActive } : c)
    };
    setSelectedProfile(updatedProfile);
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>🤖 AI Bots & Multi-Profiles</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            Create and train isolated AI Bots. Run a separate trained bot instance on each phone using unique API keys!
          </p>
        </div>
        <button className="btn-brand" onClick={() => setShowCreateModal(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px" }}>
          <span>➕</span> Create New AI Bot
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)", fontSize: 16 }}>Loading your AI Profiles...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2.2fr", gap: 32, alignItems: "start" }}>
          
          {/* LEFT COLUMN: BOTS LIST */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Your Bots ({profiles.length})</h3>
            
            {profiles.length === 0 ? (
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
                No bots created yet. Click "Create New AI Bot" to get started!
              </div>
            ) : (
              profiles.map((profile) => (
                <div 
                  key={profile._id}
                  onClick={() => setSelectedProfile(profile)}
                  style={{
                    background: selectedProfile?._id === profile._id ? "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.04))" : "var(--bg-card)",
                    border: selectedProfile?._id === profile._id ? "2px solid rgba(99,102,241,0.6)" : "1px solid var(--border)",
                    borderRadius: 16,
                    padding: 16,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    boxShadow: selectedProfile?._id === profile._id ? "0 8px 30px rgba(0,0,0,0.12)" : "none"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: 16, color: profile.isEnabled ? "var(--text-primary)" : "var(--text-muted)" }}>
                      🤖 {profile.name}
                    </span>
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleEnable(profile);
                      }}
                      style={{
                        padding: "3px 10px",
                        borderRadius: 100,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        background: profile.isEnabled ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.08)",
                        color: profile.isEnabled ? "#10b981" : "var(--text-muted)",
                        border: `1px solid ${profile.isEnabled ? "rgba(16,185,129,0.3)" : "var(--border)"}`
                      }}
                    >
                      {profile.isEnabled ? "ACTIVE" : "PAUSED"}
                    </span>
                  </div>

                  {/* API Key info */}
                  <div style={{ background: "rgba(0,0,0,0.2)", padding: "8px 12px", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <code style={{ fontSize: 11, color: "var(--text-secondary)", letterSpacing: "0.02em" }}>
                      {profile.apiKey.slice(0, 10)}...{profile.apiKey.slice(-6)}
                    </code>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(profile.apiKey);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: copiedKey === profile.apiKey ? "#10b981" : "var(--brand-purple-light)",
                        fontSize: 11,
                        cursor: "pointer",
                        fontWeight: 600
                      }}
                    >
                      {copiedKey === profile.apiKey ? "Copied! ✓" : "Copy Key"}
                    </button>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Created: {new Date(profile.createdAt).toLocaleDateString()}
                    </span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProfile(profile._id);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        fontSize: 12,
                        cursor: "pointer",
                        opacity: 0.6,
                        transition: "opacity 0.2s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = "0.6"}
                    >
                      🗑️ Delete Bot
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* RIGHT COLUMN: BOT TRAINING & RULES CONFIGURATION */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {selectedProfile ? (
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden" }}>
                {/* Header bar of Bot configurator */}
                <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.01)" }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700 }}>Configure Bot: {selectedProfile.name}</h2>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>Edit training settings, rules, and AI parameters for this bot.</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {savedMessage && <span style={{ color: "#10b981", fontSize: 13, fontWeight: 600 }}>{savedMessage}</span>}
                    <button className="btn-brand" onClick={handleSaveProfile} disabled={saving} style={{ padding: "8px 24px", fontSize: 14 }}>
                      {saving ? "Saving..." : "💾 Save Changes"}
                    </button>
                  </div>
                </div>

                {/* Tabs selection */}
                <div style={{ display: "flex", background: "rgba(0,0,0,0.15)", borderBottom: "1px solid var(--border)" }}>
                  <button 
                    onClick={() => setActiveTab("training")}
                    style={{
                      flex: 1,
                      padding: "14px 20px",
                      background: "none",
                      border: "none",
                      color: activeTab === "training" ? "var(--brand-purple-light)" : "var(--text-muted)",
                      fontWeight: 600,
                      cursor: "pointer",
                      borderBottom: activeTab === "training" ? "2px solid var(--brand-purple-light)" : "none",
                      fontSize: 14,
                      transition: "all 0.2s"
                    }}
                  >
                    🎓 AI Training Details
                  </button>
                  <button 
                    onClick={() => setActiveTab("switchcases")}
                    style={{
                      flex: 1,
                      padding: "14px 20px",
                      background: "none",
                      border: "none",
                      color: activeTab === "switchcases" ? "var(--brand-purple-light)" : "var(--text-muted)",
                      fontWeight: 600,
                      cursor: "pointer",
                      borderBottom: activeTab === "switchcases" ? "2px solid var(--brand-purple-light)" : "none",
                      fontSize: 14,
                      transition: "all 0.2s"
                    }}
                  >
                    📋 Switch-Case Menu ({selectedProfile.switchCases?.length || 0})
                  </button>
                  <button 
                    onClick={() => setActiveTab("advanced")}
                    style={{
                      flex: 1,
                      padding: "14px 20px",
                      background: "none",
                      border: "none",
                      color: activeTab === "advanced" ? "var(--brand-purple-light)" : "var(--text-muted)",
                      fontWeight: 600,
                      cursor: "pointer",
                      borderBottom: activeTab === "advanced" ? "2px solid var(--brand-purple-light)" : "none",
                      fontSize: 14,
                      transition: "all 0.2s"
                    }}
                  >
                    ⚙️ Engine Settings
                  </button>
                </div>

                {/* TAB CONTENT PANEL */}
                <div style={{ padding: 24 }}>
                  
                  {/* TAB 1: AI TRAINING DETAILS */}
                  {activeTab === "training" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                      
                      {/* Greetings setup */}
                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>💬 Greetings Setup</h4>
                        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                          Triggered on greeting messages (Hi, Hello etc.). Use <code>{`{first_name}`}</code> for WhatsApp customer name.
                        </p>
                        <input
                          type="text"
                          className="input-field"
                          value={selectedProfile.ai.greetingTemplate}
                          onChange={(e) => setSelectedProfile({
                            ...selectedProfile,
                            ai: { ...selectedProfile.ai, greetingTemplate: e.target.value }
                          })}
                          placeholder="e.g. Hello {first_name}, welcome to Main Mumbai Support!"
                        />
                      </div>

                      {/* App & Website Links */}
                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🔗 App & Website Links</h4>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>New App Link</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              value={selectedProfile.ai.newAppLink} 
                              onChange={(e) => setSelectedProfile({
                                ...selectedProfile,
                                ai: { ...selectedProfile.ai, newAppLink: e.target.value }
                              })}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Old App Link</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              value={selectedProfile.ai.oldAppLink} 
                              onChange={(e) => setSelectedProfile({
                                ...selectedProfile,
                                ai: { ...selectedProfile.ai, oldAppLink: e.target.value }
                              })}
                            />
                          </div>
                          <div style={{ gridColumn: "span 2" }}>
                            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Website URL</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              value={selectedProfile.ai.websiteLink} 
                              onChange={(e) => setSelectedProfile({
                                ...selectedProfile,
                                ai: { ...selectedProfile.ai, websiteLink: e.target.value }
                              })}
                            />
                          </div>
                        </div>
                      </div>

                      {/* QR Scanners */}
                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>📸 Multiple Payment QR Scanners</h4>
                        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                          The bot picks one QR Code randomly to balance payments. Upload scanner images for this bot.
                        </p>
                        
                        <div style={{ marginBottom: 16 }}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleScannerUpload}
                            style={{ display: "none" }}
                            id="profile-scanner-upload"
                          />
                          <label
                            htmlFor="profile-scanner-upload"
                            style={{
                              display: "inline-block",
                              padding: "8px 16px",
                              borderRadius: 10,
                              background: "rgba(99,102,241,0.1)",
                              border: "1px dashed rgba(99,102,241,0.4)",
                              color: "#a5b4fc",
                              fontWeight: 600,
                              cursor: "pointer",
                              fontSize: 12
                            }}
                          >
                            📁 Upload QR Scanner Image
                          </label>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 12 }}>
                          {(selectedProfile.ai.scanners || []).map((url, idx) => (
                            <div key={idx} style={{ position: "relative", border: "1px solid var(--border)", borderRadius: 10, padding: 6, background: "rgba(255,255,255,0.02)", textAlign: "center" }}>
                              <div style={{ width: "100%", height: 80, display: "flex", alignItems: "center", justifyContent: "center", background: "white", borderRadius: 6, overflow: "hidden", marginBottom: 6 }}>
                                <img src={url} alt={`Scanner ${idx + 1}`} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                              </div>
                              <button
                                onClick={() => handleRemoveScanner(idx)}
                                style={{
                                  width: "100%",
                                  padding: "3px 6px",
                                  borderRadius: 4,
                                  background: "rgba(239,68,68,0.15)",
                                  border: "1px solid rgba(239,68,68,0.3)",
                                  color: "#f87171",
                                  fontSize: 9,
                                  fontWeight: 600,
                                  cursor: "pointer"
                                }}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Transaction Rules */}
                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>💳 Transaction Limits & Help</h4>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Min Deposit (₹)</label>
                            <input 
                              type="number" 
                              className="input-field" 
                              value={selectedProfile.ai.minDeposit} 
                              onChange={(e) => setSelectedProfile({
                                ...selectedProfile,
                                ai: { ...selectedProfile.ai, minDeposit: Number(e.target.value) }
                              })}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Min Withdraw (₹)</label>
                            <input 
                              type="number" 
                              className="input-field" 
                              value={selectedProfile.ai.minWithdraw} 
                              onChange={(e) => setSelectedProfile({
                                ...selectedProfile,
                                ai: { ...selectedProfile.ai, minWithdraw: Number(e.target.value) }
                              })}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Max Withdraw (₹)</label>
                            <input 
                              type="number" 
                              className="input-field" 
                              value={selectedProfile.ai.maxWithdraw} 
                              onChange={(e) => setSelectedProfile({
                                ...selectedProfile,
                                ai: { ...selectedProfile.ai, maxWithdraw: Number(e.target.value) }
                              })}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Withdraw Open Time</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              value={selectedProfile.ai.withdrawOpenTime} 
                              onChange={(e) => setSelectedProfile({
                                ...selectedProfile,
                                ai: { ...selectedProfile.ai, withdrawOpenTime: e.target.value }
                              })}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Withdraw Close Time</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              value={selectedProfile.ai.withdrawCloseTime} 
                              onChange={(e) => setSelectedProfile({
                                ...selectedProfile,
                                ai: { ...selectedProfile.ai, withdrawCloseTime: e.target.value }
                              })}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>WhatsApp Support JID</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              value={selectedProfile.ai.whatsappSupport} 
                              onChange={(e) => setSelectedProfile({
                                ...selectedProfile,
                                ai: { ...selectedProfile.ai, whatsappSupport: e.target.value }
                              })}
                              placeholder="e.g. 917339987622"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Payment approved recipients */}
                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>✅ Approved Recipient Names (Payment Check)</h4>
                        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                          Verify recipient names on screenshots to detect fraud. Separate multiple names with commas.
                        </p>
                        <input
                          type="text"
                          className="input-field"
                          value={selectedProfile.ai.paymentRecipientNames?.join(", ") || ""}
                          onChange={(e) => setSelectedProfile({
                            ...selectedProfile,
                            ai: {
                              ...selectedProfile.ai,
                              paymentRecipientNames: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                            }
                          })}
                          placeholder="e.g. Vishal Sharma, Main Mumbai Support"
                        />
                        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                          <input 
                            type="checkbox"
                            id="profile-payment-enable"
                            checked={selectedProfile.ai.paymentVerificationEnabled}
                            onChange={(e) => setSelectedProfile({
                              ...selectedProfile,
                              ai: { ...selectedProfile.ai, paymentVerificationEnabled: e.target.checked }
                            })}
                          />
                          <label htmlFor="profile-payment-enable" style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", cursor: "pointer" }}>
                            Enable automatic GPT screenshot transaction verification for this bot
                          </label>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 2: SWITCH-CASE MENU */}
                  {activeTab === "switchcases" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                      <div>
                        <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>📋 Switch-Case Menu Rules</h4>
                        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          If a customer's WhatsApp message matches a keyword exactly (e.g. "1" or "menu"), this bot replies immediately with the specific response instead of running OpenAI AI.
                        </p>
                      </div>

                      {/* Add rule form */}
                      <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 16, padding: 18 }}>
                        <h5 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--brand-purple-light)" }}>Add Switch Case / Menu Rule</h5>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Trigger Keyword (e.g. 1, help, rates)</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              value={newKeyword} 
                              onChange={(e) => setNewKeyword(e.target.value)}
                              placeholder="e.g. 1"
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Reply Message Content</label>
                            <textarea 
                              className="input-field" 
                              rows={3}
                              value={newReply} 
                              onChange={(e) => setNewReply(e.target.value)}
                              placeholder="Type the message that will be sent back..."
                            />
                          </div>
                          <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            <button 
                              className="btn-brand" 
                              onClick={handleAddSwitchCase}
                              disabled={!newKeyword.trim() || !newReply.trim()}
                              style={{ padding: "6px 18px", fontSize: 12 }}
                            >
                              ➕ Add Rule
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Rules list */}
                      <div>
                        <h5 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Active Switch Cases</h5>
                        {(!selectedProfile.switchCases || selectedProfile.switchCases.length === 0) ? (
                          <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", background: "rgba(255,255,255,0.01)", border: "1px dashed var(--border)", borderRadius: 12 }}>
                            No switch case rules defined yet.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {selectedProfile.switchCases.map((rule, idx) => (
                              <div 
                                key={idx} 
                                style={{ 
                                  display: "flex", 
                                  justifyContent: "space-between", 
                                  alignItems: "center", 
                                  background: "rgba(255,255,255,0.02)", 
                                  border: "1px solid var(--border)", 
                                  borderRadius: 12, 
                                  padding: "12px 16px" 
                                }}
                              >
                                <div style={{ flex: 1, marginRight: 24 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, background: "rgba(99,102,241,0.2)", color: "#a5b4fc", padding: "2px 8px", borderRadius: 6 }}>
                                      Keyword: "{rule.keyword}"
                                    </span>
                                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                      → Quick Reply
                                    </span>
                                  </div>
                                  <p style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "pre-line" }}>
                                    {rule.reply}
                                  </p>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                  <button
                                    onClick={() => handleToggleSwitchCase(idx)}
                                    style={{
                                      padding: "4px 10px",
                                      borderRadius: 6,
                                      fontSize: 11,
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      background: rule.isActive ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
                                      color: rule.isActive ? "#10b981" : "var(--text-muted)",
                                      border: "1px solid " + (rule.isActive ? "rgba(16,185,129,0.3)" : "var(--border)")
                                    }}
                                  >
                                    {rule.isActive ? "Active" : "Disabled"}
                                  </button>
                                  <button 
                                    onClick={() => handleRemoveSwitchCase(idx)}
                                    style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 14 }}
                                    title="Delete Rule"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 3: ENGINE SETTINGS */}
                  {activeTab === "advanced" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                      
                      {/* AI prompt instructions */}
                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>📝 Custom Prompt Instructions (System Prompt)</h4>
                        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                          Fine-tune the bot's behavior, market rates, timing parameters, and extra instructions.
                        </p>
                        <textarea
                          className="input-field"
                          rows={6}
                          value={selectedProfile.ai.customInstructions}
                          onChange={(e) => setSelectedProfile({
                            ...selectedProfile,
                            ai: { ...selectedProfile.ai, customInstructions: e.target.value }
                          })}
                          placeholder="e.g. Kalyan jodi rates are 10 ka 950. Milan open timing is 1:00 PM. Treat all players with maximum respect."
                        />
                      </div>

                      {/* Parameters */}
                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>⚙️ OpenAI Engine Parameters</h4>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Model Selection</label>
                            <select 
                              className="input-field"
                              value={selectedProfile.ai.model}
                              onChange={(e) => setSelectedProfile({
                                ...selectedProfile,
                                ai: { ...selectedProfile.ai, model: e.target.value }
                              })}
                            >
                              <option value="gpt-4o-mini">GPT-4o Mini (Recommended - Fast & Cheap)</option>
                              <option value="gpt-4o">GPT-4o (Smartest - High accuracy)</option>
                              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Legacy)</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Temperature (Creativity: 0.0 - 2.0)</label>
                            <input 
                              type="number" 
                              step="0.1"
                              className="input-field"
                              value={selectedProfile.ai.temperature}
                              onChange={(e) => setSelectedProfile({
                                ...selectedProfile,
                                ai: { ...selectedProfile.ai, temperature: Number(e.target.value) }
                              })}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>AI Personality Description</label>
                            <input 
                              type="text" 
                              className="input-field"
                              value={selectedProfile.ai.personality}
                              onChange={(e) => setSelectedProfile({
                                ...selectedProfile,
                                ai: { ...selectedProfile.ai, personality: e.target.value }
                              })}
                              placeholder="e.g. professional cashier, friendly guide"
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Response Length</label>
                            <select 
                              className="input-field"
                              value={selectedProfile.ai.replyLength}
                              onChange={(e) => setSelectedProfile({
                                ...selectedProfile,
                                ai: { ...selectedProfile.ai, replyLength: e.target.value as any }
                              })}
                            >
                              <option value="short">Short (1-2 sentences)</option>
                              <option value="medium">Medium (2-4 sentences)</option>
                              <option value="long">Detailed (Full details)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Filters & Groups */}
                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🛡️ Group Filters</h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <div style={{ display: "flex", gap: 12 }}>
                            <input 
                              type="checkbox"
                              id="profile-ignore-groups"
                              checked={selectedProfile.ignoreGroups}
                              onChange={(e) => setSelectedProfile({
                                ...selectedProfile,
                                ignoreGroups: e.target.checked
                              })}
                            />
                            <label htmlFor="profile-ignore-groups" style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", cursor: "pointer" }}>
                              Ignore messages from WhatsApp groups (Highly Recommended)
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Custom API Key */}
                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>🔑 Custom OpenAI API Key Override</h4>
                        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                          By default, this bot uses the System Admin API Key. Check the option below to override it and use your own OpenAI API key.
                        </p>
                        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                          <input 
                            type="checkbox"
                            id="profile-use-system-key"
                            checked={selectedProfile.ai.useSystemKey}
                            onChange={(e) => setSelectedProfile({
                              ...selectedProfile,
                              ai: { ...selectedProfile.ai, useSystemKey: e.target.checked }
                            })}
                          />
                          <label htmlFor="profile-use-system-key" style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", cursor: "pointer" }}>
                            Use system-wide OpenAI key (recommended)
                          </label>
                        </div>
                        
                        {!selectedProfile.ai.useSystemKey && (
                          <input 
                            type="password"
                            className="input-field"
                            value={selectedProfile.ai.userApiKey || ""}
                            onChange={(e) => setSelectedProfile({
                              ...selectedProfile,
                              ai: { ...selectedProfile.ai, userApiKey: e.target.value }
                            })}
                            placeholder="Enter your personal OpenAI API Key (sk-...)"
                          />
                        )}
                      </div>

                    </motion.div>
                  )}

                </div>
              </div>
            ) : (
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
                <h2>No AI Bot Selected</h2>
                <p style={{ marginTop: 8 }}>Please select or create an AI Bot profile from the left sidebar to start training.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* CREATE NEW BOT MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: 32, width: "100%", maxWidth: 450, boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}
            >
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, fontFamily: "'Outfit', sans-serif" }}>Create Trained AI Bot</h2>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>Give your bot a name (e.g. "Kalyan Chatbot" or "Main Mumbai Bot"). This will isolate its training parameters.</p>
              
              <form onSubmit={handleCreateProfile}>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 8 }}>AI Bot / Profile Name</label>
                  <input
                    type="text"
                    className="input-field"
                    required
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="e.g. Gali Desawar Support"
                    autoFocus
                  />
                </div>
                
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                  <button 
                    type="button" 
                    onClick={() => setShowCreateModal(false)}
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "8px 18px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      color: "var(--text-primary)"
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-brand" style={{ padding: "8px 24px", fontSize: 13 }}>
                    🚀 Create Bot
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
