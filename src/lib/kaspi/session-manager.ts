/**
 * Kaspi Cabinet Session Manager
 *
 * Автоматически перелогинивается когда сессия истекает (401).
 * Используется всеми роутами которые работают с BFF.
 */

import { KaspiAPIClient, kaspiCabinetLogin } from './api-client';
import { supabase } from '@/lib/supabase/client';

interface KaspiSession {
  cookies: string;
  merchant_id: string;
  created_at?: string;
  username?: string;
  password?: string;
}

interface SessionResult {
  client: KaspiAPIClient;
  merchantId: string;
  refreshed: boolean;
}

/**
 * Получить рабочий KaspiAPIClient для магазина.
 * Если сессия истекла — автоматически перелогинится.
 *
 * @returns SessionResult или null если нет сессии/логина
 */
export async function getOrRefreshCabinetClient(
  storeId: string,
  session: KaspiSession | null,
  fallbackMerchantId?: string
): Promise<SessionResult | null> {
  if (!session?.cookies) return null;

  const merchantId = session.merchant_id || fallbackMerchantId || '';
  if (!merchantId) return null;

  const client = new KaspiAPIClient(session.cookies, merchantId);

  // Пробуем загрузить товары — если 401, перелогиниваемся
  try {
    await client.getAllProducts();
    return { client, merchantId, refreshed: false };
  } catch (err: any) {
    const is401 = err.message?.includes('401') || err.message?.includes('Unauthorized');
    if (!is401) {
      // Другая ошибка — не связана с сессией
      throw err;
    }
  }

  // Сессия истекла — пробуем перелогин
  if (!session.username || !session.password) {
    console.log(`[SessionManager] Session expired for store ${storeId}, no credentials for auto-relogin`);
    return null;
  }

  console.log(`[SessionManager] Session expired for store ${storeId}, attempting auto-relogin...`);

  try {
    const loginResult = await kaspiCabinetLogin(session.username, session.password);

    if (!loginResult.success || !loginResult.cookies) {
      console.error(`[SessionManager] Auto-relogin failed for store ${storeId}: ${loginResult.error}`);
      return null;
    }

    const newMerchantId = loginResult.merchantId || merchantId;
    const newSession: KaspiSession = {
      cookies: loginResult.cookies,
      merchant_id: newMerchantId,
      created_at: new Date().toISOString(),
      username: session.username,
      password: session.password,
    };

    // Сохраняем новую сессию в БД
    await supabase
      .from('stores')
      .update({ kaspi_session: newSession as any })
      .eq('id', storeId);

    console.log(`[SessionManager] Auto-relogin successful for store ${storeId}`);

    const newClient = new KaspiAPIClient(loginResult.cookies, newMerchantId);
    return { client: newClient, merchantId: newMerchantId, refreshed: true };
  } catch (loginErr) {
    console.error(`[SessionManager] Auto-relogin error for store ${storeId}:`, loginErr);
    return null;
  }
}

/**
 * Лёгкая версия — только перелогин без проверки через getAllProducts.
 * Используется когда BFF возвращает 401 в процессе работы.
 */
export async function refreshCabinetSession(
  storeId: string,
  session: KaspiSession | null,
  fallbackMerchantId?: string
): Promise<SessionResult | null> {
  if (!session?.username || !session?.password) return null;

  const merchantId = session.merchant_id || fallbackMerchantId || '';

  try {
    const loginResult = await kaspiCabinetLogin(session.username, session.password);

    if (!loginResult.success || !loginResult.cookies) {
      console.error(`[SessionManager] Refresh failed for store ${storeId}`);
      return null;
    }

    const newMerchantId = loginResult.merchantId || merchantId;
    const newSession: KaspiSession = {
      cookies: loginResult.cookies,
      merchant_id: newMerchantId,
      created_at: new Date().toISOString(),
      username: session.username,
      password: session.password,
    };

    await supabase
      .from('stores')
      .update({ kaspi_session: newSession as any })
      .eq('id', storeId);

    console.log(`[SessionManager] Session refreshed for store ${storeId}`);

    const newClient = new KaspiAPIClient(loginResult.cookies, newMerchantId);
    return { client: newClient, merchantId: newMerchantId, refreshed: true };
  } catch (err) {
    console.error(`[SessionManager] Refresh error for store ${storeId}:`, err);
    return null;
  }
}
