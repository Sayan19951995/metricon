import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { KaspiAPIClient } from '@/lib/kaspi/api-client';

interface KaspiSession {
  cookies: string;
  merchant_id: string;
}

// POST — backfill corrupted completed_at dates from BFF
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const { data: store } = await supabase
      .from('stores')
      .select('id, kaspi_session, kaspi_merchant_id')
      .eq('user_id', userId)
      .single();

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const session = store.kaspi_session as KaspiSession | null;
    if (!session?.cookies) {
      return NextResponse.json({
        error: 'Kaspi Cabinet session not available. Please re-login in Settings → Kaspi.',
      }, { status: 401 });
    }

    const client = new KaspiAPIClient(session.cookies, session.merchant_id || store.kaspi_merchant_id || '');

    // Находим заказы с corrupted completed_at (все на 2026-02-07) или NULL
    const { data: corruptedOrders } = await supabase
      .from('orders')
      .select('id, kaspi_order_id, completed_at')
      .eq('store_id', store.id)
      .eq('status', 'completed')
      .or('completed_at.is.null,completed_at.gte.2026-02-07T00:00:00,completed_at.lte.2026-02-07T23:59:59');

    if (!corruptedOrders || corruptedOrders.length === 0) {
      return NextResponse.json({ message: 'No corrupted orders found', fixed: 0, failed: 0, total: 0 });
    }

    // Фильтруем: только те что на 2026-02-07 или NULL
    const toFix = corruptedOrders.filter(o => {
      if (!o.completed_at) return true;
      const date = new Date(o.completed_at).toISOString().split('T')[0];
      return date === '2026-02-07';
    });

    console.log(`BACKFILL: found ${toFix.length} orders to fix`);

    // Проверка сессии: тестируем один заказ перед обработкой всех
    const testOrder = toFix[0];
    const testDate = await client.getOrderCompletionDate(testOrder.kaspi_order_id);
    if (!testDate) {
      console.error(`BACKFILL: session test failed for order ${testOrder.kaspi_order_id} — BFF session likely expired`);
      return NextResponse.json({
        error: 'BFF session expired. Please re-login to Kaspi Cabinet in Settings → Kaspi, then retry.',
        hint: 'The first test request returned no data, indicating the session cookie is no longer valid.',
        total: toFix.length,
      }, { status: 401 });
    }

    // Тестовый заказ прошёл — сохраняем его и продолжаем с остальными
    await supabase.from('orders').update({ completed_at: testDate }).eq('id', testOrder.id);
    console.log(`BACKFILL: fixed ${testOrder.kaspi_order_id} → ${testDate}`);
    let fixed = 1;
    let failed = 0;
    const remaining = toFix.slice(1);
    const CONCURRENCY = 5;

    // Обрабатываем параллельно с ограничением concurrency
    for (let i = 0; i < remaining.length; i += CONCURRENCY) {
      const chunk = remaining.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        chunk.map(async (order) => {
          try {
            const exactDate = await client.getOrderCompletionDate(order.kaspi_order_id);
            if (exactDate) {
              await supabase.from('orders').update({ completed_at: exactDate }).eq('id', order.id);
              return { success: true, orderId: order.kaspi_order_id, date: exactDate };
            }
            return { success: false, orderId: order.kaspi_order_id, reason: 'no date from BFF' };
          } catch (err) {
            return { success: false, orderId: order.kaspi_order_id, reason: String(err) };
          }
        })
      );

      for (const r of results) {
        if (r.success) {
          fixed++;
          console.log(`BACKFILL: fixed ${r.orderId} → ${r.date}`);
        } else {
          failed++;
          console.log(`BACKFILL: failed ${r.orderId}: ${r.reason}`);
        }
      }
    }

    console.log(`BACKFILL: done. fixed=${fixed}, failed=${failed}, total=${toFix.length}`);

    return NextResponse.json({
      message: `Backfill completed`,
      fixed,
      failed,
      total: toFix.length,
    });
  } catch (error) {
    console.error('BACKFILL error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
