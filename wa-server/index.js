/**
 * WhatsApp Baileys microservice for Metricon.
 * Runs on port 3001, called by the main Next.js app.
 */

const express = require('express');
const {
  getSession,
  startSession,
  disconnectSession,
  sendMessage,
  sendPoll,
  sendBatch,
} = require('./sessions');

const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY || 'dev-secret';
const PORT = process.env.PORT || 3001;

// Auth middleware
function authMiddleware(req, res, next) {
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.use(authMiddleware);

// Health check (no auth)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ========== Session endpoints ==========

// POST /session/start — Start session, return QR
app.post('/session/start', async (req, res) => {
  try {
    const { storeId } = req.body;
    if (!storeId) return res.status(400).json({ error: 'storeId required' });

    console.log(`[API] Starting session for store ${storeId}`);
    const result = await startSession(storeId);
    res.json(result);
  } catch (err) {
    console.error('[API] /session/start error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /session/:storeId/status — Get connection status
app.get('/session/:storeId/status', (req, res) => {
  try {
    const { storeId } = req.params;
    const session = getSession(storeId);

    if (!session) {
      return res.json({ status: 'disconnected', qr: null });
    }

    res.json({ status: session.status, qr: session.qr });
  } catch (err) {
    console.error('[API] /session/status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /session/:storeId/qr — Get QR code only
app.get('/session/:storeId/qr', (req, res) => {
  try {
    const { storeId } = req.params;
    const session = getSession(storeId);
    res.json({ qr: session?.qr || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /session/:storeId — Disconnect
app.delete('/session/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    console.log(`[API] Disconnecting store ${storeId}`);
    await disconnectSession(storeId);
    res.json({ success: true });
  } catch (err) {
    console.error('[API] /session/disconnect error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== Message endpoints ==========

// POST /message/send — Send single text message
app.post('/message/send', async (req, res) => {
  try {
    const { storeId, phone, message } = req.body;
    if (!storeId || !phone || !message) {
      return res.status(400).json({ error: 'storeId, phone, message required' });
    }

    await sendMessage(storeId, phone, message);
    res.json({ success: true });
  } catch (err) {
    console.error('[API] /message/send error:', err);
    res.json({ success: false, error: err.message });
  }
});

// POST /poll/send — Send WhatsApp poll
app.post('/poll/send', async (req, res) => {
  try {
    const { storeId, phone, question, options } = req.body;
    if (!storeId || !phone || !question || !options?.length) {
      return res.status(400).json({ error: 'storeId, phone, question, options required' });
    }

    const result = await sendPoll(storeId, phone, question, options);
    res.json(result);
  } catch (err) {
    console.error('[API] /poll/send error:', err);
    res.json({ success: false, error: err.message });
  }
});

// POST /message/send-batch — Bulk send with delays
app.post('/message/send-batch', async (req, res) => {
  try {
    const { storeId, messages } = req.body;
    if (!storeId || !messages?.length) {
      return res.status(400).json({ error: 'storeId, messages required' });
    }

    const results = await sendBatch(storeId, messages);
    res.json({ success: true, results });
  } catch (err) {
    console.error('[API] /message/send-batch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`[WA Server] Running on port ${PORT}`);
  console.log(`[WA Server] API Key: ${API_KEY.slice(0, 3)}...`);
  console.log(`[WA Server] Webhook: ${process.env.WEBHOOK_URL || 'http://localhost:3000/api/whatsapp/webhook'}`);
});
