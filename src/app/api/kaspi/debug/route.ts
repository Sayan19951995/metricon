import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createKaspiClient } from '@/lib/kaspi-api';

// GET - диагностика: выгрузить сырые ответы Kaspi API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Получаем магазин
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (storeError || !store || !store.kaspi_api_key || !store.kaspi_merchant_id) {
      return NextResponse.json({ error: 'Kaspi не подключен' }, { status: 400 });
    }

    const kaspiClient = createKaspiClient(store.kaspi_api_key, store.kaspi_merchant_id);

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    // 1. Сырой ответ списка заказов (3 шт)
    const rawOrders = await kaspiClient.fetchRaw(
      `/orders?page[number]=0&page[size]=3&filter[orders][creationDate][$ge]=${weekAgo}&filter[orders][creationDate][$le]=${now}`
    );

    // 2. Для первого заказа - пробуем разные способы получить entries
    const results: any = {
      rawOrdersList: rawOrders,
      entriesAttempts: [],
    };

    if (rawOrders.data && rawOrders.data.length > 0) {
      const firstOrder = rawOrders.data[0];
      const orderId = firstOrder.id;

      // Способ 1: /orders/{id}/entries
      try {
        const entries1 = await kaspiClient.fetchRaw(`/orders/${orderId}/entries`);
        results.entriesAttempts.push({
          method: `/orders/${orderId}/entries`,
          success: true,
          response: entries1,
        });
      } catch (err: any) {
        results.entriesAttempts.push({
          method: `/orders/${orderId}/entries`,
          success: false,
          error: err.message,
        });
      }

      // Способ 2: /orders/{id}?include=entries (попытка include)
      try {
        const entries2 = await kaspiClient.fetchRaw(`/orders/${orderId}?include=entries`);
        results.entriesAttempts.push({
          method: `/orders/${orderId}?include=entries`,
          success: true,
          response: entries2,
        });
      } catch (err: any) {
        results.entriesAttempts.push({
          method: `/orders/${orderId}?include=entries`,
          success: false,
          error: err.message,
        });
      }

      // Способ 3: Проверяем relationships ссылки
      if (firstOrder.relationships) {
        results.orderRelationships = firstOrder.relationships;

        // Пробуем каждую relationship ссылку
        for (const [relName, relData] of Object.entries(firstOrder.relationships)) {
          const rel = relData as any;
          if (rel?.links?.related) {
            try {
              // Relationship link может быть полным URL - извлекаем путь
              let relUrl = rel.links.related;
              if (relUrl.startsWith('http')) {
                relUrl = relUrl.replace('https://kaspi.kz/shop/api/v2', '');
              }
              const relResponse = await kaspiClient.fetchRaw(relUrl);
              results.entriesAttempts.push({
                method: `relationship: ${relName} -> ${rel.links.related}`,
                success: true,
                response: relResponse,
              });
            } catch (err: any) {
              results.entriesAttempts.push({
                method: `relationship: ${relName} -> ${rel.links.related}`,
                success: false,
                error: err.message,
              });
            }
          }
        }
      }

      // Способ 4: Детали одного заказа (полный ответ)
      try {
        const orderDetail = await kaspiClient.fetchRaw(`/orders/${orderId}`);
        results.orderDetail = orderDetail;
      } catch (err: any) {
        results.orderDetailError = err.message;
      }
    }

    return NextResponse.json(results, {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
