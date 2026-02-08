import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { KaspiAPIClient, kaspiCabinetLogin } from '@/lib/kaspi/api-client';

interface KaspiSession {
  cookies: string;
  merchant_id: string;
  username?: string;
  password?: string;
  created_at?: string;
}

/**
 * Получить свежую сессию: если BFF вернул 401 — автоматически перелогиниться
 */
async function getClientWithAutoRelogin(
  store: { id: string; kaspi_session: unknown; kaspi_merchant_id: string | null },
): Promise<{ client: KaspiAPIClient; merchantId: string } | { error: string; needLogin?: boolean }> {
  const session = store.kaspi_session as KaspiSession | null;

  if (!session?.cookies) {
    return { error: 'Кабинет не подключен', needLogin: true };
  }

  const merchantId = session.merchant_id || store.kaspi_merchant_id || '';
  if (!merchantId) {
    return { error: 'merchantId не найден' };
  }

  return { client: new KaspiAPIClient(session.cookies, merchantId), merchantId };
}

/**
 * При 401 — перелогиниться и вернуть новый клиент
 */
async function reloginAndRetry(
  store: { id: string; kaspi_session: unknown; kaspi_merchant_id: string | null },
): Promise<{ client: KaspiAPIClient; merchantId: string } | null> {
  const session = store.kaspi_session as KaspiSession | null;

  if (!session?.username || !session?.password) {
    console.log('[AutoRelogin] No stored credentials, cannot auto-relogin');
    return null;
  }

  console.log(`[AutoRelogin] Session expired, re-logging in as ${session.username}...`);
  const result = await kaspiCabinetLogin(session.username, session.password);

  if (!result.success || !result.cookies) {
    console.error('[AutoRelogin] Re-login failed:', result.error);
    return null;
  }

  const merchantId = result.merchantId || session.merchant_id || store.kaspi_merchant_id || '';

  // Обновляем cookies в Supabase, сохраняя credentials
  await supabase
    .from('stores')
    .update({
      kaspi_session: {
        cookies: result.cookies,
        merchant_id: merchantId,
        created_at: new Date().toISOString(),
        username: session.username,
        password: session.password,
      },
    })
    .eq('id', store.id);

  console.log('[AutoRelogin] Re-login successful, cookies updated');
  return { client: new KaspiAPIClient(result.cookies, merchantId), merchantId };
}

/**
 * GET /api/kaspi/cabinet/products?userId=xxx&page=0&limit=50
 * Получить товары из Kaspi кабинета
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');
    const activeParam = searchParams.get('active');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId обязателен',
      }, { status: 400 });
    }

    const storeResult = await supabase
      .from('stores')
      .select('id, kaspi_session, kaspi_merchant_id')
      .eq('user_id', userId)
      .single();
    const store = storeResult.data;

    if (!store) {
      return NextResponse.json({
        success: false,
        error: 'Магазин не найден',
      }, { status: 404 });
    }

    const clientResult = await getClientWithAutoRelogin(store);
    if ('error' in clientResult) {
      return NextResponse.json({
        success: false,
        error: clientResult.error,
        needLogin: clientResult.needLogin,
      });
    }

    let { client } = clientResult;
    const activeOnly = activeParam === 'true' ? true : activeParam === 'false' ? false : undefined;

    // Загружаем ВСЕ товары за один запрос (обычно ≤200 — BFF справляется)
    let allProducts;

    try {
      const result = await client.getProductsPage(0, 100, activeOnly);
      allProducts = result.products;
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';

      if (msg.includes('401')) {
        const reloginResult = await reloginAndRetry(store);
        if (!reloginResult) {
          return NextResponse.json({
            success: false,
            error: 'Сессия истекла. Войдите заново.',
            needLogin: true,
          });
        }

        client = reloginResult.client;
        const retryResult = await client.getProductsPage(0, 100, activeOnly);
        allProducts = retryResult.products;
      } else {
        throw error;
      }
    }

    // Считаем статистику по ВСЕМ товарам
    const stats = {
      inStock: allProducts.filter(p => p.stock > 0 || !p.stockSpecified).length,
      notSpecified: allProducts.filter(p => !p.stockSpecified).length,
      lowStock: allProducts.filter(p => p.stock > 0 && p.stock < 5 && p.stockSpecified !== false).length,
    };

    // Отдаём ВСЕ товары — сортировка/пагинация на клиенте
    return NextResponse.json({
      success: true,
      products: allProducts,
      total: allProducts.length,
      stats,
    });
  } catch (error) {
    console.error('Cabinet products error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}

/**
 * PATCH /api/kaspi/cabinet/products
 * Обновить цену/остатки/предзаказ товара
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId обязателен',
      }, { status: 400 });
    }

    const storeResult2 = await supabase
      .from('stores')
      .select('id, kaspi_session, kaspi_merchant_id')
      .eq('user_id', userId)
      .single();
    const store = storeResult2.data;

    if (!store) {
      return NextResponse.json({
        success: false,
        error: 'Магазин не найден',
      }, { status: 404 });
    }

    const clientResult = await getClientWithAutoRelogin(store);
    if ('error' in clientResult) {
      return NextResponse.json({
        success: false,
        error: clientResult.error,
        needLogin: clientResult.needLogin,
      });
    }

    const { client } = clientResult;

    // Новый формат: прямое обновление через pricefeed API
    if (body.sku && body.model) {
      const result = await client.updateProduct({
        sku: body.sku,
        model: body.model,
        availabilities: body.availabilities || [],
        cityPrices: body.cityPrices,
      });
      return NextResponse.json(result);
    }

    // Batch обновление
    if (body.products && Array.isArray(body.products)) {
      const result = await client.updateProductsBatch(body.products);
      return NextResponse.json(result);
    }

    return NextResponse.json({
      success: false,
      error: 'Нужен sku+model или products[] для обновления',
    }, { status: 400 });
  } catch (error) {
    console.error('Cabinet products PATCH error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}
