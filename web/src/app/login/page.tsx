"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) { setError("Invalid email or password"); setLoading(false); return; }
    router.push("/dashboard");
  };

  const handleGoogle = () => signIn("google", { callbackUrl: "/dashboard" });

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
          <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Outfit', sans-serif", marginBottom: 8 }}>Welcome back</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 32 }}>Sign in to your ReplyPilot account</p>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#ef4444", fontSize: 14 }}>{error}</div>
          )}

          <button onClick={handleGoogle} style={{ width: "100%", background: "var(--bg-glass)", border: "1px solid var(--border-strong)", borderRadius: 12, padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--text-primary)", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 24, transition: "all 0.2s" }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>Email</label>
              <input className="input-field" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>Password</label>
              <input className="input-field" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn-brand" style={{ width: "100%", padding: "13px", fontSize: 15 }} disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "var(--text-secondary)" }}>
            Don&apos;t have an account? <Link href="/register" style={{ color: "var(--brand-purple-light)", fontWeight: 600, textDecoration: "none" }}>Sign up free</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
