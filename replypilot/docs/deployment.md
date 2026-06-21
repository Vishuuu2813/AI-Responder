# 🚢 Deployment Guide

## Prerequisites
- Vercel account
- MongoDB Atlas account
- GitHub account

---

## Step 1: MongoDB Atlas Setup

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a free cluster (M0)
3. Create a database user with read/write access
4. Allow IP access: `0.0.0.0/0` (for Vercel)
5. Get your connection string: `mongodb+srv://user:pass@cluster.mongodb.net/replypilot`

---

## Step 2: Google OAuth Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. Enable **Google+ API** and **Google OAuth2**
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://your-domain.vercel.app/api/auth/callback/google`
6. Copy Client ID and Client Secret

---

## Step 3: OpenAI API Key

1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an API key
3. Add credits to your account

---

## Step 4: Deploy to Vercel

```bash
cd web

# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Set Environment Variables in Vercel
Go to Vercel Dashboard → Project → Settings → Environment Variables and add:

```
NEXTAUTH_URL = https://your-project.vercel.app
NEXTAUTH_SECRET = (generate with: openssl rand -base64 32)
MONGODB_URI = mongodb+srv://...
GOOGLE_CLIENT_ID = ...
GOOGLE_CLIENT_SECRET = ...
OPENAI_API_KEY = sk-...
RAZORPAY_KEY_ID = rzp_...
RAZORPAY_KEY_SECRET = ...
STRIPE_SECRET_KEY = sk_...
STRIPE_WEBHOOK_SECRET = whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_...
RESEND_API_KEY = re_...
ADMIN_EMAIL = admin@yourdomain.com
NEXT_PUBLIC_APP_URL = https://your-project.vercel.app
```

---

## Step 5: Seed Default Plans

After deploying, run the seed script to create default plans:

```bash
# POST to /api/admin/seed with admin token
curl -X POST https://your-domain.vercel.app/api/admin/seed \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"
```

---

## Step 6: Android App Setup

1. Open `android/` folder in Android Studio
2. In `app/src/main/java/com/replypilot/utils/Constants.kt`:
   ```kotlin
   const val API_BASE_URL = "https://your-project.vercel.app/api/"
   ```
3. Build APK: **Build → Build Bundle(s)/APK(s) → Build APK(s)**
4. Install on Android device
5. Grant Notification Access permission
6. Enter your API key from the dashboard

---

## Step 7: Get Your API Key

1. Login to your ReplyPilot dashboard
2. Go to **Settings → Account**
3. Copy your API key
4. Paste it in the Android app

---

## Custom Domain

1. In Vercel → Domains → Add your domain
2. Update `NEXTAUTH_URL` to your custom domain
3. Update Google OAuth redirect URIs

---

## Monitoring

- **Vercel Analytics**: Built-in with Vercel
- **MongoDB Atlas**: Monitor DB performance
- **Logs**: Vercel → Functions → Logs

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Auth not working | Check NEXTAUTH_URL matches actual URL |
| MongoDB connection failed | Check IP whitelist in Atlas |
| No AI replies | Verify OPENAI_API_KEY is valid |
| Android app not reading messages | Grant Notification Access in Settings |
| App killed in background | Disable Battery Optimization |
