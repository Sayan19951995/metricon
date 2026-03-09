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
const API_KEY = process.env.WA_SERVER_SECRET || process.env.API_KEY || 'dev-secret';

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
  // Kazakhstan: 8 -> 7
  if (cleaned.startsWith('8') && cleaned.length === 11) {
    cleaned = '7' + cleaned.slice(1);
  }
  return cleaned + '@s.whatsapp.net';
}

/**
 * Get session for a store. Read-only — just returns current state.
 */
function getSession(storeId) {
  const session = sessions.get(storeId);
  if (!session) return null;
  return session;
}

/**
 * Start a Baileys session for a store.
 * If pairingPhone is provided, uses phone number pairing instead of QR.
 * Returns { status, qr, pairingCode }.
 */
async function startSession(storeId, pairingPhone = null) {
  // If already connected, return status
  const existing = sessions.get(storeId);
  if (existing && existing.status === 'connected') {
    return { status: 'connected', qr: null, pairingCode: null };
  }

  // If code_pending and has code, check if socket is still alive
  if (existing && existing.status === 'code_pending' && existing.pairingCode) {
    const wsState = existing.sock?.ws?.readyState;
    // Only return cached code if socket is alive (readyState 0=connecting or 1=open)
    if (wsState === 0 || wsState === 1) {
      return { status: 'code_pending', qr: null, pairingCode: existing.pairingCode };
    }
    // Socket dead — fall through to create fresh session
    console.log(`[WA] code_pending but socket dead (ws=${wsState}), creating fresh session`);
  }

  // If reconnecting, don't start another
  if (existing && existing.status === 'reconnecting') {
    return { status: 'reconnecting', qr: null, pairingCode: null };
  }

  // Clean up any existing stale session before starting new one
  if (existing) {
    try { existing.sock?.end(); } catch {}
    sessions.delete(storeId);
  }

  const authDir = path.join(__dirname, 'auth', storeId);

  // If pairing by phone, always start fresh — old creds have registered=true which skips pairing
  if (pairingPhone && fs.existsSync(authDir)) {
    fs.rmSync(authDir, { recursive: true, force: true });
    console.log(`[WA] Cleared old auth for ${storeId} (fresh pairing)`);
  }

  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const hasAuthFiles = fs.existsSync(path.join(authDir, 'creds.json'));

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
    pairingCode: null,
    pairingPhone: pairingPhone || null,
    reconnectAttempts: 0,
    hasAuthFiles,
  };
  sessions.set(storeId, session);

  // Promise to wait for pairing code (resolved when QR event fires and we request pairing)
  let pairingResolve = null;
  const pairingPromise = pairingPhone
    ? new Promise((resolve) => { pairingResolve = resolve; })
    : null;

  // Handle connection updates
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      if (pairingPhone && !session.pairingCode) {
        // Socket is ready (QR received) — request pairing code instead of showing QR
        try {
          if (!sock.authState?.creds?.registered) {
            const cleanPhone = pairingPhone.replace(/[^\d]/g, '');
            const phone = cleanPhone.startsWith('8') && cleanPhone.length === 11
              ? '7' + cleanPhone.slice(1)
              : cleanPhone;
            console.log(`[WA] Socket ready (QR event), requesting pairing code for ${phone}`);
            const code = await sock.requestPairingCode(phone);
            session.pairingCode = code;
            session.status = 'code_pending';
            console.log(`[WA] Pairing code for store ${storeId}: ${code}`);
          }
        } catch (err) {
          console.error(`[WA] Pairing code request failed:`, err.message);
        }
        if (pairingResolve) { pairingResolve(); pairingResolve = null; }
      } else if (!pairingPhone) {
        // No phone pairing — show QR
        try {
          session.qr = await QRCode.toDataURL(qr, { width: 256 });
          session.status = 'qr_pending';
          console.log(`[WA] QR generated for store ${storeId}`);
        } catch (err) {
          console.error(`[WA] QR generation failed:`, err);
        }
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

      console.log(`[WA] Disconnected: store ${storeId}, code=${statusCode}, shouldReconnect=${shouldReconnect}`);

      if (!shouldReconnect) {
        // loggedOut (401) — auth is invalid, delete creds and stop
        console.log(`[WA] Logged out, clearing auth for ${storeId}`);
        session.status = 'disconnected';
        sessions.delete(storeId);
        const authPath = path.join(__dirname, 'auth', storeId);
        if (fs.existsSync(authPath)) {
          fs.rmSync(authPath, { recursive: true, force: true });
        }
        notifyWebhook('connection_update', { storeId, status: 'disconnected' });
        return;
      }

      // During pairing (code_pending + 515): reconnect socket to keep pairing alive
      if (session.status === 'code_pending' && statusCode === 515) {
        console.log(`[WA] Socket died during pairing for ${storeId} (code=515), reconnecting socket...`);
        const savedCode = session.pairingCode;
        setTimeout(() => {
          sessions.delete(storeId);
          startSession(storeId, null).then(() => {
            const newSession = sessions.get(storeId);
            if (newSession && newSession.status !== 'connected') {
              if (savedCode) newSession.pairingCode = savedCode;
              newSession.status = 'code_pending';
            }
          }).catch(err => {
            console.error(`[WA] Pairing reconnect failed for ${storeId}:`, err.message);
          });
        }, 1000);
        return;
      }

      // No auto-reconnect — user must reconnect manually via UI
      session.status = 'disconnected';
      console.log(`[WA] Session ${storeId} marked disconnected. Manual reconnect required.`);
      notifyWebhook('connection_update', { storeId, status: 'disconnected' });
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

      // Regular text message
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
        const selectedOptions = vote.vote?.selectedOptions || [];
        if (selectedOptions.length > 0 && phone) {
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

  // Wait for pairing code if requested, otherwise just wait for initial connection
  if (pairingPromise) {
    // Wait for pairing code, but timeout after 15s if QR never arrives
    await Promise.race([
      pairingPromise,
      new Promise(resolve => setTimeout(() => {
        console.log(`[WA] Pairing code timeout for ${storeId} (15s)`);
        if (pairingResolve) { pairingResolve(); pairingResolve = null; }
        resolve();
      }, 15000)),
    ]);
  } else {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return { status: session.status, qr: session.qr, pairingCode: session.pairingCode };
}

/**
 * Restore all sessions from auth directory on startup.
 */
async function restoreSessions() {
  const authBase = path.join(__dirname, 'auth');
  if (!fs.existsSync(authBase)) return;

  const dirs = fs.readdirSync(authBase).filter(d => {
    const full = path.join(authBase, d);
    return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, 'creds.json'));
  });

  console.log(`[WA] Found ${dirs.length} saved session(s) to restore: ${dirs.join(', ') || 'none'}`);

  for (const storeId of dirs) {
    try {
      console.log(`[WA] Restoring session: ${storeId}`);
      await startSession(storeId);
    } catch (err) {
      console.error(`[WA] Failed to restore session ${storeId}:`, err.message);
    }
  }
}

/**
 * Disconnect session. Only deletes auth files if deleteAuth=true (explicit logout).
 */
async function disconnectSession(storeId, deleteAuth = true) {
  const session = sessions.get(storeId);
  if (session?.sock) {
    try {
      await session.sock.logout();
    } catch {
      // ignore
    }
    try {
      session.sock.end();
    } catch {
      // ignore
    }
  }
  sessions.delete(storeId);

  if (deleteAuth) {
    const authDir = path.join(__dirname, 'auth', storeId);
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true, force: true });
    }
  }
}

/**
 * Send a text message. No auto-reconnect — just report errors.
 */
async function sendMessage(storeId, phone, message) {
  const session = sessions.get(storeId);
  if (!session || session.status !== 'connected') {
    throw new Error(`Store ${storeId} not connected (status: ${session?.status || 'no session'})`);
  }

  const jid = formatJid(phone);
  try {
    await session.sock.sendMessage(jid, { text: message });
    return true;
  } catch (err) {
    console.error(`[WA] sendMessage failed for ${storeId}:`, err.message);
    session.status = 'disconnected';
    throw new Error(`Ошибка отправки: ${err.message}`);
  }
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
  restoreSessions,
};
