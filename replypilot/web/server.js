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
  const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadContentFromMessage, fetchLatestBaileysVersion } = await import('@whiskeysockets/baileys');
  const { default: pino } = await import('pino');
  const { default: QRCode } = await import('qrcode');
  const fs = require('fs');
  const path = require('path');
  const axios = (await import('axios')).default;
  const mongoose = require('mongoose');

  const logger = pino({ level: 'silent' });
  const sessions = new Map();
  const SESSIONS_DIR = '/tmp/whatsapp-sessions';
  const LOG_FILE = '/tmp/whatsapp-bot-debug.log';

  function logDebug(msg) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${msg}\n`;
    try {
      fs.appendFileSync(LOG_FILE, line);
    } catch (e) {}
    console.log(`[Bot Debug] ${msg}`);
  }

  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }

  function getSessionPath(userId) {
    return path.join(SESSIONS_DIR, userId);
  }

  function cleanupSessionFolder(userId) {
    const sessionPath = getSessionPath(userId);
    if (fs.existsSync(sessionPath)) {
      try {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        logDebug(`Cleaned up session folder for user ${userId}`);
      } catch (e) {
        logDebug(`Failed to clean up session folder: ${e.message}`);
      }
    }
  }

  const SessionManager = {
    init() {
      logDebug("Initializing SessionManager...");
      try {
        const dirs = fs.readdirSync(SESSIONS_DIR);
        logDebug(`Found ${dirs.length} existing session directories.`);
        for (const userId of dirs) {
          const fullPath = path.join(SESSIONS_DIR, userId);
          if (fs.statSync(fullPath).isDirectory()) {
            logDebug(`Restoring session for user: ${userId}`);
            this.startSession(userId).catch(err =>
              logDebug(`[Bot] Failed to restore session for ${userId}: ${err.message}`)
            );
          }
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

      const sessionPath = getSessionPath(userId);
      logDebug(`Using session path: ${sessionPath}`);
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

      logDebug(`Fetching latest WA version...`);
      let waVersion = [2, 3000, 1015901307]; // Fallback stable version
      try {
        const { version, isLatest } = await fetchLatestBaileysVersion();
        logDebug(`Latest WA version fetched: ${version.join('.')}, isLatest: ${isLatest}`);
        waVersion = version;
      } catch (err) {
        logDebug(`Failed to fetch WA version: ${err.message}. Using fallback.`);
      }

      logDebug(`Creating WASocket connection...`);
      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger,
        version: waVersion,
        browser: ['ReplyPilot', 'Chrome', '1.0.0']
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
            logDebug(`QR Code generated and status set to 'qr' for ${userId}`);
          } catch (e) {
            logDebug(`QR Code conversion error: ${e.message}`);
          }
        }

        if (connection === 'connecting') {
          session.status = 'connecting';
        }

        if (connection === 'open') {
          session.status = 'connected';
          session.qr = null;
          session.phoneNumber = sock.user.id.split(':')[0].split('@')[0];
          logDebug(`Session connected successfully for ${userId}. Phone: ${session.phoneNumber}`);
        }

        if (connection === 'close') {
          const code = lastDisconnect?.error?.output?.statusCode;
          logDebug(`Connection closed with code: ${code}`);
          sessions.delete(userId); // Remove to break connecting guard block

          if (code !== DisconnectReason.loggedOut) {
            logDebug(`Reconnecting session in 3s...`);
            setTimeout(() => this.startSession(userId).catch(err => logDebug(`Reconnection failed: ${err.message}`)), 3000);
          } else {
            cleanupSessionFolder(userId);
            logDebug(`Logged out session cleared for user: ${userId}`);
          }
        }
      });

      sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        for (const msg of m.messages) {
          try {
            if (msg.key.fromMe) return;
            const jid = msg.key.remoteJid;
            if (jid.endsWith('@broadcast') || jid === 'status@broadcast') return;

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

            const User = mongoose.models.User;
            const user = await User.findById(userId).lean();
            if (!user?.apiKey) return;

            const contactName = msg.pushName || jid.split('@')[0];
            const contactPhone = jid.split('@')[0];
            const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000';

            if (isImage) {
              const stream = await downloadContentFromMessage(imageMessage, 'image');
              let buffer = Buffer.from([]);
              for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
              const imageBase64 = buffer.toString('base64');

              const res = await axios.post(`${appUrl}/api/payment/screenshot`, {
                contactPhone, contactName, imageBase64
              }, { headers: { 'x-api-key': user.apiKey } });

              if (res.data?.reply) {
                await new Promise(r => setTimeout(r, 1500));
                await sock.sendMessage(jid, { text: res.data.reply });
              }
            } else {
              const res = await axios.post(`${appUrl}/api/messages/incoming`, {
                contactName, contactPhone, content, source: 'whatsapp', isGroup, groupName: isGroup ? 'Group' : null
              }, { headers: { 'x-api-key': user.apiKey } });

              if (res.data?.reply) {
                const delayMs = res.data.delay || 0;
                if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));

                if (res.data.replyMode === 'scanner' && res.data.imageBase64) {
                  const imageBuffer = Buffer.from(res.data.imageBase64, 'base64');
                  await sock.sendMessage(jid, { image: imageBuffer, caption: res.data.reply });
                } else {
                  await sock.sendMessage(jid, { text: res.data.reply });
                }
              }
            }
          } catch (err) {
            console.error('[Bot] Message error:', err.message);
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
      cleanupSessionFolder(userId);
    }
  };

  // Express bot API on port 3001
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
  // Start bot service
  startBotService().catch(err => console.error('[Bot] Failed to start:', err.message));

  // Start Next.js HTTP server
  const port = parseInt(process.env.PORT || '3000', 10);
  http.createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, () => {
    console.log(`[Next.js] Ready on http://localhost:${port}`);
  });
});
