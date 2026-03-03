/**
 * Vercel Cron: проверка истёкших пробных периодов.
 * Запускается ежедневно в 3:00 UTC.
 *
 * Находит подписки status='trial' с end_date < now
 * и возвращает их на бесплатный plan='start'.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function GET(req: NextRequest) {
  // Vercel Cron protection
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    // Находим все истёкшие trial подписки
    const { data: expired, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('id, user_id')
      .eq('status', 'trial')
      .lt('end_date', today);

    if (fetchError) {
      throw fetchError;
    }

    if (!expired || expired.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No expired trials',
        count: 0,
      });
    }

    // Обновляем на бесплатный план
    const ids = expired.map((s: any) => s.id);
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        plan: 'start',
        status: 'active',
        end_date: null,
      })
      .in('id', ids);

    if (updateError) {
      throw updateError;
    }

    console.log(`[check-trials] Expired ${ids.length} trial subscriptions`);

    return NextResponse.json({
      success: true,
      message: `Expired ${ids.length} trials`,
      count: ids.length,
    });
  } catch (error) {
    console.error('[check-trials] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
