import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  downloadContentFromMessage
} from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import QRCode from 'qrcode';
import mongoose from 'mongoose';

const logger = pino({ level: 'silent' });
const sessions = new Map();
const SESSIONS_DIR = './whatsapp-sessions';

// Ensure sessions directory exists
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
      console.log(`Cleaned up session folder for user ${userId}`);
    } catch (e) {
      console.error(`Failed to cleanup session folder for ${userId}:`, e.message);
    }
  }
}

export const SessionManager = {
  // Initialize and load saved sessions from disk
  init() {
    console.log('Initializing WhatsApp Session Manager...');
    try {
      const dirs = fs.readdirSync(SESSIONS_DIR);
      for (const userId of dirs) {
        const fullPath = path.join(SESSIONS_DIR, userId);
        if (fs.statSync(fullPath).isDirectory()) {
          console.log(`Found saved session for user ${userId}. Restoring...`);
          this.startSession(userId).catch(err => {
            console.error(`Failed to restore session for ${userId}:`, err.message);
          });
        }
      }
    } catch (e) {
      console.error('Error scanning sessions directory:', e.message);
    }
  },

  getStatus(userId) {
    const session = sessions.get(userId);
    if (!session) {
      return { status: 'disconnected', qr: null, phoneNumber: null };
    }
    return {
      status: session.status,
      qr: session.qr,
      phoneNumber: session.phoneNumber
    };
  },

  async startSession(userId) {
    if (sessions.has(userId)) {
      const activeSession = sessions.get(userId);
      if (activeSession.status === 'connecting' || activeSession.status === 'connected' || activeSession.status === 'qr') {
        return activeSession;
      }
    }

    console.log(`Starting WhatsApp session for user ${userId}...`);
    const sessionPath = getSessionPath(userId);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const sock = makeWASocket.default({
      auth: state,
      printQRInTerminal: true,
      logger: logger
    });

    const session = {
      status: 'connecting',
      qr: null,
      phoneNumber: null,
      sock: sock
    };
    sessions.set(userId, session);

    // Save auth credentials whenever updated
    sock.ev.on('creds.update', saveCreds);

    // Listen to connection state
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrImage = await QRCode.toDataURL(qr);
          session.qr = qrImage;
          session.status = 'qr';
          console.log(`[Bot ${userId}] New QR code generated.`);
        } catch (qrErr) {
          console.error(`Failed to generate QR Image for ${userId}:`, qrErr.message);
        }
      }

      if (connection === 'connecting') {
        session.status = 'connecting';
      }

      if (connection === 'open') {
        session.status = 'connected';
        session.qr = null;
        session.phoneNumber = sock.user.id.split(':')[0].split('@')[0];
        console.log(`[Bot ${userId}] Connected successfully as ${session.phoneNumber}`);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`[Bot ${userId}] Connection closed. StatusCode: ${statusCode}. Reconnecting: ${shouldReconnect}`);

        if (shouldReconnect) {
          // Reconnect asynchronously
          setTimeout(() => {
            this.startSession(userId).catch(err => {
              console.error(`Reconnection failed for user ${userId}:`, err.message);
            });
          }, 3000);
        } else {
          session.status = 'disconnected';
          session.qr = null;
          session.phoneNumber = null;
          sessions.delete(userId);
          cleanupSessionFolder(userId);
        }
      }
    });

    // Listen to incoming messages
    sock.ev.on('messages.upsert', async (m) => {
      if (m.type !== 'notify') return;
      for (const msg of m.messages) {
        try {
          if (msg.key.fromMe) continue;
          
          const jid = msg.key.remoteJid;
          if (jid.endsWith('@broadcast') || jid === 'status@broadcast') continue;

          const isGroup = jid.endsWith('@g.us');

          // Extract content & image
          let content = '';
          let isImage = false;
          let imageMessage = null;

          if (msg.message?.conversation) {
            content = msg.message.conversation;
          } else if (msg.message?.extendedTextMessage?.text) {
            content = msg.message.extendedTextMessage.text;
          } else if (msg.message?.imageMessage) {
            isImage = true;
            imageMessage = msg.message.imageMessage;
            content = msg.message.imageMessage.caption || '📷 Photo';
          }

          if (!content && !isImage) continue;

          // Fetch User's api key from db
          const user = await mongoose.model('User').findById(userId);
          if (!user || !user.apiKey) {
            console.error(`[Bot ${userId}] No API Key found for user.`);
            continue;
          }
          const apiKey = user.apiKey;

          const contactName = msg.pushName || jid.split('@')[0];
          const contactPhone = jid.split('@')[0];

          if (isImage) {
            console.log(`[Bot ${userId}] Payment screenshot detected from ${contactName} (${contactPhone})`);
            
            // Download screenshot image from message
            const stream = await downloadContentFromMessage(imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
              buffer = Buffer.concat([buffer, chunk]);
            }
            const imageBase64 = buffer.toString('base64');

            // Send base64 image to payment verification API in Next.js
            const res = await axios.post(`${process.env.NEXT_APP_URL}/api/payment/screenshot`, {
              contactPhone,
              contactName,
              imageBase64
            }, {
              headers: { 'x-api-key': apiKey }
            });

            if (res.data && res.data.reply) {
              await new Promise(resolve => setTimeout(resolve, 1500));
              await sock.sendMessage(jid, { text: res.data.reply });
              console.log(`[Bot ${userId}] Replied to payment screenshot.`);
            }
          } else {
            console.log(`[Bot ${userId}] Message received from ${contactName}: ${content}`);

            // Forward text message to Next.js API
            const res = await axios.post(`${process.env.NEXT_APP_URL}/api/messages/incoming`, {
              contactName,
              contactPhone,
              content,
              source: 'whatsapp',
              isGroup,
              groupName: isGroup ? 'Group' : null
            }, {
              headers: { 'x-api-key': apiKey }
            });

            if (res.data && res.data.reply) {
              const delayMs = res.data.delay || 0;
              if (delayMs > 0) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
              }

              if (res.data.replyMode === 'scanner' && res.data.imageBase64) {
                // Send scanner image directly!
                const imageBuffer = Buffer.from(res.data.imageBase64, 'base64');
                await sock.sendMessage(jid, {
                  image: imageBuffer,
                  caption: res.data.reply
                });
                console.log(`[Bot ${userId}] Image QR Code scanner sent directly.`);
              } else {
                // Send text response
                await sock.sendMessage(jid, { text: res.data.reply });
                console.log(`[Bot ${userId}] Replied: ${res.data.reply}`);
              }
            }
          }
        } catch (err) {
          console.error(`[Bot ${userId}] Error processing message:`, err.message);
        }
      }
    });

    return session;
  },

  async logoutSession(userId) {
    const session = sessions.get(userId);
    if (session) {
      console.log(`Logging out WhatsApp session for user ${userId}...`);
      try {
        await session.sock.logout();
      } catch (e) {
        console.error(`Error during socket logout for ${userId}:`, e.message);
      }
      sessions.delete(userId);
    }
    cleanupSessionFolder(userId);
  }
};
