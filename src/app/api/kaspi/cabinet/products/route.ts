import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { KaspiAPIClient } from '@/lib/kaspi/api-client';

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

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId обязателен',
      }, { status: 400 });
    }

    // Получаем магазин и сессию
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

    const session = store.kaspi_session as {
      cookies: string;
      merchant_id: string;
    } | null;

    if (!session?.cookies) {
      return NextResponse.json({
        success: false,
        error: 'Кабинет не подключен',
        needLogin: true,
      });
    }

    const merchantId = session.merchant_id || store.kaspi_merchant_id;
    if (!merchantId) {
      return NextResponse.json({
        success: false,
        error: 'merchantId не найден',
      }, { status: 400 });
    }

    const client = new KaspiAPIClient(session.cookies, merchantId);

    // Получаем количество и страницу товаров
    const [products, total] = await Promise.all([
      client.getProductsPage(page, limit),
      client.getProductsCount(),
    ]);

    return NextResponse.json({
      success: true,
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Cabinet products error:', error);

    // Если 401/403 — сессия истекла
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('401') || msg.includes('403')) {
      return NextResponse.json({
        success: false,
        error: 'Сессия истекла',
        needLogin: true,
      });
    }

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

    // Получаем магазин и сессию
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

    const session = store.kaspi_session as {
      cookies: string;
      merchant_id: string;
    } | null;

    if (!session?.cookies) {
      return NextResponse.json({
        success: false,
        error: 'Кабинет не подключен',
        needLogin: true,
      });
    }

    const merchantId = session.merchant_id || store.kaspi_merchant_id;
    const client = new KaspiAPIClient(session.cookies, merchantId);

    const results: Record<string, boolean> = {};

    // Обновляем цену
    if (price !== undefined && price !== null) {
      try {
        await client.updateProductPrice(offerId, price);
        results.price = true;
      } catch (err) {
        console.error('Price update error:', err);
        results.price = false;
      }
    }

    // Обновляем остатки
    if (stock !== undefined && stock !== null) {
      try {
        // stock может быть массивом availabilities или простым числом
        if (Array.isArray(stock)) {
          await client.updateProductStock(offerId, stock);
        } else {
          // Если передано простое число — обновляем все точки одинаково
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

    // Обновляем предзаказ
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
