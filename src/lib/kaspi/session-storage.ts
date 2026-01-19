import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const SESSIONS_DIR = path.join(process.cwd(), 'sessions');
const ENCRYPTION_KEY = process.env.SESSION_ENCRYPTION_KEY || 'default-key-change-in-production-32bit';

interface StoredSession {
  username: string;
  encryptedPassword: string;
  cookies: any[];
  merchantId?: string;
  createdAt: number;
  lastUsed: number;
}

/**
 * Шифрование данных
 */
function encrypt(text: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Расшифровка данных
 */
function decrypt(text: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Создать директорию для сессий если не существует
 */
async function ensureSessionsDir(): Promise<void> {
  try {
    await fs.mkdir(SESSIONS_DIR, { recursive: true });
  } catch (error) {
    // Директория уже существует
  }
}

/**
 * Сохранить сессию
 */
export async function saveSession(
  username: string,
  password: string,
  cookies: any[],
  merchantId?: string
): Promise<string> {
  await ensureSessionsDir();

  const sessionId = crypto.randomUUID();
  const encryptedPassword = encrypt(password);

  const session: StoredSession = {
    username,
    encryptedPassword,
    cookies,
    merchantId,
    createdAt: Date.now(),
    lastUsed: Date.now(),
  };

  const sessionPath = path.join(SESSIONS_DIR, `${sessionId}.json`);
  await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));

  console.log(`Session saved: ${sessionId}`);
  return sessionId;
}

/**
 * Загрузить сессию
 */
export async function loadSession(sessionId: string): Promise<StoredSession | null> {
  try {
    const sessionPath = path.join(SESSIONS_DIR, `${sessionId}.json`);
    const data = await fs.readFile(sessionPath, 'utf-8');
    const session: StoredSession = JSON.parse(data);

    // Обновляем время последнего использования
    session.lastUsed = Date.now();
    await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));

    return session;
  } catch (error) {
    console.error(`Failed to load session ${sessionId}:`, error);
    return null;
  }
}

/**
 * Получить расшифрованный пароль
 */
export function decryptPassword(encryptedPassword: string): string {
  return decrypt(encryptedPassword);
}

/**
 * Найти сессию по username
 */
export async function findSessionByUsername(username: string): Promise<{ sessionId: string; session: StoredSession } | null> {
  try {
    await ensureSessionsDir();
    const files = await fs.readdir(SESSIONS_DIR);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const sessionId = file.replace('.json', '');
      const sessionPath = path.join(SESSIONS_DIR, file);
      const data = await fs.readFile(sessionPath, 'utf-8');
      const session: StoredSession = JSON.parse(data);

      if (session.username === username) {
        return { sessionId, session };
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to find session by username:', error);
    return null;
  }
}

/**
 * Обновить cookies в сессии
 */
export async function updateSessionCookies(
  sessionId: string,
  cookies: any[],
  merchantId?: string
): Promise<void> {
  const session = await loadSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  session.cookies = cookies;
  if (merchantId) {
    session.merchantId = merchantId;
  }
  session.lastUsed = Date.now();

  const sessionPath = path.join(SESSIONS_DIR, `${sessionId}.json`);
  await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));

  console.log(`Session cookies updated: ${sessionId}`);
}

/**
 * Удалить сессию
 */
export async function deleteSession(sessionId: string): Promise<void> {
  try {
    const sessionPath = path.join(SESSIONS_DIR, `${sessionId}.json`);
    await fs.unlink(sessionPath);
    console.log(`Session deleted: ${sessionId}`);
  } catch (error) {
    console.error(`Failed to delete session ${sessionId}:`, error);
  }
}

/**
 * Очистить старые сессии (старше 30 дней)
 */
export async function cleanupOldSessions(): Promise<void> {
  try {
    await ensureSessionsDir();
    const files = await fs.readdir(SESSIONS_DIR);
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const sessionPath = path.join(SESSIONS_DIR, file);
      const data = await fs.readFile(sessionPath, 'utf-8');
      const session: StoredSession = JSON.parse(data);

      if (session.lastUsed < thirtyDaysAgo) {
        await fs.unlink(sessionPath);
        console.log(`Deleted old session: ${file}`);
      }
    }
  } catch (error) {
    console.error('Failed to cleanup old sessions:', error);
  }
}

/**
 * Проверить валидность cookies и автоматически обновить если истекли
 */
export async function validateAndRefreshSession(sessionId: string): Promise<{
  cookieString: string;
  merchantId: string;
  refreshed: boolean;
} | null> {
  const session = await loadSession(sessionId);
  if (!session) {
    console.error('Session not found');
    return null;
  }

  const cookieString = session.cookies
    .map((c: any) => `${c.name}=${c.value}`)
    .join('; ');
  const merchantId = session.merchantId || '4929016';

  // Проверяем валидность cookies
  try {
    const testResponse = await fetch(
      `https://mc.shop.kaspi.kz/merchant-nct/mc/nct/kassa-status?m=${merchantId}`,
      {
        headers: {
          Cookie: cookieString,
          Accept: 'application/json',
          Referer: 'https://kaspi.kz/',
        },
      }
    );

    if (testResponse.ok) {
      console.log('Session cookies are valid');
      return { cookieString, merchantId, refreshed: false };
    }

    console.log('Session cookies expired, attempting auto-relogin...');
  } catch (error) {
    console.error('Failed to validate session:', error);
  }

  // Cookies истекли - делаем auto-relogin
  try {
    const { KaspiAutomation } = await import('./automation');
    const password = decryptPassword(session.encryptedPassword);

    const automation = new KaspiAutomation({
      username: session.username,
      password: password,
    });

    console.log('Initializing browser for auto-relogin...');
    await automation.init(true); // headless mode

    console.log('Attempting auto-relogin...');
    const loginSuccess = await automation.login();

    if (!loginSuccess) {
      console.error('Auto-relogin failed');
      await automation.close();
      return null;
    }

    console.log('Auto-relogin successful, updating cookies...');

    // Получаем новые cookies
    const newCookies = await automation['context']!.cookies();

    // Обновляем merchant ID
    let newMerchantId = merchantId;
    try {
      await automation['page']!.goto('https://kaspi.kz/mc/', {
        waitUntil: 'domcontentloaded',
      });
      const extractedId = await automation['page']!.evaluate(() => {
        const match = document.body.innerHTML.match(/merchantUid["\s:]+(\d+)/);
        return match ? match[1] : undefined;
      });
      if (extractedId) {
        newMerchantId = extractedId;
      }
    } catch (error) {
      console.log('Failed to extract merchant ID during relogin:', error);
    }

    // Закрываем браузер
    await automation.close();

    // Сохраняем новые cookies
    await updateSessionCookies(sessionId, newCookies, newMerchantId);

    const newCookieString = newCookies.map(c => `${c.name}=${c.value}`).join('; ');

    console.log('Auto-relogin completed successfully');
    return {
      cookieString: newCookieString,
      merchantId: newMerchantId,
      refreshed: true,
    };
  } catch (error) {
    console.error('Auto-relogin failed:', error);
    return null;
  }
}
