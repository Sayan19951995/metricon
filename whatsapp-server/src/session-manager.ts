import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  ConnectionState,
  Browsers,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as QRCode from 'qrcode';
import * as path from 'path';
import * as fs from 'fs';
import pino from 'pino';

const logger = pino({ level: 'info' });

// Время простоя перед закрытием ленивой сессии (5 минут)
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

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
  private authDir: string;

  constructor() {
    this.authDir = process.env.AUTH_DIR || path.join(process.cwd(), 'auth_sessions');
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }
  }

  private getSessionDir(storeId: string): string {
    return path.join(this.authDir, storeId);
  }

  private hasCredentials(storeId: string): boolean {
    const dir = this.getSessionDir(storeId);
    return fs.existsSync(path.join(dir, 'creds.json'));
  }

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
    await this.waitForQrOrConnect(storeId, 45000);

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

    if (!this.hasCredentials(storeId)) {
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
   * Получить статус сессии.
   */
  getStatus(storeId: string): { status: string; qr: string | null } {
    const session = this.sessions.get(storeId);
    if (!session) {
      return {
        status: this.hasCredentials(storeId) ? 'disconnected' : 'not_registered',
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
        // Игнорируем ошибки при logout
      }
      session.socket?.end(undefined);
      this.sessions.delete(storeId);
    }

    // Удаляем credentials
    const dir = this.getSessionDir(storeId);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  // === Private methods ===

  private async connect(storeId: string, info: SessionInfo): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(this.getSessionDir(storeId));

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
          info.status = 'disconnected';
          info.connectPromise = null;
          this.sessions.delete(storeId);
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
