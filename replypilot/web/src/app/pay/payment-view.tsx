"use client";
import React from "react";

export default function PaymentView({ imgUrl }: { imgUrl: string }) {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = imgUrl;
    link.download = "payment_qr_scanner.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(circle at center, #1e1b4b 0%, #09090b 100%)",
      color: "#f4f4f5",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      <div style={{
        background: "rgba(30, 27, 75, 0.4)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(99, 102, 241, 0.2)",
        borderRadius: 24,
        padding: 32,
        maxWidth: 420,
        width: "100%",
        textAlign: "center",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)"
      }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: "#a5b4fc" }}>💳 Scan & Pay</h2>
        <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 24 }}>Pay using PhonePe, GPay, Paytm, or any UPI app to add points.</p>

        {/* QR Code Wrapper */}
        <div style={{
          background: "white",
          padding: 16,
          borderRadius: 16,
          display: "inline-block",
          boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
          marginBottom: 24
        }}>
          <img
            src={imgUrl}
            alt="Payment QR Code"
            style={{ width: 280, height: 280, objectFit: "contain", display: "block" }}
          />
        </div>

        {/* Instructions */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 12,
          padding: 16,
          fontSize: 12,
          color: "#cbd5e1",
          textAlign: "left",
          lineHeight: "1.6",
          marginBottom: 24
        }}>
          <ol style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <li>Scan the QR code and complete the payment.</li>
            <li>Take a screenshot of your payment receipt.</li>
            <li>Send the screenshot to support chat for credit verification.</li>
          </ol>
        </div>

        <button
          onClick={handleDownload}
          style={{
            width: "100%",
            padding: "14px 28px",
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            border: "none",
            borderRadius: 12,
            color: "white",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)"
          }}
        >
          📥 Save QR Code Image
        </button>
      </div>
    </div>
  );
}
