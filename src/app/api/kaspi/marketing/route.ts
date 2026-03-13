import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '@/lib/api-auth';
import { KaspiMarketingClient, MarketingSession } from '@/lib/kaspi/marketing-client';

/**
 * POST /api/kaspi/marketing — логин в Kaspi Marketing
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({
        success: false,
        message: 'username и password обязательны'
      }, { status: 400 });
    }

    const { session, loginData } = await KaspiMarketingClient.login(username, password);

    const { error: updateError } = await supabaseAdmin
      .from('stores')
      .update({ marketing_session: JSON.parse(JSON.stringify(session)) })
      .eq('user_id', userId);

    if (updateError) {
      return NextResponse.json({ success: false, message: 'Ошибка сохранения сессии' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        merchantId: session.merchant_id,
        merchantName: session.merchant_name,
        userId: session.marketing_user_id,
        connected: true,
      }
    });

  } catch (error) {
    console.error('Marketing login error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка авторизации'
    }, { status: 500 });
  }
}

/**
 * GET /api/kaspi/marketing — получить данные маркетинга
 *
 * 1. Пробуем получить данные с Kaspi
 * 2. Успех → сохраняем в marketing_daily, возвращаем данные
 * 3. Ошибка → пробуем reconnect (если auth-ошибка), затем читаем из БД
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const storeResult = await supabaseAdmin
      .from('stores')
      .select('id, marketing_session')
      .eq('user_id', userId)
      .single();
    const store = storeResult.data;

    if (!store?.marketing_session) {
      return NextResponse.json({ success: false, message: 'Kaspi Marketing не подключен' }, { status: 400 });
    }

    let session = store.marketing_session as unknown as MarketingSession;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600000);

    const start = startDate || thirtyDaysAgo.toISOString().split('T')[0];
    const end = endDate || todayStr;

    let client = new KaspiMarketingClient(session);

    // ── 1. Получаем данные с Kaspi ───────────────────────────────────────────
    let liveData = await fetchLiveData(client, start, end);

    // ── 2. Если ВСЕ 4 канала упали → сессия не инициализирована или устарела ──
    const allChannelsFailed = liveData.channelErrors.length >= 4 && liveData.summary.totalCost === 0;

    if (allChannelsFailed && session.username && session.password) {
      const COOLDOWN_MS = 5 * 60 * 1000;
      const lastAttempt = session.last_reconnect_attempt ? new Date(session.last_reconnect_attempt).getTime() : 0;
      if (Date.now() - lastAttempt >= COOLDOWN_MS) {
        // Ре-логин (login() внутри делает warmup /advertising с redirect:manual)
        console.log(`[Marketing] All channels failed, re-logging (merchantId=${session.merchant_id})...`);
        const stamped = { ...session, last_reconnect_attempt: new Date().toISOString() };
        await supabaseAdmin.from('stores').update({ marketing_session: JSON.parse(JSON.stringify(stamped)) }).eq('user_id', userId);
        try {
          const { session: newSession } = await KaspiMarketingClient.login(session.username, session.password);
          await supabaseAdmin.from('stores').update({ marketing_session: JSON.parse(JSON.stringify(newSession)) }).eq('user_id', userId);
          console.log(`[Marketing] Re-login done, merchantId: ${session.merchant_id} → ${newSession.merchant_id}`);
          session = newSession;
          client = new KaspiMarketingClient(newSession);
          liveData = await fetchLiveData(client, start, end);
        } catch (reloginErr) {
          console.error('[Marketing] Re-login failed:', reloginErr instanceof Error ? reloginErr.message : reloginErr);
        }
      } else {
        console.log('[Marketing] All channels failed but reconnect on cooldown');
      }
    }

    // ── 3. Сохраняем в БД если есть данные ──────────────────────────────────
    if (liveData.summary.totalCost > 0) {
      saveToDb(store.id, start, end, liveData).catch(e =>
        console.error('[Marketing] DB save failed:', e instanceof Error ? e.message : e)
      );
    }

    // ── 4. Если все каналы всё равно нулевые — пробуем из БД ────────────────
    const allStillFailed = liveData.summary.totalCost === 0 && liveData.channelErrors.length > 0;
    if (allStillFailed) {
      const dbData = await readFromDb(store.id, start, end);
      if (dbData && dbData.summary.totalCost > 0) {
        console.log('[Marketing] Returning DB data (live has errors)');
        return NextResponse.json({
          success: true,
          data: {
            ...dbData,
            fromDb: true,
            channelErrors: liveData.channelErrors,
            period: { startDate: start, endDate: end },
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        campaigns: liveData.campaigns,
        summary: liveData.summary,
        channels: liveData.channels,
        adProducts: liveData.adProducts,
        channelErrors: liveData.channelErrors.length > 0 ? liveData.channelErrors : undefined,
        period: { startDate: start, endDate: end },
      }
    });

  } catch (error) {
    console.error('Marketing data error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка загрузки данных'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/kaspi/marketing — отключить Kaspi Marketing
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    await supabaseAdmin.from('stores').update({ marketing_session: null }).eq('user_id', userId);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Marketing disconnect error:', error);
    return NextResponse.json({ success: false, message: 'Ошибка отключения' }, { status: 500 });
  }
}

// ── Types & helpers ────────────────────────────────────────────────────────

interface LiveData {
  campaigns: import('@/lib/kaspi/marketing-client').MarketingCampaign[];
  summary: {
    totalCost: number; totalViews: number; totalClicks: number;
    totalTransactions: number; totalGmv: number; activeCampaigns: number;
    totalCampaigns: number; avgCtr: number; roas: number; crr: number;
  };
  channels: { productAds: number; externalAds: number; sellerBonuses: number; reviewBonuses: number };
  adProducts: Array<{ sku: string; name: string; cost: number; transactions: number; gmv: number; views: number; clicks: number }>;
  channelErrors: string[];
  // Channel detail
  extCost: number; extGmv: number; extTx: number;
  sellerCost: number; sellerGmv: number; sellerTx: number;
  reviewCost: number;
}

async function fetchLiveData(client: KaspiMarketingClient, start: string, end: string): Promise<LiveData> {
  // Campaigns + other channels in parallel
  const [campaignsRes, extRes, sellerRes, reviewRes] = await Promise.allSettled([
    client.getCampaigns(start, end),
    client.getExternalCampaigns(start, end),
    client.getSellerBonusesOverview(start, end),
    client.getReviewBonusesOverview(start, end),
  ]);

  const channelErrors: string[] = [];
  const campaigns = campaignsRes.status === 'fulfilled' ? campaignsRes.value : [];
  if (campaignsRes.status === 'rejected') {
    channelErrors.push(`productAds: ${campaignsRes.reason instanceof Error ? campaignsRes.reason.message : campaignsRes.reason}`);
  }

  const summary = KaspiMarketingClient.aggregateCampaigns(campaigns);

  let extCost = 0, extGmv = 0, extTx = 0;
  if (extRes.status === 'fulfilled') {
    for (const c of extRes.value) { extCost += c.cost; extGmv += c.gmv; extTx += c.transactions; }
  } else {
    channelErrors.push(`externalAds: ${extRes.reason instanceof Error ? extRes.reason.message : extRes.reason}`);
  }

  const sellerCost = sellerRes.status === 'fulfilled' ? sellerRes.value.cost : 0;
  const sellerGmv = sellerRes.status === 'fulfilled' ? sellerRes.value.gmv : 0;
  const sellerTx = sellerRes.status === 'fulfilled' ? sellerRes.value.transactions : 0;
  if (sellerRes.status === 'rejected') channelErrors.push(`sellerBonuses: ${sellerRes.reason instanceof Error ? sellerRes.reason.message : sellerRes.reason}`);

  const reviewCost = reviewRes.status === 'fulfilled' ? reviewRes.value.cost : 0;
  if (reviewRes.status === 'rejected') channelErrors.push(`reviewBonuses: ${reviewRes.reason instanceof Error ? reviewRes.reason.message : reviewRes.reason}`);

  const totalCost = summary.totalCost + extCost + sellerCost + reviewCost;

  // Per-product breakdown
  const productAgg: Record<string, { name: string; cost: number; transactions: number; gmv: number; views: number; clicks: number }> = {};
  for (const campaign of campaigns) {
    if (campaign.cost <= 0) continue;
    try {
      const products = await client.getCampaignProducts(campaign.id, start, end);
      for (const p of products) {
        if (!p.sku) continue;
        const ex = productAgg[p.sku];
        if (ex) {
          ex.cost += p.cost || 0; ex.transactions += p.transactions || 0;
          ex.gmv += p.gmv || 0; ex.views += p.views || 0; ex.clicks += p.clicks || 0;
        } else {
          productAgg[p.sku] = { name: p.productName || '', cost: p.cost || 0, transactions: p.transactions || 0, gmv: p.gmv || 0, views: p.views || 0, clicks: p.clicks || 0 };
        }
      }
    } catch (e) {
      console.error(`[Marketing] Failed to get products for campaign ${campaign.id}:`, e);
    }
  }

  const adProducts = Object.entries(productAgg)
    .filter(([, d]) => d.cost > 0 || d.transactions > 0)
    .sort((a, b) => b[1].cost - a[1].cost)
    .map(([sku, d]) => ({ sku, ...d }));

  return {
    campaigns,
    summary: { ...summary, totalCost },
    channels: { productAds: summary.totalCost, externalAds: extCost, sellerBonuses: sellerCost, reviewBonuses: reviewCost },
    adProducts,
    channelErrors,
    extCost, extGmv, extTx,
    sellerCost, sellerGmv, sellerTx,
    reviewCost,
  };
}

async function saveToDb(storeId: string, start: string, end: string, d: LiveData) {
  // Если диапазон = 1 день — сохраняем как точную дату
  // Иначе — сохраняем агрегат за весь период под датой end
  // Точный посуточный синк делает cron /api/cron/marketing-sync
  const date = start === end ? start : end;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabaseAdmin as any).from('marketing_daily').upsert({
    store_id: storeId,
    date,
    product_ads_cost: d.channels.productAds,
    product_ads_gmv: d.summary.totalGmv - d.extGmv - d.sellerGmv,
    product_ads_transactions: d.summary.totalTransactions - d.extTx - d.sellerTx,
    product_ads_views: d.summary.totalViews,
    product_ads_clicks: d.summary.totalClicks,
    external_ads_cost: d.extCost,
    external_ads_gmv: d.extGmv,
    external_ads_transactions: d.extTx,
    seller_bonuses_cost: d.sellerCost,
    seller_bonuses_gmv: d.sellerGmv,
    seller_bonuses_transactions: d.sellerTx,
    review_bonuses_cost: d.reviewCost,
    total_cost: d.summary.totalCost,
    synced_at: new Date().toISOString(),
  }, { onConflict: 'store_id,date' });

  if (error) throw new Error(error.message);
}

async function readFromDb(storeId: string, start: string, end: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabaseAdmin as any)
    .from('marketing_daily')
    .select('*')
    .eq('store_id', storeId)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false })
    .limit(1);

  if (!data?.length) return null;

  const row = data[0];
  const totalCost = Number(row.total_cost) || 0;
  const totalViews = Number(row.product_ads_views) || 0;
  const totalClicks = Number(row.product_ads_clicks) || 0;
  const totalGmv = (Number(row.product_ads_gmv) || 0) + (Number(row.external_ads_gmv) || 0) + (Number(row.seller_bonuses_gmv) || 0);
  const totalTx = (Number(row.product_ads_transactions) || 0) + (Number(row.external_ads_transactions) || 0) + (Number(row.seller_bonuses_transactions) || 0);

  return {
    campaigns: [],
    summary: {
      totalCost,
      totalViews,
      totalClicks,
      totalTransactions: totalTx,
      totalGmv,
      activeCampaigns: 0,
      totalCampaigns: 0,
      avgCtr: totalViews > 0 ? (totalClicks / totalViews) * 100 : 0,
      roas: (Number(row.product_ads_cost) || 0) > 0 ? (Number(row.product_ads_gmv) || 0) / (Number(row.product_ads_cost) || 1) : 0,
      crr: totalGmv > 0 ? (totalCost / totalGmv) * 100 : 0,
    },
    channels: {
      productAds: Number(row.product_ads_cost) || 0,
      externalAds: Number(row.external_ads_cost) || 0,
      sellerBonuses: Number(row.seller_bonuses_cost) || 0,
      reviewBonuses: Number(row.review_bonuses_cost) || 0,
    },
    adProducts: [],
  };
}
