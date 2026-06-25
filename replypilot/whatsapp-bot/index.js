import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { SessionManager } from './session-manager.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Register a basic User schema for the bot process
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  apiKey: String
});
mongoose.models.User || mongoose.model('User', UserSchema);

// Mongoose Connection
async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully for WhatsApp Bot service.');
    
    // Initialize sessions after DB connection
    SessionManager.init();
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}

connectDatabase();

// ─── API Routes for Next.js dashboard interaction ─────────────────────

// GET /status — Get device status for a user
app.get('/status', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  const status = SessionManager.getStatus(userId);
  res.json(status);
});

// POST /start — Start/Link session for a user
app.post('/start', async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  try {
    const session = await SessionManager.startSession(userId);
    res.json({
      success: true,
      status: session.status,
      qr: session.qr,
      phoneNumber: session.phoneNumber
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /logout — Logout and delete session for a user
app.post('/logout', async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  try {
    await SessionManager.logoutSession(userId);
    res.json({ success: true, status: 'disconnected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`WhatsApp Bot Service is running on http://localhost:${PORT}`);
});
