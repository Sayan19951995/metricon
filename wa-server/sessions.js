/**
 * Multi-tenant Baileys session manager.
 * One WhatsApp connection per storeId.
 */

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const path = require('path');
const fs = require('fs');
const pino = require('pino');
const QRCode = require('qrcode');

const logger = pino({ level: 'warn' });

// In-memory store of active sessions
const sessions = new Map();

// Webhook URL to notify main app
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/whatsapp/webhook';
const API_KEY = process.env.API_KEY || 'dev-secret';

/**
 * Send event to the main app webhook.
 */
async function notifyWebhook(event, data) {
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify({ event, ...data }),
    });
  } catch (err) {
    console.error(`[WA] Webhook notify failed (${event}):`, err.message);
  }
}

/**
 * Format phone number for WhatsApp JID.
 * Accepts: +77771234567, 77771234567, 87771234567
 */
function formatJid(phone) {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);
  // Kazakhstan: 8 → 7
  if (cleaned.startsWith('8') && cleaned.length === 11) {
    cleaned = '7' + cleaned.slice(1);
  }
  return cleaned + '@s.whatsapp.net';
}

/**
 * Get or create a session for a store.
 */
function getSession(storeId) {
  return sessions.get(storeId) || null;
}

/**
 * Start a Baileys session for a store.
 * Returns { status, qr }.
 */
async function startSession(storeId) {
  // If already connected, return status
  const existing = sessions.get(storeId);
  if (existing && existing.status === 'connected') {
    return { status: 'connected', qr: null };
  }

  // If already connecting (QR pending), return current QR
  if (existing && existing.status === 'qr_pending') {
    return { status: 'qr_pending', qr: existing.qr };
  }

  const authDir = path.join(__dirname, 'auth', storeId);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    printQRInTerminal: false,
    generateHighQualityLinkPreview: false,
  });

  const session = {
    sock,
    storeId,
    status: 'connecting',
    qr: null,
    reconnectAttempts: 0,
  };
  sessions.set(storeId, session);

  // Handle connection updates
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      // Generate QR as data URL
      try {
        session.qr = await QRCode.toDataURL(qr, { width: 256 });
        session.status = 'qr_pending';
        console.log(`[WA] QR generated for store ${storeId}`);
      } catch (err) {
        console.error(`[WA] QR generation failed:`, err);
      }
    }

    if (connection === 'open') {
      session.status = 'connected';
      session.qr = null;
      session.reconnectAttempts = 0;
      console.log(`[WA] Connected: store ${storeId}`);
      notifyWebhook('connection_update', { storeId, status: 'connected' });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`[WA] Disconnected: store ${storeId}, code=${statusCode}, reconnect=${shouldReconnect}`);

      if (shouldReconnect && session.reconnectAttempts < 5) {
        session.reconnectAttempts++;
        session.status = 'reconnecting';
        const delay = Math.min(1000 * Math.pow(2, session.reconnectAttempts), 30000);
        console.log(`[WA] Reconnecting store ${storeId} in ${delay}ms (attempt ${session.reconnectAttempts})`);
        setTimeout(() => startSession(storeId), delay);
      } else {
        session.status = 'disconnected';
        sessions.delete(storeId);
        notifyWebhook('connection_update', { storeId, status: 'disconnected' });
      }
    }
  });

  // Save credentials on update
  sock.ev.on('creds.update', saveCreds);

  // Handle incoming messages (for poll votes)
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const phone = msg.key.remoteJid?.replace('@s.whatsapp.net', '') || '';

      // Check for poll vote
      const pollUpdate = msg.message.pollUpdateMessage;
      if (pollUpdate) {
        // Poll votes come through messages.update, not messages.upsert
        continue;
      }

      // Regular text message — could be a reply to bad_response
      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        '';

      if (text && phone) {
        notifyWebhook('message_received', { storeId, phone, text });
      }
    }
  });

  // Handle poll votes
  sock.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      const pollUpdate = update.update?.pollUpdates;
      if (!pollUpdate || pollUpdate.length === 0) continue;

      const phone = update.key.remoteJid?.replace('@s.whatsapp.net', '') || '';

      for (const vote of pollUpdate) {
        // vote.pollUpdateMessageKey = original poll msg key
        // vote.vote.selectedOptions = array of selected hashes
        // We need to decode the selected option names
        const selectedOptions = vote.vote?.selectedOptions || [];
        if (selectedOptions.length > 0 && phone) {
          // Baileys gives SHA256 hashes of options, we need to match
          // For simplicity, store the raw vote and let webhook decode
          notifyWebhook('poll_vote', {
            storeId,
            phone,
            pollMsgId: update.key.id,
            selectedHashes: selectedOptions.map(o => Buffer.from(o).toString('hex')),
          });
        }
      }
    }
  });

  // Wait a moment for initial connection
  await new Promise(resolve => setTimeout(resolve, 2000));

  return { status: session.status, qr: session.qr };
}

/**
 * Disconnect and optionally delete auth for a store.
 */
async function disconnectSession(storeId) {
  const session = sessions.get(storeId);
  if (session?.sock) {
    try {
      await session.sock.logout();
    } catch {
      // ignore
    }
    session.sock.end();
  }
  sessions.delete(storeId);

  // Delete auth files
  const authDir = path.join(__dirname, 'auth', storeId);
  if (fs.existsSync(authDir)) {
    fs.rmSync(authDir, { recursive: true, force: true });
  }
}

/**
 * Send a text message.
 */
async function sendMessage(storeId, phone, message) {
  const session = sessions.get(storeId);
  if (!session || session.status !== 'connected') {
    throw new Error(`Store ${storeId} not connected`);
  }

  const jid = formatJid(phone);
  await session.sock.sendMessage(jid, { text: message });
  return true;
}

/**
 * Send a WhatsApp poll.
 */
async function sendPoll(storeId, phone, question, options) {
  const session = sessions.get(storeId);
  if (!session || session.status !== 'connected') {
    throw new Error(`Store ${storeId} not connected`);
  }

  const jid = formatJid(phone);
  const msg = await session.sock.sendMessage(jid, {
    poll: {
      name: question,
      values: options,
      selectableCount: 1,
    },
  });

  return { success: true, messageId: msg.key.id };
}

/**
 * Send batch messages with delays.
 */
async function sendBatch(storeId, messages) {
  const results = [];
  for (const { phone, message } of messages) {
    try {
      await sendMessage(storeId, phone, message);
      results.push({ phone, success: true });
    } catch {
      results.push({ phone, success: false });
    }
    // 2s delay between messages to avoid spam detection
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  return results;
}

module.exports = {
  getSession,
  startSession,
  disconnectSession,
  sendMessage,
  sendPoll,
  sendBatch,
  formatJid,
};
