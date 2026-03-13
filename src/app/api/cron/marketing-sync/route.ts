import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/api-auth';
import { KaspiMarketingClient, MarketingSession } from '@/lib/kaspi/marketing-client';

/**
 * GET /api/cron/marketing-sync
 * Ежедневный синк маркетинговых данных для всех магазинов у которых есть marketing_session.
 * Запускается в 2:00 UTC (7:00 Алматы) — после полуночи, чтобы вчерашний день был полным.
 *
 * Синкает вчерашний день (1 день) в таблицу marketing_daily.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  // Можно передать ?date=2026-03-12 для ручного запуска за конкретный день
  const { searchParams } = new URL(request.url);
  const targetDate = searchParams.get('date') || dateStr;

  // Можно передать ?days=7 для бэкфилла нескольких дней
  const daysBack = Math.min(parseInt(searchParams.get('days') || '1', 10), 90);

  console.log(`[MarketingSync] Starting sync, targetDate=${targetDate} daysBack=${daysBack}`);

  const { data: stores } = await supabaseAdmin
    .from('stores')
    .select('id, marketing_session')
    .not('marketing_session', 'is', null);

  if (!stores?.length) {
    return NextResponse.json({ success: true, synced: 0, message: 'No stores with marketing session' });
  }

  const results: { storeId: string; dates: string[]; error?: string }[] = [];

  for (const store of stores) {
    const session = store.marketing_session as unknown as MarketingSession;
    if (!session?.merchant_id) continue;

    try {
      // Собираем список дат для синка
      const datesToSync: string[] = [];
      for (let i = 0; i < daysBack; i++) {
        const d = new Date(targetDate);
        d.setUTCDate(d.getUTCDate() - i);
        datesToSync.push(d.toISOString().split('T')[0]);
      }

      let client = new KaspiMarketingClient(session);
      const syncedDates: string[] = [];

      for (const date of datesToSync) {
        try {
          await syncOneDay(client, store.id, date);
          syncedDates.push(date);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          // Auth error → попробуем переподключиться один раз
          if (/HTTP 401|HTTP 403|sign.?in|unauthorized/i.test(msg) && session.username && session.password) {
            console.log(`[MarketingSync] Auth error for store ${store.id}, reconnecting...`);
            try {
              const { session: newSession } = await KaspiMarketingClient.login(session.username, session.password);
              await supabaseAdmin.from('stores').update({ marketing_session: JSON.parse(JSON.stringify(newSession)) }).eq('id', store.id);
              client = new KaspiMarketingClient(newSession);
              await syncOneDay(client, store.id, date);
              syncedDates.push(date);
            } catch (reconnErr) {
              console.error(`[MarketingSync] Reconnect failed for store ${store.id}:`, reconnErr);
              break; // Skip remaining dates for this store
            }
          } else {
            console.error(`[MarketingSync] Failed date ${date} for store ${store.id}:`, msg);
            // Non-auth error (e.g. Kaspi server error) — log and continue
          }
        }
      }

      results.push({ storeId: store.id, dates: syncedDates });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[MarketingSync] Store ${store.id} failed:`, msg);
      results.push({ storeId: store.id, dates: [], error: msg });
    }
  }

  const totalSynced = results.reduce((s, r) => s + r.dates.length, 0);
  console.log(`[MarketingSync] Done: ${totalSynced} day-records synced across ${results.length} stores`);

  return NextResponse.json({ success: true, synced: totalSynced, results });
}

async function syncOneDay(client: KaspiMarketingClient, storeId: string, date: string) {
  const [campaignsRes, extRes, sellerRes, reviewRes] = await Promise.allSettled([
    client.getCampaigns(date, date),
    client.getExternalCampaigns(date, date),
    client.getSellerBonusesOverview(date, date),
    client.getReviewBonusesOverview(date, date),
  ]);

  const campaigns = campaignsRes.status === 'fulfilled' ? campaignsRes.value : [];
  const summary = KaspiMarketingClient.aggregateCampaigns(campaigns);

  let extCost = 0, extGmv = 0, extTx = 0;
  if (extRes.status === 'fulfilled') {
    for (const c of extRes.value) { extCost += c.cost; extGmv += c.gmv; extTx += c.transactions; }
  }

  const sellerCost = sellerRes.status === 'fulfilled' ? sellerRes.value.cost : 0;
  const sellerGmv = sellerRes.status === 'fulfilled' ? sellerRes.value.gmv : 0;
  const sellerTx = sellerRes.status === 'fulfilled' ? sellerRes.value.transactions : 0;

  const reviewCost = reviewRes.status === 'fulfilled' ? reviewRes.value.cost : 0;

  const totalCost = summary.totalCost + extCost + sellerCost + reviewCost;

  const row = {
    store_id: storeId,
    date,
    product_ads_cost: summary.totalCost,
    product_ads_gmv: summary.totalGmv,
    product_ads_transactions: summary.totalTransactions,
    product_ads_views: summary.totalViews,
    product_ads_clicks: summary.totalClicks,
    external_ads_cost: extCost,
    external_ads_gmv: extGmv,
    external_ads_transactions: extTx,
    seller_bonuses_cost: sellerCost,
    seller_bonuses_gmv: sellerGmv,
    seller_bonuses_transactions: sellerTx,
    review_bonuses_cost: reviewCost,
    total_cost: totalCost,
    synced_at: new Date().toISOString(),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabaseAdmin as any)
    .from('marketing_daily')
    .upsert(row, { onConflict: 'store_id,date' });

  if (error) throw new Error(`DB upsert failed: ${error.message}`);

  console.log(`[MarketingSync] Synced ${date} for store ${storeId}: total_cost=${totalCost}`);
}
