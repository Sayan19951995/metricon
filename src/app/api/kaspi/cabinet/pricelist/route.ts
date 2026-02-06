import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { KaspiAPIClient } from '@/lib/kaspi/api-client';

interface KaspiSession {
  cookies: string;
  merchant_id: string;
}

/**
 * Хелпер: получить store + client
 */
async function getStoreAndClient(userId: string) {
  const { data: store } = await supabase
    .from('stores')
    .select('id, kaspi_session, kaspi_merchant_id, name')
    .eq('user_id', userId)
    .single();

  if (!store) return { error: 'Магазин не найден', status: 404 };

  const session = store.kaspi_session as KaspiSession | null;
  if (!session?.cookies) return { error: 'Кабинет не подключен', status: 401 };

  const merchantId = session.merchant_id || store.kaspi_merchant_id;
  const client = new KaspiAPIClient(session.cookies, merchantId);

  return { store, client, merchantId };
}

/**
 * GET /api/kaspi/cabinet/pricelist?userId=xxx&action=generate|trigger|status
 *
 * action=generate — сгенерировать XML прайс-лист из BFF данных (с preorder overrides)
 * action=trigger  — запустить экспорт на стороне Kaspi
 * action=status   — проверить статус экспорта
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action') || 'generate';

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId обязателен' }, { status: 400 });
    }

    const result = await getStoreAndClient(userId);
    if ('error' in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }
    const { client } = result;

    if (action === 'trigger') {
      const triggerResult = await client.triggerPriceListExport('XML');
      return NextResponse.json({ success: triggerResult.triggered, ...triggerResult });
    }

    if (action === 'status') {
      const statusResult = await client.checkExportStatus();
      return NextResponse.json({ success: true, ...statusResult });
    }

    return NextResponse.json({ success: false, error: `Неизвестное действие: ${action}` });
  } catch (error) {
    console.error('PriceList error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}

/**
 * POST /api/kaspi/cabinet/pricelist
 * Сгенерировать XML прайс-лист с preorder overrides
 *
 * Body: {
 *   userId: string,
 *   overrides?: { [sku: string]: number },  // sku → preorder days (для всех складов)
 *   action?: 'generate' | 'upload'
 * }
 *
 * action=generate (default) — возвращает XML файл
 * action=upload — генерирует XML и загружает в Kaspi
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, overrides, action = 'generate' } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId обязателен' }, { status: 400 });
    }

    const result = await getStoreAndClient(userId);
    if ('error' in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }
    const { client } = result;

    // Получаем товары
    const products = await client.getAllProducts();

    // Конвертируем overrides { sku: days } → Map<sku, Map<storeId, days>>
    const overrideMap = new Map<string, Map<string, number>>();
    if (overrides && typeof overrides === 'object') {
      for (const [sku, days] of Object.entries(overrides)) {
        if (typeof days === 'number' && days > 0) {
          overrideMap.set(sku, new Map([['*', Math.min(days, 30)]]));
        }
      }
    }

    // Генерируем XML
    const xml = client.generatePriceListXML(products, overrideMap);

    // Сохраняем overrides и кэш в pricelist_feeds (если фид существует)
    if (overrides && Object.keys(overrides).length > 0) {
      await supabase
        .from('pricelist_feeds')
        .update({
          preorder_overrides: overrides,
          cached_xml: xml,
          cached_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('store_id', result.store.id);
    }

    if (action === 'upload') {
      const uploadResult = await client.uploadPriceList(xml);
      return NextResponse.json({
        success: uploadResult.success,
        error: uploadResult.error,
        productsCount: products.length,
      });
    }

    // Возвращаем XML как скачиваемый файл
    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="pricelist_${result.merchantId}.xml"`,
      },
    });
  } catch (error) {
    console.error('PriceList POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}

