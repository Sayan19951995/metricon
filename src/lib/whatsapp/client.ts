/**
 * HTTP клиент для вызовов к WhatsApp микросервису.
 * Vercel → Railway/VPS.
 */

const WA_SERVER_URL = process.env.WA_SERVER_URL || 'http://localhost:3001';
const WA_SERVER_SECRET = process.env.WA_SERVER_SECRET || 'dev-secret';

async function waFetch(path: string, options: RequestInit = {}, timeoutMs = 5000): Promise<any> {
  const separator = path.includes('?') ? '&' : '?';
  const url = `${WA_SERVER_URL}${path}${separator}_t=${Date.now()}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: 'no-store',
      next: { revalidate: 0 },
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': WA_SERVER_SECRET,
        ...options.headers,
      },
    } as any);
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => null);
  console.log(`[waFetch] ${options.method || 'GET'} ${path} → ${res.status}`, JSON.stringify(data));

  if (!res.ok) {
    throw new Error(`WA server error ${res.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Начать сессию WhatsApp для магазина.
 * Если phone передан — используется привязка по номеру (pairing code).
 */
export async function waStartSession(storeId: string, phone?: string): Promise<{ qr: string | null; status: string; pairingCode?: string | null }> {
  return waFetch('/session/start', {
    method: 'POST',
    body: JSON.stringify({ storeId, phone }),
  });
}


/**
 * Получить статус подключения WhatsApp.
 */
export async function waGetStatus(storeId: string): Promise<{ status: string; qr: string | null; pairingCode?: string | null }> {
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
 * Получить логи WA сервера.
 */
export async function waGetLogs(since = 0): Promise<Array<{ ts: number; level: string; msg: string }>> {
  try {
    const data = await waFetch(`/logs?since=${since}`);
    return data.logs || [];
  } catch {
    return [];
  }
}

/**
 * Отправить одно сообщение.
 */
export async function waSendMessage(storeId: string, phone: string, message: string): Promise<boolean> {
  try {
    console.log(`[WA-CLIENT] sendMessage: store=${storeId}, phone=${phone}, msg="${message.slice(0, 50)}..."`);
    const data = await waFetch('/message/send', {
      method: 'POST',
      body: JSON.stringify({ storeId, phone, message }),
    });
    console.log(`[WA-CLIENT] sendMessage result:`, data);
    return data.success === true;
  } catch (err) {
    console.error(`[WA-CLIENT] sendMessage FAILED [${storeId}]:`, err);
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
