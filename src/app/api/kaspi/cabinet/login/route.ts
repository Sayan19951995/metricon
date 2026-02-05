import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { kaspiCabinetLogin } from '@/lib/kaspi/api-client';

/**
 * POST /api/kaspi/cabinet/login
 *
 * Логин в Kaspi Merchant Cabinet по username/password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, username, password } = body;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId обязателен',
      }, { status: 400 });
    }

    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: 'Введите логин и пароль',
      }, { status: 400 });
    }

    // Получаем магазин пользователя
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, kaspi_merchant_id')
      .eq('user_id', userId)
      .single();

    if (storeError || !store) {
      return NextResponse.json({
        success: false,
        error: 'Магазин не найден. Сначала подключите Kaspi API.',
      }, { status: 404 });
    }

    // Логин по username/password
    const result = await kaspiCabinetLogin(username, password);

    if (!result.success || !result.cookies) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Неверный логин или пароль',
      });
    }

    const merchantId = result.merchantId || store.kaspi_merchant_id || '';

    // Сохраняем сессию в Supabase
    const { error: updateError } = await supabase
      .from('stores')
      .update({
        kaspi_session: {
          cookies: result.cookies,
          merchant_id: merchantId,
          created_at: new Date().toISOString(),
          username: username,
          password: password,
        },
      })
      .eq('id', store.id);

    if (updateError) {
      console.error('Error saving session:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Ошибка сохранения сессии',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      merchantId,
      message: 'Кабинет Kaspi подключен',
    });
  } catch (error) {
    console.error('Cabinet login error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}
