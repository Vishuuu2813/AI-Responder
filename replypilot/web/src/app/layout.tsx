import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReplyPilot — Your Intelligent Auto Reply Assistant",
  description:
    "AI-powered WhatsApp auto-reply SaaS platform. Automate your WhatsApp responses with AI or custom rules. Support for WhatsApp & WhatsApp Business.",
  keywords: "WhatsApp auto reply, AI chatbot, WhatsApp automation, auto responder, WhatsApp Business",
  authors: [{ name: "ReplyPilot" }],
  openGraph: {
    title: "ReplyPilot — Your Intelligent Auto Reply Assistant",
    description: "Automate WhatsApp replies with AI. Never miss a message again.",
    url: "https://replypilot.vercel.app",
    siteName: "ReplyPilot",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ReplyPilot — AI WhatsApp Auto Reply",
    description: "Automate WhatsApp replies with AI. Never miss a message again.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
