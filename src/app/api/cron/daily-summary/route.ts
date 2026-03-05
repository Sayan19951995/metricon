import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/api-auth';
import { waSendMessage } from '@/lib/whatsapp/client';
import { KaspiMarketingClient, MarketingSession } from '@/lib/kaspi/marketing-client';

const KZ_OFFSET = 5 * 3600000; // UTC+5

function kzDaysAgo(days: number): string {
  const kzNow = new Date(Date.now() + KZ_OFFSET);
  const d = new Date(kzNow.getTime() - days * 86400000);
  return d.toISOString().split('T')[0];
}

function formatMoney(n: number): string {
  return Math.round(n).toLocaleString('ru-RU');
}

/**
 * GET /api/cron/daily-summary
 * Ежедневная сводка по WhatsApp: продажи, выручка, реклама.
 * Запускается в 9:00 по Казахстану (4:00 UTC).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get stores with WhatsApp connected
    const { data: stores } = await supabaseAdmin
      .from('stores')
      .select('id, user_id, name, whatsapp_connected, marketing_session')
      .eq('whatsapp_connected', true);

    if (!stores || stores.length === 0) {
      return NextResponse.json({ success: true, message: 'No stores' });
    }

    const yesterday = kzDaysAgo(1);
    let sent = 0;

    for (const store of stores) {
      try {
        // Get owner phone
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('phone')
          .eq('id', store.user_id)
          .single();

        const phone = (user as any)?.phone;
        if (!phone) continue;

        const cleanPhone = phone.replace(/\D/g, '');
        const waPhone = cleanPhone.startsWith('8') ? '7' + cleanPhone.slice(1) : cleanPhone;

        // Get yesterday's sales
        const { data: dailyData } = await supabaseAdmin
          .from('daily_stats')
          .select('revenue, orders_count, cost, profit')
          .eq('store_id', store.id)
          .eq('date', yesterday)
          .single();

        const revenue = Number(dailyData?.revenue) || 0;
        const ordersCount = Number(dailyData?.orders_count) || 0;
        const profit = Number(dailyData?.profit) || 0;

        // Get yesterday's ad data (if marketing connected)
        let adCost = 0;
        let adTransactions = 0;
        let adGmv = 0;

        const marketingSession = store.marketing_session as MarketingSession | null;
        if (marketingSession?.user_token) {
          try {
            const client = new KaspiMarketingClient(marketingSession);
            const campaigns = await client.getCampaigns(yesterday, yesterday);
            const summary = KaspiMarketingClient.aggregateCampaigns(campaigns);
            adCost = summary.totalCost;
            adTransactions = summary.totalTransactions;
            adGmv = summary.totalGmv;
          } catch (e) {
            console.error(`[DailySummary] Marketing error for ${store.id}:`, e);
          }
        }

        // Build message
        const storeName = store.name || 'Ваш магазин';
        let message = `📈 *${storeName}* — сводка за вчера\n\n`;
        message += `🛒 Продажи: ${ordersCount} заказов\n`;
        message += `💰 Выручка: ${formatMoney(revenue)} ₸\n`;

        if (profit > 0) {
          message += `📊 Прибыль: ${formatMoney(profit)} ₸\n`;
        }

        if (adCost > 0 || adTransactions > 0) {
          message += `\n📣 *Реклама:*\n`;
          message += `  Расходы: ${formatMoney(adCost)} ₸\n`;
          message += `  Продажи с рекламы: ${adTransactions} заказов\n`;
          if (adGmv > 0) {
            message += `  Выручка с рекламы: ${formatMoney(adGmv)} ₸\n`;
            const roas = adCost > 0 ? (adGmv / adCost).toFixed(1) : '—';
            message += `  ROAS: ${roas}x\n`;
          }
        }

        message += `\nПодробнее: metricon.kz/app/analytics`;

        const ok = await waSendMessage(store.id, waPhone, message);
        if (ok) sent++;

      } catch (err) {
        console.error(`[DailySummary] Error for store ${store.id}:`, err);
      }
    }

    return NextResponse.json({ success: true, checked: stores.length, sent });
  } catch (error) {
    console.error('[DailySummary] Cron error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
