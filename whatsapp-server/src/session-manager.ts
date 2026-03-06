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

// Idle timeout before closing an unused session (5 minutes)
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// Callback для обработки входящих сообщений (poll ответы, текст)
type IncomingMessageHandler = (storeId: string, msg: {
  from: string;
  messageId: string;
  text?: string;
  pollVotes?: Array<{ name: string; voters: string[] }>;
  pollCreationMessageId?: string;
}) => void;

interface SessionInfo {
  socket: WASocket | null;
  qr: string | null;           // base64 QR image
  status: 'disconnected' | 'qr_pending' | 'connecting' | 'connected';
  idleTimer: ReturnType<typeof setTimeout> | null;
  connectPromise: Promise<void> | null;
  retryCount: number;
}

const MAX_RETRIES = 5;

class SessionManager {
  private sessions = new Map<string, SessionInfo>();
  private incomingHandler: IncomingMessageHandler | null = null;

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

    // Создаём новую сессию
    const info: SessionInfo = {
      socket: null,
      qr: null,
      status: 'connecting',
      idleTimer: null,
      connectPromise: null,
      retryCount: 0,
    };
    this.sessions.set(storeId, info);

    await this.connect(storeId, info);

    // Ждём QR или подключение (макс 45 сек)
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
   * Отправить Poll (опрос).
   */
  async sendPoll(storeId: string, phone: string, question: string, options: string[]): Promise<{ success: boolean; messageId?: string }> {
    const connected = await this.ensureConnected(storeId);
    if (!connected) {
      console.error(`[${storeId}] Cannot send poll: not connected`);
      return { success: false };
    }

    const session = this.sessions.get(storeId);
    if (!session?.socket) return { success: false };

    try {
      const jid = this.normalizePhone(phone);
      const result = await session.socket.sendMessage(jid, {
        poll: {
          name: question,
          values: options,
          selectableCount: 1,
        },
      });
      this.resetIdleTimer(storeId);
      const messageId = result?.key?.id || null;
      console.log(`[${storeId}] Poll sent to ${jid}, messageId=${messageId}`);
      return { success: true, messageId: messageId || undefined };
    } catch (err) {
      console.error(`[${storeId}] Send poll error:`, err);
      return { success: false };
    }
  }

  /**
   * Установить обработчик входящих сообщений (для feedback).
   */
  onIncomingMessage(handler: IncomingMessageHandler): void {
    this.incomingHandler = handler;
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

    // Получаем актуальную версию WhatsApp Web (без неё — 405 ошибка)
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
        // Генерируем QR как base64 PNG
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
        this.resetIdleTimer(storeId);
        console.log(`[${storeId}] Connected`);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(`[${storeId}] Disconnected (code: ${statusCode}, reconnect: ${shouldReconnect})`);

        if (shouldReconnect && info.retryCount < MAX_RETRIES) {
          info.retryCount++;
          const delay = Math.min(3000 * info.retryCount, 15000);
          console.log(`[${storeId}] Reconnect attempt ${info.retryCount}/${MAX_RETRIES} in ${delay}ms...`);
          setTimeout(() => {
            const current = this.sessions.get(storeId);
            if (current && current.status !== 'connected') {
              this.connect(storeId, current);
            }
          }, delay);
        } else if (shouldReconnect) {
          console.log(`[${storeId}] Max retries reached, giving up`);
          info.status = 'disconnected';
          info.connectPromise = null;
        } else {
          // loggedOut — delete stale credentials so next startSession generates fresh QR
          info.status = 'disconnected';
          info.connectPromise = null;
          this.sessions.delete(storeId);
          deleteSupabaseAuthState(storeId).catch(e =>
            console.error(`[${storeId}] Failed to delete stale creds:`, e)
          );
          console.log(`[${storeId}] Stale credentials deleted, next connect will show QR`);
        }
      }
    });

    // Обработка входящих сообщений (текст от клиентов)
    socket.ev.on('messages.upsert', ({ messages: msgs }) => {
      if (!this.incomingHandler) return;
      for (const msg of msgs) {
        if (msg.key.fromMe) continue;
        const from = msg.key.remoteJid;
        if (!from) continue;

        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || undefined;
        if (text) {
          this.incomingHandler(storeId, {
            from,
            messageId: msg.key.id || '',
            text,
          });
        }
      }
    });

    // Обработка ответов на Poll
    socket.ev.on('messages.update', (updates) => {
      if (!this.incomingHandler) return;
      for (const update of updates) {
        const pollUpdate = (update as any).update?.pollUpdates;
        if (!pollUpdate || pollUpdate.length === 0) continue;

        const from = update.key.remoteJid;
        if (!from) continue;

        for (const pu of pollUpdate) {
          const votes: Array<{ name: string; voters: string[] }> = (pu.vote || []).map((v: any) => ({
            name: v.optionName || '',
            voters: v.voters || [],
          }));

          if (votes.length > 0) {
            this.incomingHandler(storeId, {
              from,
              messageId: update.key.id || '',
              pollVotes: votes,
              pollCreationMessageId: update.key.id || '',
            });
          }
        }
      }
    });
  }

  private resetIdleTimer(storeId: string): void {
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
    // Убираем все нецифровые символы
    let digits = phone.replace(/\D/g, '');

    // Казахстан: 8 → 7, +7 уже ок
    if (digits.startsWith('8') && digits.length === 11) {
      digits = '7' + digits.slice(1);
    }

    // Если без кода страны (10 цифр) — добавляем 7 (Казахстан)
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
