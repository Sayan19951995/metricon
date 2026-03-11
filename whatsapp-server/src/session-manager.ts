import makeWASocket, {
  DisconnectReason,
  WASocket,
  ConnectionState,
  Browsers,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as QRCode from 'qrcode';
import pino from 'pino';
import { useSupabaseAuthState, deleteSupabaseAuthState, hasSupabaseAuthState } from './supabase-auth-state.js';

const logger = pino({ level: 'info' });

// Sessions that should never be closed due to inactivity
const PERSISTENT_SESSIONS = new Set(['metricon-global']);

interface SessionInfo {
  socket: WASocket | null;
  qr: string | null;           // base64 QR image
  status: 'disconnected' | 'qr_pending' | 'connecting' | 'connected';
  idleTimer: ReturnType<typeof setTimeout> | null;
  connectPromise: Promise<void> | null;
  retryCount: number;
  loggedOutRetries: number;    // how many times we've retried after loggedOut (401)
}

const MAX_RETRIES = 5;
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // for non-persistent sessions only

class SessionManager {
  private sessions = new Map<string, SessionInfo>();

  /**
   * Начать новую сессию (для QR-сканирования).
   * Если уже подключен — возвращает текущий статус.
   */
  async startSession(storeId: string): Promise<{ qr: string | null; status: string }> {
    const existing = this.sessions.get(storeId);
    if (existing?.status === 'connected') {
      this.resetIdleTimer(storeId);
      return { qr: null, status: 'connected' };
    }
    if (existing?.status === 'qr_pending' && existing.qr) {
      return { qr: existing.qr, status: 'qr_pending' };
    }

    const info: SessionInfo = {
      socket: null,
      qr: null,
      status: 'connecting',
      idleTimer: null,
      connectPromise: null,
      retryCount: 0,
      loggedOutRetries: 0,
    };
    this.sessions.set(storeId, info);

    await this.connect(storeId, info);

    // Ждём QR или подключение (макс 8 сек)
    await this.waitForQrOrConnect(storeId, 8000);

    const current = this.sessions.get(storeId);
    if (!current) {
      return { qr: null, status: 'disconnected' };
    }
    return { qr: current.qr, status: current.status };
  }

  /**
   * Ленивое подключение — reconnect из сохранённых credentials без QR.
   */
  async ensureConnected(storeId: string): Promise<boolean> {
    const existing = this.sessions.get(storeId);
    if (existing?.status === 'connected') {
      this.resetIdleTimer(storeId);
      return true;
    }

    if (existing?.connectPromise) {
      await existing.connectPromise;
      return this.sessions.get(storeId)?.status === 'connected';
    }

    if (!(await hasSupabaseAuthState(storeId))) {
      return false;
    }

    const info: SessionInfo = {
      socket: null,
      qr: null,
      status: 'connecting',
      idleTimer: null,
      connectPromise: null,
      retryCount: 0,
      loggedOutRetries: 0,
    };
    this.sessions.set(storeId, info);

    const connectPromise = this.connect(storeId, info);
    info.connectPromise = connectPromise;

    await connectPromise;

    // Ждём подключение (макс 10 сек)
    await this.waitForConnect(storeId, 10000);

    return this.sessions.get(storeId)?.status === 'connected';
  }

  /**
   * Отправить сообщение.
   */
  async sendMessage(storeId: string, phone: string, message: string): Promise<boolean> {
    const connected = await this.ensureConnected(storeId);
    if (!connected) {
      console.error(`[${storeId}] Cannot send: not connected`);
      return false;
    }

    const session = this.sessions.get(storeId);
    if (!session?.socket) return false;

    try {
      const jid = this.normalizePhone(phone);
      await session.socket.sendMessage(jid, { text: message });
      this.resetIdleTimer(storeId);
      console.log(`[${storeId}] Message sent to ${jid}`);
      return true;
    } catch (err) {
      console.error(`[${storeId}] Send error:`, err);
      return false;
    }
  }

  /**
   * Получить статус сессии.
   */
  async getStatus(storeId: string): Promise<{ status: string; qr: string | null }> {
    const session = this.sessions.get(storeId);
    if (!session) {
      const hasCreds = await hasSupabaseAuthState(storeId);
      return {
        status: hasCreds ? 'disconnected' : 'not_registered',
        qr: null,
      };
    }
    return { status: session.status, qr: session.qr };
  }

  /**
   * Получить QR-код.
   */
  getQR(storeId: string): string | null {
    return this.sessions.get(storeId)?.qr || null;
  }

  /**
   * Отключить сессию и удалить credentials.
   */
  async disconnect(storeId: string): Promise<void> {
    const session = this.sessions.get(storeId);
    if (session) {
      if (session.idleTimer) clearTimeout(session.idleTimer);
      try {
        await session.socket?.logout();
      } catch {
        // ignore logout errors
      }
      session.socket?.end(undefined);
      this.sessions.delete(storeId);
    }

    await deleteSupabaseAuthState(storeId);
  }

  // === Private methods ===

  private async connect(storeId: string, info: SessionInfo): Promise<void> {
    const { state, saveCreds } = await useSupabaseAuthState(storeId);

    let version: [number, number, number];
    try {
      const result = await fetchLatestBaileysVersion();
      version = result.version;
      console.log(`[${storeId}] Using WA version: ${version.join('.')}`);
    } catch {
      version = [2, 3000, 1033105955]; // fallback
      console.log(`[${storeId}] Using fallback WA version: ${version.join('.')}`);
    }

    const socket = makeWASocket({
      auth: state,
      version,
      logger: logger as any,
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Chrome'),
      connectTimeoutMs: 60_000,
      retryRequestDelayMs: 500,
      markOnlineOnConnect: false,
    });

    info.socket = socket;

    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
      const { connection, lastDisconnect, qr } = update;

      console.log(`[${storeId}] connection.update:`, JSON.stringify({ connection, qr: qr ? 'present' : null, lastDisconnect: lastDisconnect?.error?.message }));

      if (qr) {
        try {
          info.qr = await QRCode.toDataURL(qr);
          info.status = 'qr_pending';
          console.log(`[${storeId}] QR code generated`);
        } catch (err) {
          console.error(`[${storeId}] QR generation error:`, err);
        }
      }

      if (connection === 'open') {
        info.status = 'connected';
        info.qr = null;
        info.connectPromise = null;
        info.retryCount = 0;
        info.loggedOutRetries = 0;
        this.resetIdleTimer(storeId);
        console.log(`[${storeId}] Connected ✓`);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;

        console.log(`[${storeId}] Disconnected (code: ${statusCode})`);

        if (!isLoggedOut) {
          // Network error, timeout, etc — always retry
          const isPersistent = PERSISTENT_SESSIONS.has(storeId);
          if (!isPersistent && info.retryCount >= MAX_RETRIES) {
            console.log(`[${storeId}] Max retries reached, giving up`);
            info.status = 'disconnected';
            info.connectPromise = null;
          } else {
            info.retryCount++;
            const delay = Math.min(3000 * Math.min(info.retryCount, 5), 15000);
            console.log(`[${storeId}] Reconnect attempt ${info.retryCount}${isPersistent ? ' (persistent, will retry forever)' : `/${MAX_RETRIES}`} in ${delay}ms...`);
            setTimeout(() => {
              const current = this.sessions.get(storeId);
              if (current && current.status !== 'connected') {
                this.connect(storeId, current);
              }
            }, delay);
          }
        } else {
          // loggedOut (401) — Railway restarts often trigger false-positive loggedOut.
          // Retry up to 3 times before giving up. NEVER delete credentials automatically —
          // credentials are only deleted via explicit /disconnect API.
          const MAX_LOGGED_OUT_RETRIES = 3;
          if (info.loggedOutRetries < MAX_LOGGED_OUT_RETRIES) {
            info.loggedOutRetries++;
            const delay = 5000 * info.loggedOutRetries;
            console.log(`[${storeId}] loggedOut (401), retry ${info.loggedOutRetries}/${MAX_LOGGED_OUT_RETRIES} in ${delay}ms...`);
            setTimeout(() => {
              const current = this.sessions.get(storeId);
              if (current && current.status !== 'connected') {
                this.connect(storeId, current);
              }
            }, delay);
          } else {
            // All retries failed — stop, but PRESERVE credentials in Supabase.
            // Use /disconnect API to clear creds and re-register via QR.
            info.status = 'disconnected';
            info.connectPromise = null;
            this.sessions.delete(storeId);
            console.log(`[${storeId}] loggedOut after ${info.loggedOutRetries} retries — stopping. Credentials preserved. Use /disconnect to re-register.`);
          }
        }
      }
    });
  }

  private resetIdleTimer(storeId: string): void {
    if (PERSISTENT_SESSIONS.has(storeId)) return;

    const session = this.sessions.get(storeId);
    if (!session) return;

    if (session.idleTimer) clearTimeout(session.idleTimer);

    session.idleTimer = setTimeout(() => {
      console.log(`[${storeId}] Idle timeout, closing session`);
      session.socket?.end(undefined);
      this.sessions.delete(storeId);
    }, IDLE_TIMEOUT_MS);
  }

  private normalizePhone(phone: string): string {
    let digits = phone.replace(/\D/g, '');

    if (digits.startsWith('8') && digits.length === 11) {
      digits = '7' + digits.slice(1);
    }

    if (digits.length === 10) {
      digits = '7' + digits;
    }

    return digits + '@s.whatsapp.net';
  }

  private waitForQrOrConnect(storeId: string, timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        const session = this.sessions.get(storeId);
        if (!session || session.status === 'connected' || session.qr) {
          resolve();
          return;
        }
        if (Date.now() - start > timeoutMs) {
          resolve();
          return;
        }
        setTimeout(check, 500);
      };
      check();
    });
  }

  private waitForConnect(storeId: string, timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        const session = this.sessions.get(storeId);
        if (!session || session.status === 'connected') {
          resolve();
          return;
        }
        if (Date.now() - start > timeoutMs) {
          resolve();
          return;
        }
        setTimeout(check, 500);
      };
      check();
    });
  }
}

export const sessionManager = new SessionManager();
