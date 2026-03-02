import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '@/lib/api-auth';
import { createKaspiClient } from '@/lib/kaspi-api';
import { OrderState } from '@/types/kaspi';

// GET - получить заказы из Kaspi
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '0');
    const size = parseInt(searchParams.get('size') || '20');
    const state = searchParams.get('state') as OrderState | null;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Получаем магазин пользователя
    const storeResult = await supabaseAdmin
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .single();
    const store = storeResult.data;
    const storeError = storeResult.error;

    if (storeError || !store || !store.kaspi_api_key || !store.kaspi_merchant_id) {
      return NextResponse.json({
        success: false,
        message: 'Kaspi не подключен'
      }, { status: 400 });
    }

    // Получаем заказы из Kaspi
    const kaspiClient = createKaspiClient(store.kaspi_api_key, store.kaspi_merchant_id);

    const params: any = { page, size };
    if (state) params.state = state;
    if (dateFrom) params.dateFrom = parseInt(dateFrom);
    if (dateTo) params.dateTo = parseInt(dateTo);

    const result = await kaspiClient.getOrders(params);

    return NextResponse.json({
      success: true,
      orders: result.orders,
      totalPages: result.totalPages,
      totalElements: result.totalElements,
      page,
      size
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

// PATCH - обновить статус заказа
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    const body = await request.json();
    const { orderId, newState, reason } = body;

    if (!orderId || !newState) {
      return NextResponse.json({
        success: false,
        message: 'Необходимо указать orderId и newState'
      }, { status: 400 });
    }

    // Получаем магазин пользователя
    const storeResult2 = await supabaseAdmin
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .single();
    const store2 = storeResult2.data;
    const storeError2 = storeResult2.error;

    if (storeError2 || !store2 || !store2.kaspi_api_key || !store2.kaspi_merchant_id) {
      return NextResponse.json({
        success: false,
        message: 'Kaspi не подключен'
      }, { status: 400 });
    }

    // Обновляем статус в Kaspi
    const kaspiClient = createKaspiClient(store2.kaspi_api_key, store2.kaspi_merchant_id);
    const success = await kaspiClient.updateOrderStatus(orderId, newState, reason);

    if (!success) {
      return NextResponse.json({
        success: false,
        message: 'Не удалось обновить статус заказа'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Статус заказа обновлен'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}
