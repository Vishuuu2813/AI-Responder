# 📡 ReplyPilot API Reference

Base URL: `https://your-domain.vercel.app/api`

---

## Authentication

All dashboard API routes require a session cookie (NextAuth).

Android app uses `x-api-key` header.

---

## Android App Endpoints

### POST `/messages/incoming`
Send an incoming WhatsApp message and get an AI/manual reply.

**Headers:**
```
x-api-key: your-api-key
Content-Type: application/json
```

**Request Body:**
```json
{
  "contactName": "John Doe",
  "contactPhone": "+919876543210",
  "content": "Hi, what are your prices?",
  "source": "whatsapp",
  "isGroup": false,
  "groupName": null
}
```

**Response:**
```json
{
  "reply": "Hello! Our plans start from ₹499/month. 😊",
  "delay": 2000,
  "replyMode": "ai"
}
```

| Field | Type | Description |
|-------|------|-------------|
| contactName | string | Display name from notification |
| contactPhone | string | Phone number (or JID) |
| content | string | Message text |
| source | "whatsapp" or "whatsapp_business" | App source |
| isGroup | boolean | Is it a group message? |
| groupName | string? | Group name if isGroup=true |

---

## Dashboard Endpoints (Session Required)

### GET `/analytics?period=7d`
Get analytics data.

**Query params:** `period` = `7d` | `30d` | `90d`

**Response:**
```json
{
  "dailyStats": [...],
  "totals": {
    "totalMessages": 1284,
    "totalReplies": 1247,
    "aiReplies": 983,
    "manualReplies": 264,
    "aiTokensUsed": 45200
  },
  "activeConversations": 47
}
```

---

### GET/PUT `/settings`
Get or update user settings.

**PUT Request Body (partial updates supported):**
```json
{
  "isEnabled": true,
  "replyMode": "ai",
  "whatsappSource": "both",
  "ai": {
    "language": "hinglish",
    "tone": "friendly",
    "temperature": 0.7,
    "maxTokens": 300,
    "customInstructions": "You are a helpful assistant."
  }
}
```

---

### GET `/rules`
Get all active rules.

### POST `/rules`
Create a new rule.
```json
{
  "name": "Greeting",
  "keyword": "hi",
  "reply": "Hello! 👋 How can I help you?",
  "priority": 10,
  "source": "both",
  "isRegex": false
}
```

### PUT `/rules/:id`
Update a rule.

### DELETE `/rules/:id`
Delete a rule.

---

### GET `/messages/incoming?page=1&limit=20`
Get message history.

---

### GET/POST `/contacts`
Manage contacts.

**POST:**
```json
{
  "name": "VIP Customer",
  "phone": "+919876543210",
  "type": "vip",
  "notes": "High value customer"
}
```

---

### POST `/auth/register`
Register a new user.
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

---

## Error Responses

All errors return:
```json
{
  "error": "Error message here"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad Request - missing/invalid fields |
| 401 | Unauthorized - no session or invalid API key |
| 403 | Forbidden - insufficient permissions |
| 404 | Not Found |
| 409 | Conflict - e.g. email already exists |
| 500 | Internal Server Error |
