const http = require('http');
const { parse } = require('url');
const next = require('next');
const express = require('express');
const cors = require('cors');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const BOT_PORT = 3001;

// Lazy-load ESM bot modules
async function startBotService() {
  const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadContentFromMessage, fetchLatestBaileysVersion, BufferJSON } = await import('@whiskeysockets/baileys');
  const { default: pino } = await import('pino');
  const { default: QRCode } = await import('qrcode');
  const fs = require('fs');
  const path = require('path');
  const axios = (await import('axios')).default;
  const mongoose = require('mongoose');

  // ─── MongoDB connection ───────────────────────────────────────────────────────
  if (mongoose.connection.readyState === 0) {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI, {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      console.log('[Bot] MongoDB connected successfully');
    } else {
      console.error('[Bot] MONGODB_URI is missing!');
    }
  }

  // ─── Models ───────────────────────────────────────────────────────────────────
  const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isActive: { type: Boolean, default: true },
    apiKey: { type: String, unique: true, sparse: true }
  }, { timestamps: true });

  const User = mongoose.models.User || mongoose.model('User', UserSchema);

  // MongoDB-backed WhatsApp session storage (replaces /tmp — survives Railway restarts)
  const WASessionSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    key: { type: String, required: true },
    value: { type: String, required: true } // Serialized with BufferJSON.replacer
  }, { timestamps: true });
  WASessionSchema.index({ userId: 1, key: 1 }, { unique: true });
  const WASession = mongoose.models.WASession || mongoose.model('WASession', WASessionSchema);

  // ─── Logger / helpers ─────────────────────────────────────────────────────────
  const logger = pino({ level: 'silent' });
  const sessions = new Map();
  const LOG_FILE = '/tmp/whatsapp-bot-debug.log';

  function logDebug(msg) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${msg}\n`;
    try { fs.appendFileSync(LOG_FILE, line); } catch (e) {}
    console.log(`[Bot Debug] ${msg}`);
  }

  // ─── MongoDB auth state (replaces useMultiFileAuthState) ─────────────────────
  async function useMongoAuthState(userId) {
    async function readData(key) {
      try {
        const doc = await WASession.findOne({ userId, key }).lean();
        if (doc && doc.value) {
          return JSON.parse(doc.value, BufferJSON.reviver);
        }
      } catch (err) {
        logDebug(`[Auth Read Error] key: ${key}, error: ${err.message}`);
      }
      return null;
    }
    async function writeData(key, value) {
      try {
        const serialized = JSON.stringify(value, BufferJSON.replacer);
        await WASession.findOneAndUpdate(
          { userId, key },
          { userId, key, value: serialized },
          { upsert: true, new: true }
        );
      } catch (err) {
        logDebug(`[Auth Write Error] key: ${key}, error: ${err.message}`);
      }
    }
    async function removeData(key) {
      try {
        await WASession.deleteOne({ userId, key });
      } catch (err) {
        logDebug(`[Auth Remove Error] key: ${key}, error: ${err.message}`);
      }
    }

    const credsKey = 'creds';
    let creds = await readData(credsKey);
    if (!creds) {
      const { initAuthCreds } = await import('@whiskeysockets/baileys');
      creds = initAuthCreds();
      await writeData(credsKey, creds);
    }

    return {
      state: {
        creds,
        keys: {
          get: async (type, ids) => {
            const data = {};
            await Promise.all(ids.map(async (id) => {
              const val = await readData(`${type}-${id}`);
              if (val) data[id] = val;
            }));
            return data;
          },
          set: async (data) => {
            const tasks = [];
            for (const type of Object.keys(data)) {
              for (const id of Object.keys(data[type])) {
                const value = data[type][id];
                const key = `${type}-${id}`;
                if (value) {
                  tasks.push(writeData(key, value));
                } else {
                  tasks.push(removeData(key));
                }
              }
            }
            await Promise.all(tasks);
          }
        }
      },
      saveCreds: async () => {
        await writeData(credsKey, creds);
      }
    };
  }

  // ─── Resolve @lid → phone number JID ─────────────────────────────────────────
  async function resolveJid(sock, rawJid) {
    if (!rawJid.endsWith('@lid')) return rawJid; // already phone-based
    try {
      // Extract the numeric part and try to look it up via WhatsApp servers
      const phoneNumber = rawJid.split('@')[0];
      const results = await sock.onWhatsApp(phoneNumber);
      if (results && results.length > 0 && results[0].exists) {
        logDebug(`[JID] Resolved @lid ${rawJid} → ${results[0].jid}`);
        return results[0].jid;
      }
    } catch (err) {
      logDebug(`[JID] Failed to resolve @lid ${rawJid}: ${err.message}`);
    }
    // fallback: still use lid (message might still get delivered)
    return rawJid;
  }

  // ─── Session Manager ──────────────────────────────────────────────────────────
  const SessionManager = {
    async init() {
      logDebug('Initializing SessionManager...');
      try {
        // Find all users that have saved creds in MongoDB
        const docs = await WASession.distinct('userId', { key: 'creds' });
        logDebug(`Found ${docs.length} existing sessions in MongoDB.`);
        for (const uid of docs) {
          logDebug(`Restoring session for user: ${uid}`);
          this.startSession(uid).catch(err =>
            logDebug(`Failed to restore session for ${uid}: ${err.message}`)
          );
        }
      } catch (e) {
        logDebug(`Initialization error: ${e.message}`);
      }
    },

    getStatus(userId) {
      const session = sessions.get(userId);
      if (!session) return { status: 'disconnected', qr: null, phoneNumber: null };
      return { status: session.status, qr: session.qr, phoneNumber: session.phoneNumber };
    },

    async startSession(userId) {
      logDebug(`startSession called for user: ${userId}`);
      if (sessions.has(userId)) {
        const s = sessions.get(userId);
        logDebug(`Existing session status for ${userId}: ${s.status}`);
        if (['connecting', 'connected', 'qr'].includes(s.status)) return s;
      }

      logDebug(`Loading auth state from MongoDB for user: ${userId}`);
      const { state, saveCreds } = await useMongoAuthState(userId);

      logDebug('Fetching latest WA version...');
      let waVersion = [2, 3000, 1015901307];
      try {
        const { version, isLatest } = await fetchLatestBaileysVersion();
        logDebug(`Latest WA version: ${version.join('.')}, isLatest: ${isLatest}`);
        waVersion = version;
      } catch (err) {
        logDebug(`Failed to fetch WA version: ${err.message}. Using fallback.`);
      }

      logDebug('Creating WASocket connection...');
      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger,
        version: waVersion,
        browser: ['ReplyPilot', 'Chrome', '1.0.0'],
        connectTimeoutMs: 30000,
        keepAliveIntervalMs: 15000,
      });

      const session = { status: 'connecting', qr: null, phoneNumber: null, sock };
      sessions.set(userId, session);

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        logDebug(`connection.update: connection=${connection}, qr=${qr ? 'yes' : 'no'}, error=${lastDisconnect?.error?.message || 'none'}`);

        if (qr) {
          try {
            session.qr = await QRCode.toDataURL(qr);
            session.status = 'qr';
            logDebug(`QR Code generated for ${userId}`);
          } catch (e) {
            logDebug(`QR Code error: ${e.message}`);
          }
        }

        if (connection === 'connecting') session.status = 'connecting';

        if (connection === 'open') {
          session.status = 'connected';
          session.qr = null;
          session.phoneNumber = sock.user.id.split(':')[0].split('@')[0];
          logDebug(`Session connected for ${userId}. Phone: ${session.phoneNumber}`);
        }

        if (connection === 'close') {
          const code = lastDisconnect?.error?.output?.statusCode;
          logDebug(`Connection closed with code: ${code}`);
          sessions.delete(userId);

          if (code === DisconnectReason.loggedOut) {
            // Delete creds from MongoDB so user must re-scan
            await WASession.deleteMany({ userId });
            logDebug(`Logged out — cleared MongoDB session for: ${userId}`);
          } else {
            logDebug(`Reconnecting in 5s...`);
            setTimeout(() =>
              this.startSession(userId).catch(err => logDebug(`Reconnection failed: ${err.message}`)),
              5000
            );
          }
        }
      });

      sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        for (const msg of m.messages) {
          try {
            if (msg.key.fromMe) return;

            const rawJid = msg.key.remoteJid;
            if (rawJid.endsWith('@broadcast') || rawJid === 'status@broadcast') return;

            // Resolve @lid → real phone JID so reply actually delivers
            const jid = await resolveJid(sock, rawJid);
            const isGroup = jid.endsWith('@g.us');

            let content = '';
            let isImage = false;
            let imageMessage = null;

            if (msg.message?.conversation) content = msg.message.conversation;
            else if (msg.message?.extendedTextMessage?.text) content = msg.message.extendedTextMessage.text;
            else if (msg.message?.imageMessage) {
              isImage = true;
              imageMessage = msg.message.imageMessage;
              content = msg.message.imageMessage.caption || '📷 Photo';
            }

            if (!content && !isImage) return;

            logDebug(`[Message] From ${jid} (raw: ${rawJid}): ${isImage ? '[IMAGE]' : content}`);

            const user = await User.findById(userId).lean();
            if (!user) { logDebug(`[Message] User not found: ${userId}`); return; }
            if (!user.apiKey) { logDebug(`[Message] No API key for user: ${userId}`); return; }

            const contactName = msg.pushName || jid.split('@')[0];
            const contactPhone = jid.split('@')[0];
            const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000';

            if (isImage) {
              logDebug('[Message] Downloading image...');
              const stream = await downloadContentFromMessage(imageMessage, 'image');
              let buffer = Buffer.from([]);
              for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
              const imageBase64 = buffer.toString('base64');

              const res = await axios.post(`${appUrl}/api/payment/screenshot`, {
                contactPhone, contactName, imageBase64
              }, { headers: { 'x-api-key': user.apiKey }, timeout: 30000 });

              logDebug(`[Message] Screenshot API: ${JSON.stringify(res.data)}`);
              if (res.data?.reply) {
                await new Promise(r => setTimeout(r, 1500));
                await sock.sendMessage(jid, { text: res.data.reply });
                logDebug(`[Message] Image reply sent to ${jid}`);
              }
            } else {
              const res = await axios.post(`${appUrl}/api/messages/incoming`, {
                contactName, contactPhone, content, source: 'whatsapp', isGroup, groupName: isGroup ? 'Group' : null
              }, { headers: { 'x-api-key': user.apiKey }, timeout: 30000 });

              logDebug(`[Message] Message API: ${JSON.stringify(res.data)}`);

              if (res.data?.reply) {
                const delayMs = res.data.delay || 0;
                if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));

                if (res.data.replyMode === 'scanner' && res.data.imageBase64) {
                  const imageBuffer = Buffer.from(res.data.imageBase64, 'base64');
                  await sock.sendMessage(jid, { image: imageBuffer, caption: res.data.reply });
                  logDebug(`[Message] Scanner image reply sent to ${jid}`);
                } else {
                  await sock.sendMessage(jid, { text: res.data.reply });
                  logDebug(`[Message] Text reply sent to ${jid}`);
                }
              }
            }
          } catch (err) {
            logDebug(`[Message Error] ${err.message}\nStack: ${err.stack}`);
          }
        }
      });

      return session;
    },

    async logoutSession(userId) {
      const session = sessions.get(userId);
      if (session) {
        try { await session.sock.logout(); } catch (e) {}
        sessions.delete(userId);
      }
      await WASession.deleteMany({ userId });
      logDebug(`Session cleared from MongoDB for: ${userId}`);
    }
  };

  // ─── Express bot API ──────────────────────────────────────────────────────────
  const botApp = express();
  botApp.use(cors());
  botApp.use(express.json());

  botApp.get('/status', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    res.json(SessionManager.getStatus(userId));
  });

  botApp.post('/start', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    try {
      const session = await SessionManager.startSession(userId);
      res.json({ success: true, status: session.status, qr: session.qr, phoneNumber: session.phoneNumber });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  botApp.post('/logout', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    try {
      await SessionManager.logoutSession(userId);
      res.json({ success: true, status: 'disconnected' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  botApp.get('/diagnostics', (req, res) => {
    if (fs.existsSync(LOG_FILE)) {
      res.type('text/plain').send(fs.readFileSync(LOG_FILE, 'utf8'));
    } else {
      res.send('No diagnostics logs found yet.');
    }
  });

  botApp.listen(BOT_PORT, '127.0.0.1', () => {
    console.log(`[Bot] WhatsApp bot service running on http://127.0.0.1:${BOT_PORT}`);
    SessionManager.init();
  });
}

// Start everything
app.prepare().then(async () => {
  startBotService().catch(err => console.error('[Bot] Failed to start:', err.message));

  const port = parseInt(process.env.PORT || '3000', 10);
  http.createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, () => {
    console.log(`[Next.js] Ready on http://localhost:${port}`);
  });
});
