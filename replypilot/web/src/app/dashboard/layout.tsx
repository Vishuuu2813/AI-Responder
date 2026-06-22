"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", icon: "📊", label: "Dashboard" },
  { href: "/dashboard/messages", icon: "💬", label: "Messages" },
  { href: "/dashboard/rules", icon: "📋", label: "Rules" },
  { href: "/dashboard/ai-settings", icon: "🤖", label: "AI Settings" },
  { href: "/dashboard/bot-training", icon: "🎓", label: "Bot Training" },
  { href: "/dashboard/contacts", icon: "👥", label: "Contacts" },
  { href: "/dashboard/payments", icon: "💳", label: "Payments" },
  { href: "/dashboard/scanner", icon: "📱", label: "Scanner / QR" },
  { href: "/dashboard/analytics", icon: "📈", label: "Analytics" },
  { href: "/dashboard/settings", icon: "⚙️", label: "Settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Sidebar */}
      <aside style={{ width: collapsed ? 72 : 240, background: "var(--bg-secondary)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", transition: "width 0.3s ease", position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 50 }}>
        {/* Logo */}
        <div style={{ padding: "20px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, background: "var(--gradient-brand)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>✈️</div>
          {!collapsed && <span style={{ fontWeight: 800, fontSize: 18, fontFamily: "'Outfit', sans-serif" }} className="gradient-text">ReplyPilot</span>}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "16px 8px", overflowY: "auto" }}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={`sidebar-item ${pathname === item.href ? "active" : ""}`} style={{ marginBottom: 4, justifyContent: collapsed ? "center" : "flex-start" }} title={collapsed ? item.label : ""}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}

          {session?.user?.role === "admin" && (
            <Link href="/admin" className={`sidebar-item ${pathname.startsWith("/admin") ? "active" : ""}`} style={{ marginTop: 8, marginBottom: 4, justifyContent: collapsed ? "center" : "flex-start" }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>🛡️</span>
              {!collapsed && <span>Admin Panel</span>}
            </Link>
          )}
        </nav>

        {/* User + Collapse */}
        <div style={{ padding: "12px 8px", borderTop: "1px solid var(--border)" }}>
          {!collapsed && session?.user && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", marginBottom: 8, borderRadius: 10, background: "var(--bg-glass)" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--gradient-brand)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                {session.user.name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{session.user.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{session.user.email}</div>
              </div>
            </div>
          )}
          <button onClick={() => signOut({ callbackUrl: "/" })} className="sidebar-item" style={{ width: "100%", background: "none", border: "none", cursor: "pointer", justifyContent: collapsed ? "center" : "flex-start" }} title="Sign Out">
            <span style={{ fontSize: 18 }}>🚪</span>
            {!collapsed && <span>Sign Out</span>}
          </button>
          <button onClick={() => setCollapsed(!collapsed)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "8px", borderRadius: 8, marginTop: 4, fontSize: 18 }}>
            {collapsed ? "→" : "←"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, marginLeft: collapsed ? 72 : 240, transition: "margin-left 0.3s ease", minHeight: "100vh", padding: 32 }}>
        {children}
      </main>
    </div>
  );
}
