import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { KaspiAPIClient } from '@/lib/kaspi/api-client';

interface KaspiSession {
  cookies: string;
  merchant_id: string;
}

/** Получить store_id по userId */
async function getStoreId(userId: string): Promise<string | null> {
  const result = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', userId)
    .single();
  const data = result.data;
  return data?.id || null;
}

/**
 * GET /api/kaspi/cabinet/feed?userId=xxx
 * Получить настройки автозагрузки
 */
export async function GET(request: NextRequest) {
  try {
    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    }

    const storeId = await getStoreId(userId);
    if (!storeId) {
      return NextResponse.json({ success: false, error: 'Store not found' }, { status: 404 });
    }

    const feedResult = await supabase
      .from('pricelist_feeds')
      .select('feed_token, auth_login, auth_password, preorder_overrides, enabled, cached_at')
      .eq('store_id', storeId)
      .single();
    const feed = feedResult.data;

    return NextResponse.json({
      success: true,
      feed: feed || null,
    });
  } catch (error) {
    console.error('[Feed settings] GET error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/kaspi/cabinet/feed
 * Создать или обновить настройки автозагрузки + автоматически зарегистрировать URL в Kaspi
 * Body: { userId, authLogin?, authPassword?, enabled?, feedUrl? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, authLogin, authPassword, enabled, feedUrl } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    }

    const storeId = await getStoreId(userId);
    if (!storeId) {
      return NextResponse.json({ success: false, error: 'Store not found' }, { status: 404 });
    }

    // Проверяем существует ли фид
    const existingResult = await supabase
      .from('pricelist_feeds')
      .select('id, feed_token')
      .eq('store_id', storeId)
      .single();
    const existing = existingResult.data;

    let feedToken: string | undefined;

    if (existing) {
      // Обновляем
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (authLogin !== undefined) updates.auth_login = authLogin || null;
      if (authPassword !== undefined) updates.auth_password = authPassword || null;
      if (enabled !== undefined) updates.enabled = enabled;

      await supabase.from('pricelist_feeds')
        .update(updates)
        .eq('id', existing.id);

      feedToken = existing.feed_token;
    } else {
      // Создаём новый фид
      const newFeedResult = await supabase.from('pricelist_feeds')
        .insert({
          store_id: storeId,
          auth_login: authLogin || null,
          auth_password: authPassword || null,
          enabled: enabled !== false,
        })
        .select('feed_token')
        .single();
      const newFeed = newFeedResult.data;
      const newFeedError = newFeedResult.error;

      if (newFeedError) {
        console.error('[Feed settings] Create error:', newFeedError);
        return NextResponse.json({ success: false, error: 'Failed to create feed' }, { status: 500 });
      }

      feedToken = newFeed?.feed_token;
    }

    // Авто-регистрация URL в Kaspi кабинете
    let registration: { success: boolean; error?: string; endpoint?: string } | null = null;

    if (enabled && feedToken) {
      // Определяем URL фида
      const resolvedFeedUrl = feedUrl || (feedToken ? `/api/kaspi/feed?token=${feedToken}` : null);

      if (resolvedFeedUrl) {
        try {
          // Получаем сессию Kaspi для этого магазина
          const storeForRegResult = await supabase
            .from('stores')
            .select('kaspi_session, kaspi_merchant_id')
            .eq('id', storeId)
            .single();
          const storeForReg = storeForRegResult.data;

          const session = storeForReg?.kaspi_session as KaspiSession | null;
          if (session?.cookies) {
            const merchantId = session.merchant_id || storeForReg?.kaspi_merchant_id || '';
            const client = new KaspiAPIClient(session.cookies, merchantId);
            registration = await client.registerAutoLoadUrl(
              resolvedFeedUrl,
              authLogin || undefined,
              authPassword || undefined,
            );
            console.log('[Feed] Auto-registration result:', registration);
          } else {
            registration = { success: false, error: 'Нет активной сессии Kaspi кабинета' };
          }
        } catch (err) {
          console.error('[Feed] Auto-registration error:', err);
          registration = { success: false, error: err instanceof Error ? err.message : 'Ошибка регистрации' };
        }
      }
    }

    return NextResponse.json({
      success: true,
      feedToken,
      registration,
    });
  } catch (error) {
    console.error('[Feed settings] POST error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/kaspi/cabinet/feed
 * Сохранить preorder overrides + опционально перегенерировать кэш XML
 * Body: { userId, preorderOverrides?: { sku: days }, regenerate?: boolean }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, preorderOverrides, regenerate } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    }

    const storeId = await getStoreId(userId);
    if (!storeId) {
      return NextResponse.json({ success: false, error: 'Store not found' }, { status: 404 });
    }

    // Сохраняем overrides
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (preorderOverrides !== undefined) {
      updates.preorder_overrides = preorderOverrides || {};
    }

    const { error } = await supabase.from('pricelist_feeds')
      .update(updates)
      .eq('store_id', storeId);

    if (error) {
      console.error('[Feed settings] PATCH error:', error);
      return NextResponse.json({ success: false, error: 'Failed to save' }, { status: 500 });
    }

    // Перегенерация кэша если нужно
    if (regenerate) {
      try {
        const storeForCacheResult = await supabase
          .from('stores')
          .select('kaspi_session, kaspi_merchant_id')
          .eq('id', storeId)
          .single();
        const storeForCache = storeForCacheResult.data;

        const session = storeForCache?.kaspi_session as KaspiSession | null;
        if (session?.cookies) {
          const merchantId = session.merchant_id || storeForCache?.kaspi_merchant_id || '';
          const client = new KaspiAPIClient(session.cookies, merchantId);
          const products = await client.getAllProducts();

          const overrides = (preorderOverrides || {}) as Record<string, number>;
          const overrideMap = new Map<string, Map<string, number>>();
          for (const [sku, days] of Object.entries(overrides)) {
            if (typeof days === 'number' && days > 0) {
              overrideMap.set(sku, new Map([['*', Math.min(days, 30)]]));
            }
          }

          const xml = client.generatePriceListXML(products, overrideMap);

          await supabase.from('pricelist_feeds')
            .update({
              cached_xml: xml,
              cached_at: new Date().toISOString(),
            })
            .eq('store_id', storeId);
        }
      } catch (err) {
        console.error('[Feed settings] Cache regeneration failed:', err);
        // Не блокируем — overrides сохранены, кэш обновится при следующем запросе Kaspi
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Feed settings] PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
