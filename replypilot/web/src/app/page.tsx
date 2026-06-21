"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const features = [
    { icon: "🤖", title: "AI Auto Reply", desc: "GPT-4 powered replies that sound human. Configure tone, language, and personality." },
    { icon: "📋", title: "Manual Rules", desc: "Keyword-based rules for instant replies. Hi → Hello 👋. Price → ₹499 plan." },
    { icon: "🔀", title: "Hybrid Mode", desc: "AI handles complex queries; rules handle FAQs. Best of both worlds." },
    { icon: "🌐", title: "Multi-Language", desc: "Reply in English, Hindi, Hinglish, or auto-detect the sender's language." },
    { icon: "⏰", title: "Business Hours", desc: "Auto-reply only during work hours. Send away messages outside hours." },
    { icon: "📊", title: "Analytics", desc: "Track messages, replies, AI usage, and success rates with beautiful charts." },
    { icon: "👥", title: "Contact Filters", desc: "VIP contacts, block list, group filters. Full control over who gets replies." },
    { icon: "📱", title: "Android App", desc: "Runs silently in background. Works with WhatsApp & WhatsApp Business." },
  ];

  const steps = [
    { n: "01", title: "Sign Up & Install App", desc: "Create your account and install our Android app on your phone." },
    { n: "02", title: "Connect WhatsApp", desc: "Grant notification access. The app reads incoming messages securely." },
    { n: "03", title: "Configure AI", desc: "Set your tone, language, custom instructions, and reply mode." },
    { n: "04", title: "Auto-Reply Starts", desc: "Go live! ReplyPilot handles all replies while you focus on what matters." },
  ];

  const plans = [
    { name: "Free", price: "₹0", period: "/month", color: "border-white/10", features: ["100 messages/month", "5 manual rules", "10 contacts", "Basic analytics"], cta: "Get Started", href: "/register" },
    { name: "Starter", price: "₹499", period: "/month", color: "border-indigo-500/50", popular: false, features: ["1,000 messages/month", "AI auto-reply", "25 rules", "100 contacts", "Standard analytics"], cta: "Start Free Trial", href: "/register" },
    { name: "Pro", price: "₹999", period: "/month", color: "border-indigo-400", popular: true, features: ["10,000 messages/month", "AI + Hybrid mode", "Unlimited rules", "Unlimited contacts", "Advanced analytics", "Priority support"], cta: "Go Pro", href: "/register" },
    { name: "Business", price: "₹2,499", period: "/month", color: "border-purple-500/50", features: ["Unlimited messages", "Custom AI persona", "Multi-device", "Custom reports", "Dedicated support", "API access"], cta: "Contact Sales", href: "/register" },
  ];

  const faqs = [
    { q: "Does ReplyPilot work with both WhatsApp and WhatsApp Business?", a: "Yes! ReplyPilot supports both WhatsApp and WhatsApp Business. You can configure it to reply to one or both simultaneously." },
    { q: "Is my WhatsApp data secure?", a: "Absolutely. Messages are processed in real-time and never stored permanently without your consent. All data is encrypted end-to-end." },
    { q: "Do I need to keep my phone on?", a: "Yes, the Android app needs to run in the background on your phone. It uses a foreground service with minimal battery usage." },
    { q: "Can I use my own OpenAI API key?", a: "Yes! You can bring your own OpenAI API key to control costs. We also offer a system key option included in Pro and Business plans." },
    { q: "What languages does the AI support?", a: "The AI supports English, Hindi, Hinglish, and can auto-detect the language of incoming messages to reply accordingly." },
  ];

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      {/* Navbar */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, borderBottom: "1px solid var(--border)", backdropFilter: "blur(20px)", background: "rgba(10,10,15,0.8)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, background: "var(--gradient-brand)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>✈️</div>
            <span style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }} className="gradient-text">ReplyPilot</span>
          </div>
          <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
            <Link href="#features" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>Features</Link>
            <Link href="#pricing" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>Pricing</Link>
            <Link href="#faq" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>FAQ</Link>
            <Link href="/login" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>Login</Link>
            <Link href="/register" className="btn-brand" style={{ padding: "8px 20px", borderRadius: 10, textDecoration: "none", fontSize: 14 }}>Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ paddingTop: 160, paddingBottom: 100, textAlign: "center", position: "relative", overflow: "hidden" }}>
        {/* Background glow */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 800, height: 600, background: "radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 100, padding: "6px 16px", marginBottom: 32 }}>
            <span style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>● LIVE</span>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>AI-powered WhatsApp automation is here</span>
          </div>
          <h1 style={{ fontSize: "clamp(42px, 6vw, 80px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 24, fontFamily: "'Outfit', sans-serif" }}>
            Auto-Reply to WhatsApp<br />
            <span className="gradient-text">with the Power of AI</span>
          </h1>
          <p style={{ fontSize: 18, color: "var(--text-secondary)", maxWidth: 600, margin: "0 auto 40px", lineHeight: 1.8 }}>
            ReplyPilot reads your WhatsApp notifications and sends intelligent AI replies automatically — 24/7, in Hindi, English, or Hinglish.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/register" className="btn-brand" style={{ fontSize: 16, padding: "14px 32px", textDecoration: "none" }}>
              🚀 Start for Free
            </Link>
            <a href="#how-it-works" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px", borderRadius: 12, border: "1px solid var(--border-strong)", color: "var(--text-primary)", fontSize: 16, textDecoration: "none", fontWeight: 500, transition: "all 0.3s" }}>
              ▶ See How It Works
            </a>
          </div>
          <p style={{ marginTop: 24, color: "var(--text-muted)", fontSize: 13 }}>No credit card required · Free plan available · Setup in 5 minutes</p>
        </motion.div>

        {/* Hero Dashboard Preview */}
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.3 }} style={{ maxWidth: 900, margin: "80px auto 0", padding: "0 24px" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden", boxShadow: "0 40px 80px rgba(0,0,0,0.5)" }}>
            {/* Fake browser bar */}
            <div style={{ background: "var(--bg-secondary)", padding: "12px 20px", display: "flex", gap: 8, alignItems: "center", borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }} />
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f59e0b" }} />
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#10b981" }} />
              <div style={{ flex: 1, background: "var(--bg-glass)", borderRadius: 6, padding: "4px 12px", fontSize: 12, color: "var(--text-muted)", marginLeft: 12 }}>replypilot.app/dashboard</div>
            </div>
            {/* Dashboard content preview */}
            <div style={{ padding: 24, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              {[
                { label: "Messages Today", value: "1,284", icon: "💬", color: "#6366f1" },
                { label: "Replies Sent", value: "1,247", icon: "✅", color: "#10b981" },
                { label: "AI Replies", value: "983", icon: "🤖", color: "#8b5cf6" },
                { label: "Success Rate", value: "97.1%", icon: "📈", color: "#f59e0b" },
              ].map((stat) => (
                <div key={stat.label} style={{ background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px" }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{stat.icon}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: "100px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <h2 style={{ fontSize: 42, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>Everything You Need</h2>
          <p style={{ color: "var(--text-secondary)", marginTop: 16, fontSize: 18 }}>Powerful features to automate your WhatsApp completely</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card" style={{ padding: 28 }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7 }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" style={{ padding: "100px 24px", background: "var(--bg-secondary)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 42, fontWeight: 800, fontFamily: "'Outfit', sans-serif", marginBottom: 16 }}>How It Works</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 18, marginBottom: 64 }}>Get started in under 5 minutes</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 32 }}>
            {steps.map((s) => (
              <div key={s.n} style={{ textAlign: "center" }}>
                <div style={{ width: 64, height: 64, background: "var(--gradient-brand)", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 20, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>{s.n}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{s.title}</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: "100px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <h2 style={{ fontSize: 42, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>Simple Pricing</h2>
          <p style={{ color: "var(--text-secondary)", marginTop: 16, fontSize: 18 }}>Start free, scale as you grow</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}>
          {plans.map((p) => (
            <div key={p.name} style={{ background: "var(--bg-card)", border: `1px solid ${p.popular ? "var(--brand-purple)" : "var(--border)"}`, borderRadius: 20, padding: 28, position: "relative", transform: p.popular ? "scale(1.04)" : "none", boxShadow: p.popular ? "var(--shadow-glow)" : "none" }}>
              {p.popular && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "var(--gradient-brand)", color: "white", borderRadius: 100, padding: "4px 16px", fontSize: 12, fontWeight: 700 }}>MOST POPULAR</div>}
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{p.name}</h3>
              <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: 36, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>{p.price}</span>
                <span style={{ color: "var(--text-muted)", fontSize: 14 }}>{p.period}</span>
              </div>
              <ul style={{ listStyle: "none", marginBottom: 28 }}>
                {p.features.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 14, color: "var(--text-secondary)" }}>
                    <span style={{ color: "#10b981", fontWeight: 700 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href={p.href} className="btn-brand" style={{ display: "block", textAlign: "center", textDecoration: "none", padding: "12px", borderRadius: 12, background: p.popular ? "var(--gradient-brand)" : "var(--bg-glass)", color: p.popular ? "white" : "var(--text-primary)", border: p.popular ? "none" : "1px solid var(--border-strong)" }}>{p.cta}</Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: "100px 24px", background: "var(--bg-secondary)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h2 style={{ fontSize: 42, fontWeight: 800, fontFamily: "'Outfit', sans-serif", textAlign: "center", marginBottom: 64 }}>Frequently Asked Questions</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {faqs.map((faq) => (
              <div key={faq.q} className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>{faq.q}</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7 }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center", background: "var(--bg-card)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 24, padding: 64, boxShadow: "var(--shadow-glow)" }}>
          <h2 style={{ fontSize: 42, fontWeight: 800, fontFamily: "'Outfit', sans-serif", marginBottom: 16 }}>Start Automating Today</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 18, marginBottom: 40 }}>Join thousands of businesses saving hours every day with ReplyPilot</p>
          <Link href="/register" className="btn-brand" style={{ fontSize: 18, padding: "16px 40px", textDecoration: "none" }}>🚀 Get Started Free</Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 30, height: 30, background: "var(--gradient-brand)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✈️</div>
          <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }} className="gradient-text">ReplyPilot</span>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>© 2025 ReplyPilot. All rights reserved. · <Link href="/privacy" style={{ color: "var(--text-muted)" }}>Privacy</Link> · <Link href="/terms" style={{ color: "var(--text-muted)" }}>Terms</Link></p>
      </footer>
    </div>
  );
}
