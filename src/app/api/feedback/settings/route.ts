import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { requireRole } from '@/lib/api-auth';

// GET — получить настройки обратной связи + статистику
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId обязателен' }, { status: 400 });
    }

    const auth = await requireRole(userId, ['owner', 'admin']);
    if ('error' in auth) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 403 });
    }

    // Настройки
    const { data: settings } = await supabase
      .from('feedback_settings')
      .select('*')
      .eq('store_id', auth.store.id)
      .single();

    // Статистика
    const { count: totalSent } = await supabase
      .from('feedback_queue')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', auth.store.id)
      .in('status', ['poll_sent', 'positive', 'negative', 'expired']);

    const { count: positive } = await supabase
      .from('feedback_queue')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', auth.store.id)
      .eq('status', 'positive');

    const { count: negative } = await supabase
      .from('feedback_queue')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', auth.store.id)
      .eq('status', 'negative');

    const { count: pending } = await supabase
      .from('feedback_queue')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', auth.store.id)
      .eq('status', 'pending');

    const { count: reviewsSent } = await supabase
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
    const body = await request.json();
    const { userId, ...settings } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId обязателен' }, { status: 400 });
    }

    const auth = await requireRole(userId, ['owner', 'admin']);
    if ('error' in auth) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 403 });
    }

    const { data, error } = await supabase
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
