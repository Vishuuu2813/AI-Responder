"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registration failed"); setLoading(false); return; }
      router.push("/login?registered=true");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, padding: "20px 32px" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, background: "var(--gradient-brand)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>✈️</div>
          <span style={{ fontWeight: 800, fontSize: 18, fontFamily: "'Outfit', sans-serif" }} className="gradient-text">ReplyPilot</span>
        </Link>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: 40 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Outfit', sans-serif", marginBottom: 8 }}>Create account</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 32 }}>Start automating WhatsApp for free</p>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#ef4444", fontSize: 14 }}>{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            {[
              { label: "Full Name", key: "name", type: "text", placeholder: "John Doe" },
              { label: "Email", key: "email", type: "email", placeholder: "you@example.com" },
              { label: "Password", key: "password", type: "password", placeholder: "Min 8 characters" },
            ].map((field) => (
              <div key={field.key} style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>{field.label}</label>
                <input
                  className="input-field"
                  type={field.type}
                  placeholder={field.placeholder}
                  value={form[field.key as keyof typeof form]}
                  onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                  required
                  minLength={field.key === "password" ? 8 : undefined}
                />
              </div>
            ))}

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" required style={{ marginTop: 2 }} />
                <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  I agree to the <Link href="/terms" style={{ color: "var(--brand-purple-light)" }}>Terms of Service</Link> and <Link href="/privacy" style={{ color: "var(--brand-purple-light)" }}>Privacy Policy</Link>
                </span>
              </label>
            </div>

            <button type="submit" className="btn-brand" style={{ width: "100%", padding: "13px", fontSize: 15 }} disabled={loading}>
              {loading ? "Creating account..." : "Create Free Account"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "var(--text-secondary)" }}>
            Already have an account? <Link href="/login" style={{ color: "var(--brand-purple-light)", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
