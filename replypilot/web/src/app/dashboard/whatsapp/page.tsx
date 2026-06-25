"use client";

import { useEffect, useState, useRef } from "react";

export default function WhatsAppLinkPage() {
  const [status, setStatus] = useState<"disconnected" | "connecting" | "qr" | "connected">("disconnected");
  const [qr, setQr] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  // Fetch status on load
  useEffect(() => {
    fetchStatus();
    return () => stopPolling();
  }, []);

  // Poll status when connecting or waiting for QR scan
  useEffect(() => {
    if (status === "connecting" || status === "qr") {
      startPolling();
    } else {
      stopPolling();
    }
  }, [status]);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/whatsapp");
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
        setQr(data.qr);
        setPhoneNumber(data.phoneNumber);
      } else {
        setError("Failed to fetch WhatsApp bot service status.");
      }
    } catch (e: any) {
      setError("WhatsApp bot service is unreachable.");
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    if (pollInterval.current) return;
    pollInterval.current = setInterval(async () => {
      try {
        const res = await fetch("/api/whatsapp");
        if (res.ok) {
          const data = await res.json();
          setStatus(data.status);
          setQr(data.qr);
          setPhoneNumber(data.phoneNumber);
        }
      } catch (e) {
        console.error("Error polling status:", e);
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
  };

  const handleStartConnection = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/whatsapp?action=start", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
        setQr(data.qr);
        setPhoneNumber(data.phoneNumber);
      } else {
        setError("Failed to start WhatsApp connection.");
      }
    } catch (e) {
      setError("Failed to start connection. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm("Are you sure you want to disconnect your WhatsApp account?")) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/whatsapp?action=logout", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
        setQr(null);
        setPhoneNumber(null);
      } else {
        setError("Failed to logout.");
      }
    } catch (e) {
      setError("Failed to disconnect WhatsApp. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div style={{ color: "var(--text-muted)", padding: 40 }}>Loading WhatsApp connection status...</div>;
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
          🔌 WhatsApp Link Device
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
          Scan the QR code to link your WhatsApp account directly to the server. No extension or Android app required.
        </p>
      </div>

      {error && (
        <div style={{
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.2)",
          color: "#f87171",
          padding: "12px 16px",
          borderRadius: 12,
          marginBottom: 24,
          fontSize: 14
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Main Status Card */}
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: 32,
        marginBottom: 28,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}>
        {/* Status Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <span style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: status === "connected" ? "#22c55e" : status === "connecting" ? "#eab308" : "#94a3b8",
            boxShadow: status === "connected" ? "0 0 12px #22c55e" : status === "connecting" ? "0 0 12px #eab308" : "none",
            display: "inline-block"
          }} />
          <span style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>
            {status === "connected" ? "Connected" : status === "connecting" ? "Connecting..." : status === "qr" ? "Scan QR Code" : "Disconnected"}
          </span>
        </div>

        {/* Disconnected State */}
        {status === "disconnected" && (
          <div style={{ maxWidth: 450 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📲</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Link your WhatsApp Account</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              System directly WhatsApp server se connect ho jayega. Phone offline hone par bhi auto-replies chalti rahengi.
            </p>
            <button
              className="btn-brand"
              onClick={handleStartConnection}
              disabled={actionLoading}
              style={{ padding: "12px 32px", fontSize: 14, fontWeight: 600 }}
            >
              {actionLoading ? "Initializing..." : "🚀 Connect WhatsApp"}
            </button>
          </div>
        )}

        {/* Connecting State */}
        {status === "connecting" && (
          <div style={{ maxWidth: 400, padding: "20px 0" }}>
            <div style={{
              width: 48,
              height: 48,
              border: "4px solid var(--border)",
              borderTopColor: "var(--brand-purple)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px"
            }} />
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}} />
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Connecting to WhatsApp...</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
              Please wait while we initialize the connection server.
            </p>
          </div>
        )}

        {/* QR State */}
        {status === "qr" && qr && (
          <div style={{ maxWidth: 500 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Scan QR Code</h3>
            
            {/* QR Frame */}
            <div style={{
              background: "#fff",
              padding: 16,
              borderRadius: 12,
              display: "inline-block",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              marginBottom: 20
            }}>
              <img src={qr} alt="WhatsApp QR Code" style={{ width: 220, height: 220 }} />
            </div>

            {/* Scanning Instructions */}
            <div style={{
              textAlign: "left",
              background: "var(--bg-glass)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "16px 20px",
              fontSize: 13,
              lineHeight: 1.6,
              color: "var(--text-secondary)"
            }}>
              <strong style={{ color: "#fff", display: "block", marginBottom: 8 }}>📌 Scan kaise karein:</strong>
              1. Phone mein <strong>WhatsApp</strong> open karein.<br />
              2. Top right corner mein <strong>Menu (three dots)</strong> ya Settings par tap karein.<br />
              3. <strong>Linked Devices</strong> choose karein, fir <strong>Link a Device</strong> par click karein.<br />
              4. Apne phone camera se is QR Code ko scan karein.
            </div>

            <button
              onClick={handleLogout}
              disabled={actionLoading}
              style={{
                marginTop: 20,
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                fontSize: 12,
                cursor: "pointer",
                textDecoration: "underline"
              }}
            >
              Cancel Link Request
            </button>
          </div>
        )}

        {/* Connected State */}
        {status === "connected" && (
          <div style={{ maxWidth: 500 }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "rgba(34, 197, 94, 0.1)",
              border: "2px solid #22c55e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              margin: "0 auto 20px",
              boxShadow: "0 0 20px rgba(34, 197, 94, 0.2)"
            }}>
              ✅
            </div>
            
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
              WhatsApp Linked!
            </h3>
            
            {phoneNumber && (
              <div style={{
                background: "var(--bg-glass)",
                border: "1px solid var(--border)",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                color: "var(--brand-purple-light)",
                display: "inline-block",
                marginBottom: 20,
                letterSpacing: "0.5px"
              }}>
                📞 +{phoneNumber}
              </div>
            )}

            <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6, marginBottom: 28 }}>
              Aapka WhatsApp account completely linked hai. Bot background mein auto-replies aur payment verification process kar raha hai.
            </p>

            <button
              onClick={handleLogout}
              disabled={actionLoading}
              style={{
                background: "#7f1d1d",
                color: "#f87171",
                border: "1px solid #991b1b",
                borderRadius: 8,
                padding: "10px 24px",
                fontSize: 13,
                fontWeight: 600,
                cursor: actionLoading ? "not-allowed" : "pointer"
              }}
            >
              {actionLoading ? "Disconnecting..." : "🔌 Disconnect WhatsApp"}
            </button>
          </div>
        )}
      </div>

      {/* Benefits Card */}
      <div style={{
        background: "linear-gradient(135deg, #1e1b4b, #111827)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "24px 28px",
      }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 12 }}>⚡ Server-side Connection Advantages:</h4>
        <ul style={{
          margin: 0,
          paddingLeft: 20,
          fontSize: 13,
          color: "var(--text-secondary)",
          lineHeight: 1.8,
        }}>
          <li>Computer par browser ya Chrome extension khula rakhna <strong>Nahi</strong> padega.</li>
          <li>Android phone par <strong>AutoMationBot</strong> run karna <strong>Nahi</strong> padega.</li>
          <li>Phone off hone ya internet na hone par bhi bot 24/7 online reply karega.</li>
          <li>Direct WhatsApp server se connect hone ki wajah se messages <strong>Instant</strong> bhejta hai aur mix-up nahi hote.</li>
        </ul>
      </div>
    </div>
  );
}
