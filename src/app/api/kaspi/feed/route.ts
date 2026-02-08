import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { KaspiAPIClient } from '@/lib/kaspi/api-client';

interface KaspiSession {
  cookies: string;
  merchant_id: string;
}

/**
 * GET /api/kaspi/feed?token=UUID
 *
 * Публичный эндпоинт для автозагрузки прайс-листа Kaspi.
 * Kaspi периодически запрашивает этот URL и получает актуальный XML.
 *
 * - token — уникальный идентификатор фида (генерируется при включении)
 * - Поддерживает Basic Auth (если настроен)
 * - Генерирует XML из BFF данных с учётом preorder overrides
 * - При ошибке BFF отдаёт кэшированный XML
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return new NextResponse('Missing token parameter', { status: 400 });
    }

    // Ищем фид по токену
    const feedResult = await supabase
      .from('pricelist_feeds')
      .select('*')
      .eq('feed_token', token)
      .eq('enabled', true)
      .single();
    const feed = feedResult.data;

    if (!feed) {
      return new NextResponse('Feed not found or disabled', { status: 404 });
    }

    // Проверяем Basic Auth если настроен
    if (feed.auth_login && feed.auth_password) {
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Basic ')) {
        return new NextResponse('Unauthorized', {
          status: 401,
          headers: { 'WWW-Authenticate': 'Basic realm="Kaspi Price List"' },
        });
      }

      const decoded = Buffer.from(authHeader.slice(6), 'base64').toString();
      const colonIdx = decoded.indexOf(':');
      const login = decoded.substring(0, colonIdx);
      const password = decoded.substring(colonIdx + 1);

      if (login !== feed.auth_login || password !== feed.auth_password) {
        return new NextResponse('Invalid credentials', {
          status: 401,
          headers: { 'WWW-Authenticate': 'Basic realm="Kaspi Price List"' },
        });
      }
    }

    // Получаем магазин
    const storeResult = await supabase
      .from('stores')
      .select('id, kaspi_session, kaspi_merchant_id')
      .eq('id', feed.store_id)
      .single();
    const store = storeResult.data;

    if (!store) {
      return new NextResponse('Store not found', { status: 404 });
    }

    const session = store.kaspi_session as KaspiSession | null;

    // Пытаемся сгенерировать свежий XML из BFF
    if (session?.cookies) {
      try {
        const merchantId = session.merchant_id || store.kaspi_merchant_id || '';
        const client = new KaspiAPIClient(session.cookies, merchantId);
        const products = await client.getAllProducts();

        // Применяем preorder overrides
        const overrides = (feed.preorder_overrides || {}) as Record<string, number>;
        const overrideMap = new Map<string, Map<string, number>>();
        for (const [sku, days] of Object.entries(overrides)) {
          if (typeof days === 'number' && days > 0) {
            overrideMap.set(sku, new Map([['*', Math.min(days, 30)]]));
          }
        }

        const xml = client.generatePriceListXML(products, overrideMap);

        // Кэшируем для fallback
        await supabase
          .from('pricelist_feeds')
          .update({
            cached_xml: xml,
            cached_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', feed.id);

        return new NextResponse(xml, {
          headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        });
      } catch (err) {
        console.error('[Feed] BFF error, falling back to cache:', err);
      }
    }

    // Fallback — отдаём кэшированный XML
    if (feed.cached_xml) {
      return new NextResponse(feed.cached_xml, {
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      });
    }

    return new NextResponse('Price list not available. Connect Kaspi cabinet first.', { status: 503 });
  } catch (error) {
    console.error('[Feed] Error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
