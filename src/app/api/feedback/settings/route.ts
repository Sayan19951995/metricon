import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth, requireRole } from '@/lib/api-auth';

// GET — получить настройки обратной связи + статистику
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const userId = authResult.user.id;

    const auth = await requireRole(userId, ['owner', 'admin']);
    if ('error' in auth) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 403 });
    }

    // Настройки
    const { data: settings } = await supabaseAdmin
      .from('feedback_settings')
      .select('*')
      .eq('store_id', auth.store.id)
      .single();

    // Статистика
    const { count: totalSent } = await supabaseAdmin
      .from('feedback_queue')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', auth.store.id)
      .in('status', ['poll_sent', 'positive', 'negative', 'expired']);

    const { count: positive } = await supabaseAdmin
      .from('feedback_queue')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', auth.store.id)
      .eq('status', 'positive');

    const { count: negative } = await supabaseAdmin
      .from('feedback_queue')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', auth.store.id)
      .eq('status', 'negative');

    const { count: pending } = await supabaseAdmin
      .from('feedback_queue')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', auth.store.id)
      .eq('status', 'pending');

    const { count: reviewsSent } = await supabaseAdmin
      .from('feedback_queue')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', auth.store.id)
      .eq('review_links_sent', true);

    return NextResponse.json({
      success: true,
      data: {
        settings: settings || {
          enabled: false,
          delay_minutes: 10,
          poll_question: 'Как вам заказ? Оцените пожалуйста',
          good_option: 'Отлично',
          bad_option: 'Плохо',
          good_response: 'Спасибо! Будем рады, если оставите отзыв:',
          bad_response: 'Нам жаль это слышать. Расскажите, что случилось?',
          expire_hours: 24,
        },
        stats: {
          totalSent: totalSent || 0,
          positive: positive || 0,
          negative: negative || 0,
          pending: pending || 0,
          reviewsSent: reviewsSent || 0,
          responseRate: totalSent ? Math.round(((positive || 0) + (negative || 0)) / totalSent * 100) : 0,
        },
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}

// PUT — обновить настройки
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const userId = authResult.user.id;

    const body = await request.json();
    const { userId: _ignoredUserId, ...settings } = body;

    const auth = await requireRole(userId, ['owner', 'admin']);
    if ('error' in auth) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('feedback_settings')
      .upsert({
        store_id: auth.store.id,
        ...settings,
      }, { onConflict: 'store_id' })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}
