"use client";

import { useState, useEffect, useRef } from "react";

interface Scanner {
  id: string;
  name: string;
  keywords: string[];
  imageBase64: string;
  createdAt: string;
}

export default function ScannerPage() {
  const [scanners, setScanners] = useState<Scanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchScanners();
  }, []);

  async function fetchScanners() {
    setLoading(true);
    try {
      const res = await fetch("/api/scanner");
      if (res.ok) {
        const data = await res.json();
        setScanners(data.scanners || []);
      }
    } catch (e) {
      setError("Failed to load scanners");
    } finally {
      setLoading(false);
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setImagePreview(result);
      setImageBase64(result.split(",")[1]); // strip data:image/... prefix
    };
    reader.readAsDataURL(file);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !imageBase64) {
      setError("Name aur image required hain");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const kwList = keywords.split(",").map((k) => k.trim()).filter(Boolean);
      const res = await fetch("/api/scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), keywords: kwList, imageBase64 }),
      });
      if (res.ok) {
        setSuccess("✅ Scanner added!");
        setName("");
        setKeywords("");
        setImageBase64("");
        setImagePreview("");
        if (fileRef.current) fileRef.current.value = "";
        fetchScanners();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to add scanner");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this scanner?")) return;
    try {
      const res = await fetch("/api/scanner", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setScanners((prev) => prev.filter((s) => s.id !== id));
        setSuccess("Deleted!");
      }
    } catch {
      setError("Failed to delete");
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px" }}>
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
          📱 Scanner / QR Auto-Send
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>
          Jab koi user specific keyword bheje (e.g., "QR bhejo", "scanner chahiye"), extension/bot automatically configured image bhej dega.
        </p>
      </div>

      {/* How it works */}
      <div style={{
        background: "linear-gradient(135deg, #1e1b4b, #312e81)",
        border: "1px solid #4338ca",
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 24,
        fontSize: 13,
        color: "#c7d2fe",
        lineHeight: 1.8,
      }}>
        <strong style={{ color: "#a5b4fc" }}>⚡ Kaise kaam karta hai:</strong>
        <br />
        1. Neeche ek scanner add karo (naam, trigger keywords, aur QR image upload karo)
        <br />
        2. Jab koi user keyword bheje (jaise "payment QR", "scanner bhejo") → bot automatically woh image reply mein bhej deta hai
        <br />
        3. Multiple scanners add kar sakte ho — alag-alag accounts ke liye alag QR
      </div>

      {/* Add Scanner Form */}
      <div style={{
        background: "#1e2530",
        borderRadius: 14,
        padding: "22px",
        marginBottom: 28,
        border: "1px solid #334155",
      }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: "#fff", marginBottom: 18 }}>
          ➕ Naya Scanner Add Karo
        </h2>

        <form onSubmit={handleAdd}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {/* Name */}
            <div>
              <label style={labelStyle}>Scanner Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. UPI QR - Vishal"
                style={inputStyle}
              />
            </div>

            {/* Keywords */}
            <div>
              <label style={labelStyle}>Trigger Keywords (comma separated)</label>
              <input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="qr bhejo, scanner, payment qr, qr code"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Image Upload */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>QR / Scanner Image Upload</label>
            <div style={{
              border: "2px dashed #334155",
              borderRadius: 10,
              padding: 20,
              textAlign: "center",
              cursor: "pointer",
              transition: "border-color 0.2s",
              background: "#0f1117",
            }}
              onClick={() => fileRef.current?.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="preview" style={{ maxHeight: 160, borderRadius: 8, objectFit: "contain" }} />
              ) : (
                <>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📤</div>
                  <div style={{ color: "#64748b", fontSize: 13 }}>Click to upload QR image (PNG/JPG)</div>
                </>
              )}
            </div>
            <input type="file" accept="image/*" ref={fileRef} onChange={handleImageUpload} style={{ display: "none" }} />
          </div>

          {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 10 }}>{error}</div>}
          {success && <div style={{ color: "#22c55e", fontSize: 13, marginBottom: 10 }}>{success}</div>}

          <button
            type="submit"
            disabled={saving}
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving..." : "💾 Scanner Save Karo"}
          </button>
        </form>
      </div>

      {/* Scanner List */}
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: "#fff", marginBottom: 14 }}>
          📋 Configured Scanners ({scanners.length})
        </h2>

        {loading ? (
          <div style={{ color: "#64748b", textAlign: "center", padding: 32 }}>Loading...</div>
        ) : scanners.length === 0 ? (
          <div style={{
            background: "#1e2530",
            borderRadius: 12,
            padding: 32,
            textAlign: "center",
            color: "#64748b",
            border: "1px dashed #334155",
          }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
            <div>Koi scanner nahi mila. Upar se add karo!</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {scanners.map((sc) => (
              <div key={sc.id} style={{
                background: "#1e2530",
                borderRadius: 12,
                padding: "16px 18px",
                border: "1px solid #334155",
                display: "grid",
                gridTemplateColumns: "80px 1fr auto",
                alignItems: "center",
                gap: 16,
              }}>
                {/* Image Preview */}
                {sc.imageBase64 ? (
                  <img
                    src={`data:image/png;base64,${sc.imageBase64}`}
                    alt={sc.name}
                    style={{ width: 72, height: 72, objectFit: "contain", borderRadius: 8, background: "#fff", padding: 4 }}
                  />
                ) : (
                  <div style={{ width: 72, height: 72, borderRadius: 8, background: "#334155", display: "grid", placeItems: "center", color: "#64748b" }}>📷</div>
                )}

                {/* Info */}
                <div>
                  <div style={{ fontWeight: 700, color: "#fff", fontSize: 15, marginBottom: 6 }}>{sc.name}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {(sc.keywords || []).map((kw) => (
                      <span key={kw} style={{
                        background: "#1e3a5f",
                        color: "#60a5fa",
                        borderRadius: 4,
                        padding: "2px 8px",
                        fontSize: 11,
                        fontWeight: 600,
                      }}>
                        {kw}
                      </span>
                    ))}
                    {(sc.keywords || []).length === 0 && (
                      <span style={{ color: "#64748b", fontSize: 12 }}>No keywords set</span>
                    )}
                  </div>
                  <div style={{ color: "#475569", fontSize: 11, marginTop: 6 }}>
                    Added: {sc.createdAt ? new Date(sc.createdAt).toLocaleString("en-IN") : "—"}
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(sc.id)}
                  style={{
                    background: "#450a0a",
                    color: "#f87171",
                    border: "1px solid #7f1d1d",
                    borderRadius: 7,
                    padding: "6px 12px",
                    fontSize: 12,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  🗑️ Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  color: "#94a3b8",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0f1117",
  border: "1px solid #334155",
  borderRadius: 7,
  padding: "9px 12px",
  color: "#e2e8f0",
  fontSize: 13,
  outline: "none",
};
