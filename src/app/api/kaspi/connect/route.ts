import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createKaspiClient } from '@/lib/kaspi-api';

// POST - подключить Kaspi магазин
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, apiKey, merchantId, storeName } = body;

    if (!userId || !apiKey || !merchantId) {
      return NextResponse.json({
        success: false,
        message: 'Необходимо указать userId, apiKey и merchantId'
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
    const { data: existingStore } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingStore) {
      // Обновляем существующий магазин
      const { error } = await supabase
        .from('stores')
        .update({
          kaspi_api_key: apiKey,
          kaspi_merchant_id: merchantId,
          name: storeName || existingStore.name,
          updated_at: new Date().toISOString()
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
      const { data: newStore, error } = await supabase
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

      if (error) {
        return NextResponse.json({
          success: false,
          message: `Ошибка создания магазина: ${error.message}`
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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'Необходимо указать userId'
      }, { status: 400 });
    }

    // Получаем магазин пользователя
    const { data: store, error } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !store) {
      return NextResponse.json({
        connected: false,
        message: 'Магазин не найден'
      });
    }

    if (!store.kaspi_api_key || !store.kaspi_merchant_id) {
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
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'Необходимо указать userId'
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('stores')
      .update({
        kaspi_api_key: null,
        kaspi_merchant_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
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
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}
