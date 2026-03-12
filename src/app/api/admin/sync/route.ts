import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '@/lib/api-auth';
import { KaspiAPIClient } from '@/lib/kaspi/api-client';
import { refreshCabinetSession } from '@/lib/kaspi/session-manager';

interface KaspiSession {
  cookies: string;
  merchant_id: string;
  username?: string;
  password?: string;
}

/**
 * POST /api/admin/sync
 * Ручной backfill completed_at для конкретного store (админ)
 * Body: { storeId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    const { data: adminUser } = await supabaseAdmin.from('users').select('is_admin').eq('id', userId).single();
    if (!(adminUser as any)?.is_admin) {
      return NextResponse.json({ success: false, message: 'Нет доступа' }, { status: 403 });
    }

    const body = await request.json();
    const { storeId } = body;
    if (!storeId) {
      return NextResponse.json({ success: false, message: 'storeId обязателен' }, { status: 400 });
    }

    const { data: store } = await supabaseAdmin
      .from('stores')
      .select('id, kaspi_session, kaspi_merchant_id, name')
      .eq('id', storeId)
      .single();

    if (!store) {
      return NextResponse.json({ success: false, message: 'Магазин не найден' }, { status: 404 });
    }

    const session = (store as any).kaspi_session as KaspiSession | null;
    if (!session?.cookies) {
      return NextResponse.json({
        success: false,
        message: 'У магазина нет BFF сессии (Kaspi Cabinet не подключен)',
      }, { status: 400 });
    }

    let client = new KaspiAPIClient(session.cookies, session.merchant_id || store.kaspi_merchant_id || '');

    // Находим completed заказы без completed_at
    const { data: ordersToFix } = await supabaseAdmin
      .from('orders')
      .select('id, kaspi_order_id, completed_at, status')
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .is('completed_at', null);

    if (!ordersToFix || ordersToFix.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Все completed заказы уже имеют completed_at',
        fixed: 0,
        total: 0,
      });
    }

    console.log(`[ADMIN SYNC] Store ${store.name || storeId}: ${ordersToFix.length} orders missing completed_at`);

    // Тест BFF — первый заказ
    let testDate: string | null = null;
    try {
      testDate = await client.getOrderCompletionDate(ordersToFix[0].kaspi_order_id);
    } catch (e) {
      console.warn(`[ADMIN SYNC] BFF test failed:`, e);
    }

    // Если не сработало — relogin
    if (!testDate && session.username && session.password) {
      console.log(`[ADMIN SYNC] BFF test failed, trying relogin...`);
      const refreshed = await refreshCabinetSession(storeId, session, store.kaspi_merchant_id || undefined);
      if (refreshed) {
        client = refreshed.client;
        try {
          testDate = await client.getOrderCompletionDate(ordersToFix[0].kaspi_order_id);
        } catch (e) {
          console.warn(`[ADMIN SYNC] BFF test after relogin failed:`, e);
        }
      }
    }

    if (!testDate) {
      return NextResponse.json({
        success: false,
        message: 'BFF сессия не работает. Пользователю нужно переподключить Kaspi Cabinet.',
        total: ordersToFix.length,
      }, { status: 400 });
    }

    // Тест прошёл — фиксим первый и остальные
    await supabaseAdmin.from('orders').update({ completed_at: testDate }).eq('id', ordersToFix[0].id);
    let fixed = 1;
    let failed = 0;

    const remaining = ordersToFix.slice(1);
    const CONCURRENCY = 5;

    for (let i = 0; i < remaining.length; i += CONCURRENCY) {
      const chunk = remaining.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        chunk.map(async (order) => {
          try {
            const exactDate = await client.getOrderCompletionDate(order.kaspi_order_id);
            if (exactDate) {
              await supabaseAdmin.from('orders').update({ completed_at: exactDate }).eq('id', order.id);
              return true;
            }
            return false;
          } catch {
            return false;
          }
        })
      );
      for (const ok of results) {
        if (ok) fixed++;
        else failed++;
      }
    }

    console.log(`[ADMIN SYNC] Done: fixed=${fixed}, failed=${failed}, total=${ordersToFix.length}`);

    return NextResponse.json({
      success: true,
      message: `Backfill завершён`,
      fixed,
      failed,
      total: ordersToFix.length,
    });
  } catch (error) {
    console.error('[ADMIN SYNC] Error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}
