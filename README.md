# 🚀 REPLYPILOT — Your Intelligent Auto Reply Assistant

<div align="center">

![REPLYPILOT](https://img.shields.io/badge/REPLYPILOT-AI%20Powered-6366f1?style=for-the-badge&logo=whatsapp&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Android](https://img.shields.io/badge/Android-Kotlin-3DDC84?style=for-the-badge&logo=android)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-412991?style=for-the-badge&logo=openai)

**The #1 AI-powered WhatsApp auto-reply SaaS platform**

[Live Demo](https://replypilot.vercel.app) · [Documentation](./docs) · [API Reference](./docs/api.md) · [Android APK](./android)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Database Models](#database-models)
- [API Documentation](#api-documentation)
- [Android Setup](#android-setup)
- [Deployment](#deployment)
- [Subscription Plans](#subscription-plans)
- [Contributing](#contributing)

---

## 🌟 Overview

**REPLYPILOT** is a production-ready SaaS platform that enables businesses and individuals to automatically reply to WhatsApp and WhatsApp Business messages using AI or custom manual rules.

### Key Highlights
- 🤖 **AI-Powered Replies** using OpenAI GPT-4
- 📱 **Android App** with Notification Listener Service
- 📊 **Real-time Analytics Dashboard**
- 🔄 **3 Reply Modes**: AI, Manual Rules, Hybrid
- 💳 **Subscription System** with Razorpay & Stripe
- 🌐 **Multi-language**: English, Hindi, Hinglish
- 🏢 **Admin Panel** for full platform management

---

## ✨ Features

### 🤖 AI Auto Reply
- OpenAI GPT-4 integration
- Custom AI personas and tones
- Multi-language support (Hindi, English, Hinglish)
- Configurable temperature, creativity, and accuracy
- Conversation memory (short & long term)
- Custom system instructions

### 📋 Manual Rules Engine
- Keyword-based trigger rules
- Regex support
- Priority ordering
- A/B testing rules

### 🔀 Hybrid Mode
- AI replies with manual rule overrides
- Fallback logic
- Smart routing

### 📱 Contact Management
- VIP contacts
- Block list
- Allow list
- Group filtering

### ⏰ Business Hours
- Configure working hours per day
- Auto-reply during business hours only
- Custom away messages

### ⏱️ Reply Delay
- Instant to 60-second delays
- Custom delay configuration
- Human-like typing simulation

### 📊 Analytics
- Total messages & replies
- AI usage stats
- Success rate tracking
- Daily & monthly reports
- Contact activity heatmap

### 💳 Billing & Subscriptions
- Free, Starter, Pro, Business plans
- Razorpay integration (India)
- Stripe integration (Global)
- Usage-based billing

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React, Tailwind CSS, Shadcn UI, Framer Motion |
| Backend | Next.js API Routes, Node.js |
| Database | MongoDB Atlas, Mongoose |
| Authentication | NextAuth.js, JWT, Google OAuth |
| AI | OpenAI API (GPT-4o) |
| Payments | Razorpay, Stripe |
| Mobile | Android (Kotlin), Notification Listener |
| Hosting | Vercel, MongoDB Atlas |
| Storage | Vercel Blob / AWS S3 |

---

## 📁 Project Structure

```
replypilot/
├── web/                          # Next.js Web Dashboard
│   ├── src/
│   │   ├── app/                  # App Router pages
│   │   │   ├── (auth)/          # Auth pages
│   │   │   ├── (dashboard)/     # Dashboard pages
│   │   │   ├── (landing)/       # Landing pages
│   │   │   ├── admin/           # Admin panel
│   │   │   └── api/             # API routes
│   │   ├── components/          # Reusable components
│   │   │   ├── ui/              # Base UI components
│   │   │   ├── dashboard/       # Dashboard components
│   │   │   ├── analytics/       # Analytics components
│   │   │   └── landing/         # Landing page sections
│   │   ├── lib/                 # Utilities & configs
│   │   │   ├── db/              # MongoDB connection
│   │   │   ├── auth/            # Auth configuration
│   │   │   ├── ai/              # AI integration
│   │   │   ├── payments/        # Payment gateways
│   │   │   └── utils/           # Helper functions
│   │   ├── models/              # Mongoose schemas
│   │   ├── hooks/               # Custom React hooks
│   │   ├── store/               # State management (Zustand)
│   │   └── types/               # TypeScript types
│   ├── public/
│   └── package.json
│
├── android/                      # Android Application
│   ├── app/
│   │   └── src/
│   │       └── main/
│   │           ├── java/
│   │           │   └── com/replypilot/
│   │           │       ├── services/      # Notification listener
│   │           │       ├── ui/            # Activities & Fragments
│   │           │       ├── api/           # Retrofit API client
│   │           │       ├── models/        # Data models
│   │           │       └── utils/         # Utilities
│   │           └── res/                   # Resources
│   └── build.gradle
│
├── docs/                         # Documentation
│   ├── api.md                    # API reference
│   ├── deployment.md             # Deployment guide
│   ├── android.md                # Android setup
│   └── database.md               # DB schema diagram
│
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- OpenAI API key
- Razorpay / Stripe account

### 1. Clone the Repository
```bash
git clone https://github.com/Vishuuu2813/AI-Responder.git
cd AI-Responder
```

### 2. Setup Web Dashboard
```bash
cd web
npm install
cp .env.example .env.local
# Fill in environment variables
npm run dev
```

### 3. Setup Android App
```bash
cd android
# Open in Android Studio
# Configure API_BASE_URL in Constants.kt
# Build and run on device
```

---

## 🔑 Environment Variables

```env
# App
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# MongoDB
MONGODB_URI=mongodb+srv://...

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# OpenAI
OPENAI_API_KEY=sk-...

# Razorpay
RAZORPAY_KEY_ID=rzp_...
RAZORPAY_KEY_SECRET=

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_...

# Email (Resend)
RESEND_API_KEY=re_...

# Admin
ADMIN_EMAIL=admin@replypilot.com
```

---

## 💾 Database Models

| Model | Description |
|-------|-------------|
| User | Platform users with subscription info |
| Subscription | Active plan and billing cycle |
| Plan | Available pricing plans |
| Payment | Payment transactions |
| Message | WhatsApp messages (in/out) |
| Conversation | Conversation threads |
| Rule | Manual keyword-trigger rules |
| Instruction | AI custom instructions |
| Contact | Contact whitelist/blacklist |
| Group | WhatsApp group settings |
| Analytics | Aggregated usage metrics |
| Settings | Per-user configuration |

---

## 💳 Subscription Plans

| Feature | Free | Starter | Pro | Business |
|---------|------|---------|-----|----------|
| Messages/month | 100 | 1,000 | 10,000 | Unlimited |
| AI Replies | ❌ | ✅ | ✅ | ✅ |
| Manual Rules | 5 | 25 | Unlimited | Unlimited |
| Contacts | 10 | 100 | Unlimited | Unlimited |
| Analytics | Basic | Standard | Advanced | Custom |
| Priority Support | ❌ | ❌ | ✅ | ✅ |
| Price (Monthly) | Free | ₹499 | ₹999 | ₹2499 |

---

## 📱 Android Setup

1. Open `android/` in Android Studio
2. Configure `API_BASE_URL` in `app/src/main/java/com/replypilot/utils/Constants.kt`
3. Enable **Notification Access** on device
4. Enable **Accessibility Service**
5. Build APK: `Build > Build Bundle(s)/APK(s) > Build APK(s)`

---

## 🚢 Deployment

See [Deployment Guide](./docs/deployment.md) for full Vercel + MongoDB Atlas deployment instructions.

### Quick Deploy to Vercel
```bash
npx vercel --prod
```

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

---

<div align="center">

Built with ❤️ by the REPLYPILOT Team

**[replypilot.com](https://replypilot.vercel.app)** · **[Twitter](https://twitter.com)** · **[Discord](https://discord.gg)**

</div>
