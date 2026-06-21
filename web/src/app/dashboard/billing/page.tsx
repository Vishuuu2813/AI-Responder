"use client";
import Link from "next/link";

const plans = [
  { name: "Free", price: "₹0", period: "/month", color: "var(--border)", features: ["100 messages/month", "5 manual rules", "10 contacts", "Basic analytics"], current: true },
  { name: "Starter", price: "₹499", period: "/month", color: "rgba(99,102,241,0.4)", features: ["1,000 messages/month", "AI auto-reply", "25 rules", "100 contacts", "Standard analytics"], current: false },
  { name: "Pro", price: "₹999", period: "/month", color: "var(--brand-purple)", popular: true, features: ["10,000 messages/month", "AI + Hybrid mode", "Unlimited rules", "Unlimited contacts", "Advanced analytics", "Priority support"], current: false },
  { name: "Business", price: "₹2,499", period: "/month", color: "rgba(139,92,246,0.4)", features: ["Unlimited messages", "Custom AI persona", "API access", "Custom reports", "Dedicated support"], current: false },
];

export default function BillingPage() {
  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>Billing & Plans</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>Manage your subscription and billing</p>
      </div>

      {/* Current Plan Banner */}
      <div style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 16, padding: 24, marginBottom: 32, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--brand-purple-light)", fontWeight: 600, marginBottom: 4 }}>CURRENT PLAN</div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>Free Plan</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>100 messages/month · 5 rules · 10 contacts</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Messages used this month</div>
          <div style={{ fontSize: 32, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>23 <span style={{ fontSize: 16, color: "var(--text-muted)", fontWeight: 400 }}>/ 100</span></div>
          <div style={{ width: 200, height: 6, background: "var(--bg-glass)", borderRadius: 3, marginTop: 8 }}>
            <div style={{ width: "23%", height: "100%", background: "var(--gradient-brand)", borderRadius: 3 }} />
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Upgrade Your Plan</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 40 }}>
        {plans.map((p) => (
          <div key={p.name} style={{ background: "var(--bg-card)", border: `2px solid ${p.current ? "var(--brand-purple)" : "var(--border)"}`, borderRadius: 18, padding: 24, position: "relative", transform: p.popular ? "scale(1.02)" : "none" }}>
            {p.popular && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "var(--gradient-brand)", borderRadius: 100, padding: "3px 14px", fontSize: 11, fontWeight: 700, color: "white", whiteSpace: "nowrap" }}>MOST POPULAR</div>}
            {p.current && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "#10b981", borderRadius: 100, padding: "3px 14px", fontSize: 11, fontWeight: 700, color: "white", whiteSpace: "nowrap" }}>CURRENT</div>}
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{p.name}</h3>
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 32, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>{p.price}</span>
              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{p.period}</span>
            </div>
            <ul style={{ listStyle: "none", marginBottom: 24 }}>
              {p.features.map((f) => (
                <li key={f} style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 10, display: "flex", gap: 8 }}>
                  <span style={{ color: "#10b981" }}>✓</span> {f}
                </li>
              ))}
            </ul>
            {p.current ? (
              <div style={{ textAlign: "center", padding: "10px", borderRadius: 10, background: "rgba(16,185,129,0.1)", color: "#10b981", fontSize: 14, fontWeight: 600 }}>Active Plan ✓</div>
            ) : (
              <button className="btn-brand" style={{ width: "100%", padding: "11px" }} onClick={() => alert("Payment integration coming soon! Configure Razorpay/Stripe keys in .env")}>
                Upgrade to {p.name}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Payment Methods Info */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Payment Methods</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            { name: "Razorpay", desc: "UPI, Cards, Net Banking (India)", icon: "🇮🇳", available: true },
            { name: "Stripe", desc: "International Cards & Wallets", icon: "🌍", available: true },
          ].map(pm => (
            <div key={pm.name} style={{ background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, display: "flex", gap: 16, alignItems: "center" }}>
              <span style={{ fontSize: 32 }}>{pm.icon}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{pm.name}</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{pm.desc}</div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <span style={{ fontSize: 11, background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 100, padding: "3px 10px", fontWeight: 600 }}>Available</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
