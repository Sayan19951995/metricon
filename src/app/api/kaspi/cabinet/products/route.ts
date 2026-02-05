import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
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
  store: { id: string; kaspi_session: unknown; kaspi_merchant_id: string },
): Promise<{ client: KaspiAPIClient; merchantId: string } | { error: string; needLogin?: boolean }> {
  const session = store.kaspi_session as KaspiSession | null;

  if (!session?.cookies) {
    return { error: 'Кабинет не подключен', needLogin: true };
  }

  const merchantId = session.merchant_id || store.kaspi_merchant_id;
  if (!merchantId) {
    return { error: 'merchantId не найден' };
  }

  return { client: new KaspiAPIClient(session.cookies, merchantId), merchantId };
}

/**
 * При 401 — перелогиниться и вернуть новый клиент
 */
async function reloginAndRetry(
  store: { id: string; kaspi_session: unknown; kaspi_merchant_id: string },
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

  const merchantId = result.merchantId || session.merchant_id || store.kaspi_merchant_id;

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

    const { data: store } = await supabase
      .from('stores')
      .select('id, kaspi_session, kaspi_merchant_id')
      .eq('user_id', userId)
      .single();

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
    const { userId, offerId, price, stock, preorder } = body;

    if (!userId || !offerId) {
      return NextResponse.json({
        success: false,
        error: 'userId и offerId обязательны',
      }, { status: 400 });
    }

    const { data: store } = await supabase
      .from('stores')
      .select('id, kaspi_session, kaspi_merchant_id')
      .eq('user_id', userId)
      .single();

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

    const results: Record<string, boolean> = {};

    if (price !== undefined && price !== null) {
      try {
        await client.updateProductPrice(offerId, price);
        results.price = true;
      } catch (err) {
        console.error('Price update error:', err);
        results.price = false;
      }
    }

    if (stock !== undefined && stock !== null) {
      try {
        if (Array.isArray(stock)) {
          await client.updateProductStock(offerId, stock);
        } else {
          await client.updateProductStock(offerId, [
            { storeId: 'default', stockCount: stock },
          ]);
        }
        results.stock = true;
      } catch (err) {
        console.error('Stock update error:', err);
        results.stock = false;
      }
    }

    if (preorder !== undefined) {
      try {
        await client.updatePreorder(offerId, preorder);
        results.preorder = true;
      } catch (err) {
        console.error('Preorder update error:', err);
        results.preorder = false;
      }
    }

    const allSuccess = Object.values(results).every(v => v);

    return NextResponse.json({
      success: allSuccess,
      results,
      message: allSuccess ? 'Обновлено' : 'Некоторые операции не удались',
    });
  } catch (error) {
    console.error('Cabinet products PATCH error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}
