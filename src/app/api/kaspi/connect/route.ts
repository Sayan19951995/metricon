import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '@/lib/api-auth';
import { createKaspiClient } from '@/lib/kaspi-api';

// POST - подключить Kaspi магазин
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    const body = await request.json();
    const { apiKey, merchantId, storeName } = body;

    if (!apiKey || !merchantId) {
      return NextResponse.json({
        success: false,
        message: 'Необходимо указать apiKey и merchantId'
      }, { status: 400 });
    }

    // Проверяем подключение к Kaspi
    const kaspiClient = createKaspiClient(apiKey, merchantId);
    const testResult = await kaspiClient.testConnection();

    if (!testResult.success) {
      return NextResponse.json({
        success: false,
        message: `Ошибка подключения к Kaspi: ${testResult.message}`
      }, { status: 400 });
    }

    // Проверяем есть ли уже магазин у пользователя
    const existingStoreResult = await supabaseAdmin
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .single();
    const existingStore = existingStoreResult.data;

    if (existingStore) {
      // Обновляем существующий магазин
      const { error } = await supabaseAdmin.from('stores')
        .update({
          kaspi_api_key: apiKey,
          kaspi_merchant_id: merchantId,
          name: storeName || existingStore.name
        })
        .eq('id', existingStore.id);

      if (error) {
        return NextResponse.json({
          success: false,
          message: `Ошибка обновления магазина: ${error.message}`
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Kaspi магазин успешно подключен',
        store: { ...existingStore, kaspi_merchant_id: merchantId }
      });
    } else {
      // Создаём новый магазин
      const newStoreResult = await supabaseAdmin
        .from('stores')
        .insert({
          user_id: userId,
          name: storeName || 'Мой магазин',
          kaspi_api_key: apiKey,
          kaspi_merchant_id: merchantId,
          whatsapp_connected: false
        })
        .select()
        .single();
      const newStore = newStoreResult.data;
      const newStoreError = newStoreResult.error;

      if (newStoreError) {
        return NextResponse.json({
          success: false,
          message: `Ошибка создания магазина: ${newStoreError.message}`
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Kaspi магазин успешно подключен',
        store: newStore
      });
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

// GET - проверить статус подключения
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    // Получаем магазин пользователя
    const storeResult = await supabaseAdmin
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .single();
    const store = storeResult.data;
    const storeError = storeResult.error;

    if (storeError || !store) {
      return NextResponse.json({
        connected: false,
        message: 'Магазин не найден'
      });
    }

    if (!store.kaspi_api_key?.trim() || !store.kaspi_merchant_id?.trim()) {
      return NextResponse.json({
        connected: false,
        store: {
          id: store.id,
          name: store.name
        },
        message: 'Kaspi не подключен'
      });
    }

    // Проверяем активность подключения
    const kaspiClient = createKaspiClient(store.kaspi_api_key, store.kaspi_merchant_id);
    const testResult = await kaspiClient.testConnection();

    return NextResponse.json({
      connected: testResult.success,
      store: {
        id: store.id,
        name: store.name,
        merchantId: store.kaspi_merchant_id
      },
      message: testResult.success ? 'Подключение активно' : testResult.message
    });

  } catch (error) {
    return NextResponse.json({
      connected: false,
      message: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

// DELETE - отключить Kaspi
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    console.log('DELETE kaspi connect, userId:', userId);

    const { error } = await supabaseAdmin
      .from('stores')
      .update({
        kaspi_api_key: '',
        kaspi_merchant_id: ''
      })
      .eq('user_id', userId);

    if (error) {
      console.error('DELETE error:', error);
      return NextResponse.json({
        success: false,
        message: `Ошибка отключения: ${error.message}`
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Kaspi успешно отключен'
    });

  } catch (error) {
    console.error('DELETE catch error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}
