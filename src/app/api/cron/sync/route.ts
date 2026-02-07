import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const maxDuration = 300; // 5 мин макс для cron
export const dynamic = 'force-dynamic';

// GET — вызывается Vercel Cron каждый час
export async function GET(request: NextRequest) {
  // Проверяем CRON_SECRET (защита от внешних вызовов)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Получаем все магазины с подключённым Kaspi
    const { data: stores } = await supabase
      .from('stores')
      .select('user_id, kaspi_merchant_id')
      .not('kaspi_api_key', 'is', null)
      .not('kaspi_merchant_id', 'is', null);

    if (!stores || stores.length === 0) {
      return NextResponse.json({ message: 'No stores to sync', synced: 0 });
    }

    const results: { userId: string; success: boolean; error?: string }[] = [];

    for (const store of stores) {
      try {
        // Вызываем существующий sync endpoint
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000';

        const res = await fetch(`${baseUrl}/api/kaspi/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: store.user_id }),
        });

        const data = await res.json();
        results.push({ userId: store.user_id, success: data.success });
      } catch (err) {
        results.push({
          userId: store.user_id,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    console.log(`CRON SYNC: synced ${results.filter(r => r.success).length}/${stores.length} stores`);

    return NextResponse.json({
      message: 'Cron sync completed',
      synced: results.filter(r => r.success).length,
      total: stores.length,
      results,
    });
  } catch (error) {
    console.error('CRON SYNC error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
