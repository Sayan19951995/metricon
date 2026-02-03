import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { kaspiCabinetLogin, checkCabinetSession } from '@/lib/kaspi/api-client';

/**
 * POST /api/kaspi/cabinet/login
 *
 * Два режима:
 * 1. Автоматический логин (username + password)
 * 2. Ручной ввод cookies (cookies + merchantId)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, username, password, cookies: manualCookies, merchantId: manualMerchantId } = body;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId обязателен',
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

    let sessionCookies: string;
    let merchantId: string;

    // Режим 1: Ручные cookies
    if (manualCookies) {
      const mid = manualMerchantId || store.kaspi_merchant_id;
      if (!mid) {
        return NextResponse.json({
          success: false,
          error: 'merchantId не указан',
        }, { status: 400 });
      }

      // Проверяем валидность
      const valid = await checkCabinetSession(manualCookies, mid);
      if (!valid) {
        return NextResponse.json({
          success: false,
          error: 'Cookies недействительны или истекли',
        });
      }

      sessionCookies = manualCookies;
      merchantId = mid;
    }
    // Режим 2: Логин по username/password
    else if (username && password) {
      const result = await kaspiCabinetLogin(username, password);

      if (!result.success || !result.cookies) {
        return NextResponse.json({
          success: false,
          error: result.error || 'Не удалось войти',
          needManualCookies: true,
        });
      }

      sessionCookies = result.cookies;
      merchantId = result.merchantId || store.kaspi_merchant_id || '';
    } else {
      return NextResponse.json({
        success: false,
        error: 'Укажите username/password или cookies',
      }, { status: 400 });
    }

    // Сохраняем сессию в Supabase
    const { error: updateError } = await supabase
      .from('stores')
      .update({
        kaspi_session: {
          cookies: sessionCookies,
          merchant_id: merchantId,
          created_at: new Date().toISOString(),
          username: username || null,
        },
        updated_at: new Date().toISOString(),
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
