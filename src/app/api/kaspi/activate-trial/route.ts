import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    // Получаем магазин пользователя
    const { data: store, error: storeError } = await supabaseAdmin
      .from('stores')
      .select('kaspi_merchant_id')
      .eq('user_id', userId)
      .single();

    if (storeError || !store?.kaspi_merchant_id) {
      return NextResponse.json({
        success: false,
        message: 'Сначала подключите Kaspi магазин',
      }, { status: 400 });
    }

    const merchantId = store.kaspi_merchant_id;

    // Проверяем, не использован ли уже пробный период для этого магазина
    const { data: existing } = await supabaseAdmin
      .from('merchant_trials' as any)
      .select('id')
      .eq('kaspi_merchant_id', merchantId)
      .single();

    if (existing) {
      return NextResponse.json({
        success: false,
        message: 'Этот магазин уже использовал бесплатный пробный период',
      }, { status: 409 });
    }

    // Записываем использование пробного периода
    const { error: insertError } = await supabaseAdmin
      .from('merchant_trials' as any)
      .insert({
        kaspi_merchant_id: merchantId,
        used_by_user_id: userId,
      });

    if (insertError) {
      // UNIQUE constraint — кто-то параллельно успел записать
      if (insertError.code === '23505') {
        return NextResponse.json({
          success: false,
          message: 'Этот магазин уже использовал бесплатный пробный период',
        }, { status: 409 });
      }
      throw insertError;
    }

    // Активируем Pro подписку на 14 дней
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 14);

    const { error: subError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        plan: 'pro',
        status: 'trial',
        start_date: new Date().toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      })
      .eq('user_id', userId);

    if (subError) {
      throw subError;
    }

    return NextResponse.json({
      success: true,
      message: 'Пробный период Pro активирован на 14 дней',
      endDate: endDate.toISOString().split('T')[0],
    });
  } catch (error) {
    console.error('Activate trial error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Неизвестная ошибка',
    }, { status: 500 });
  }
}
