/**
 * HTTP клиент для вызовов к WhatsApp микросервису.
 * Vercel → Railway/VPS.
 */

const WA_SERVER_URL = process.env.WA_SERVER_URL || 'http://localhost:3001';
const WA_SERVER_SECRET = process.env.WA_SERVER_SECRET || 'dev-secret';

async function waFetch(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${WA_SERVER_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': WA_SERVER_SECRET,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`WA server error ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * Начать сессию WhatsApp для магазина. Возвращает QR-код (base64).
 */
export async function waStartSession(storeId: string): Promise<{ qr: string | null; status: string }> {
  return waFetch('/session/start', {
    method: 'POST',
    body: JSON.stringify({ storeId }),
  });
}

/**
 * Получить статус подключения WhatsApp.
 */
export async function waGetStatus(storeId: string): Promise<{ status: string; qr: string | null }> {
  return waFetch(`/session/${storeId}/status`);
}

/**
 * Получить текущий QR-код.
 */
export async function waGetQR(storeId: string): Promise<string | null> {
  try {
    const data = await waFetch(`/session/${storeId}/qr`);
    return data.qr || null;
  } catch {
    return null;
  }
}

/**
 * Отключить WhatsApp.
 */
export async function waDisconnect(storeId: string): Promise<void> {
  await waFetch(`/session/${storeId}`, { method: 'DELETE' });
}

/**
 * Отправить одно сообщение.
 */
export async function waSendMessage(storeId: string, phone: string, message: string): Promise<boolean> {
  try {
    const data = await waFetch('/message/send', {
      method: 'POST',
      body: JSON.stringify({ storeId, phone, message }),
    });
    return data.success === true;
  } catch (err) {
    console.error(`waSendMessage error [${storeId}]:`, err);
    return false;
  }
}

/**
 * Отправить Poll (опрос) через WhatsApp.
 */
export async function waSendPoll(
  storeId: string,
  phone: string,
  question: string,
  options: string[]
): Promise<{ success: boolean; messageId?: string }> {
  try {
    return await waFetch('/poll/send', {
      method: 'POST',
      body: JSON.stringify({ storeId, phone, question, options }),
    });
  } catch (err) {
    console.error(`waSendPoll error [${storeId}]:`, err);
    return { success: false };
  }
}

/**
 * Отправить пакет сообщений (с задержками между ними).
 */
export async function waSendBatch(
  storeId: string,
  messages: Array<{ phone: string; message: string }>
): Promise<Array<{ phone: string; success: boolean }>> {
  try {
    const data = await waFetch('/message/send-batch', {
      method: 'POST',
      body: JSON.stringify({ storeId, messages }),
    });
    return data.results || [];
  } catch (err) {
    console.error(`waSendBatch error [${storeId}]:`, err);
    return messages.map(m => ({ phone: m.phone, success: false }));
  }
}
