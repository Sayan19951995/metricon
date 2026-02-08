import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { checkCabinetSession } from '@/lib/kaspi/api-client';

/**
 * GET /api/kaspi/cabinet/session?userId=xxx
 * Проверить валидность сессии кабинета
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

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
        connected: false,
        error: 'Магазин не найден',
      });
    }

    const session = store.kaspi_session as {
      cookies: string;
      merchant_id: string;
      created_at: string;
      username?: string;
    } | null;

    if (!session?.cookies) {
      return NextResponse.json({
        success: true,
        connected: false,
        message: 'Кабинет не подключен',
      });
    }

    const merchantId = session.merchant_id || store.kaspi_merchant_id || '';
    if (!merchantId) {
      return NextResponse.json({
        success: true,
        connected: false,
        message: 'merchantId не найден',
      });
    }

    // Проверяем валидность cookies
    const valid = await checkCabinetSession(session.cookies, merchantId);

    return NextResponse.json({
      success: true,
      connected: valid,
      merchantId,
      username: session.username || null,
      connectedAt: session.created_at,
      message: valid ? 'Сессия активна' : 'Сессия истекла',
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}

/**
 * DELETE /api/kaspi/cabinet/session?userId=xxx
 * Отключить кабинет (удалить cookies)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId обязателен',
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('stores')
      .update({
        kaspi_session: null,
      })
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Ошибка удаления сессии',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Кабинет отключен',
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}
