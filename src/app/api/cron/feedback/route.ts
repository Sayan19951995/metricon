/**
 * Vercel Cron: обработка очереди обратной связи.
 * Запускается каждые 5 минут.
 *
 * 1. Находит pending записи в feedback_queue где scheduled_at <= now
 * 2. Отправляет WhatsApp опросы через WA микросервис
 * 3. Истекает старые неотвеченные опросы
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { waSendPoll } from '@/lib/whatsapp/client';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function GET(req: NextRequest) {
  // Vercel Cron protection
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow in development without CRON_SECRET
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const now = new Date().toISOString();
    let sentCount = 0;
    let failedCount = 0;
    let expiredCount = 0;

    // === 1. Find pending polls ready to send ===
    const { data: pendingEntries } = await supabaseAdmin
      .from('feedback_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', now)
      .limit(50);

    if (pendingEntries && pendingEntries.length > 0) {
      // Group by store_id for efficient settings lookup
      const byStore = new Map<string, typeof pendingEntries>();
      for (const entry of pendingEntries) {
        const storeEntries = byStore.get(entry.store_id) || [];
        storeEntries.push(entry);
        byStore.set(entry.store_id, storeEntries);
      }

      for (const [storeId, entries] of byStore) {
        // Check if WhatsApp is connected
        const { data: store } = await supabaseAdmin
          .from('stores')
          .select('whatsapp_connected')
          .eq('id', storeId)
          .single();

        if (!store?.whatsapp_connected) {
          console.log(`[Cron/Feedback] Store ${storeId} WA not connected, skipping ${entries.length} entries`);
          continue;
        }

        // Load feedback settings
        const { data: settings } = await supabaseAdmin
          .from('feedback_settings')
          .select('*')
          .eq('store_id', storeId)
          .single();

        if (!settings?.enabled) {
          console.log(`[Cron/Feedback] Store ${storeId} feedback disabled, skipping`);
          continue;
        }

        const question = settings.poll_question || 'Как вам заказ?';
        const options = [
          settings.good_option || 'Отлично',
          settings.bad_option || 'Плохо',
        ];

        // Send polls
        for (const entry of entries) {
          try {
            const result = await waSendPoll(storeId, entry.customer_phone, question, options);

            if (result.success) {
              await supabaseAdmin
                .from('feedback_queue')
                .update({
                  status: 'poll_sent',
                  poll_message_id: result.messageId || null,
                  poll_sent_at: new Date().toISOString(),
                } as any)
                .eq('id', entry.id);

              sentCount++;
            } else {
              await supabaseAdmin
                .from('feedback_queue')
                .update({ status: 'failed' } as any)
                .eq('id', entry.id);

              failedCount++;
            }
          } catch (err) {
            console.error(`[Cron/Feedback] Send poll error for ${entry.customer_phone}:`, err);
            failedCount++;
          }

          // Small delay between messages to avoid spam
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
    }

    // === 2. Expire old unanswered polls ===
    // Load distinct expire_hours per store
    const { data: allSettings } = await supabaseAdmin
      .from('feedback_settings')
      .select('store_id, expire_hours');

    if (allSettings) {
      for (const s of allSettings) {
        const expireHours = s.expire_hours || 24;
        const cutoff = new Date(Date.now() - expireHours * 60 * 60 * 1000).toISOString();

        const { count } = await supabaseAdmin
          .from('feedback_queue')
          .update({ status: 'expired' } as any)
          .eq('store_id', s.store_id)
          .eq('status', 'poll_sent')
          .lt('poll_sent_at', cutoff)
          .select('*', { count: 'exact', head: true });

        if (count && count > 0) {
          expiredCount += count;
        }
      }
    }

    console.log(`[Cron/Feedback] Done: sent=${sentCount}, failed=${failedCount}, expired=${expiredCount}`);

    return NextResponse.json({
      success: true,
      sent: sentCount,
      failed: failedCount,
      expired: expiredCount,
    });
  } catch (err: any) {
    console.error('[Cron/Feedback] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
