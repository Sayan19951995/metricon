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

    // Логин в marketing.kaspi.kz
    const { session, loginData } = await KaspiMarketingClient.login(username, password);

    // Сохраняем сессию в stores
    const { error: updateError } = await supabaseAdmin
      .from('stores')
      .update({
        marketing_session: JSON.parse(JSON.stringify(session)),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to save marketing session:', updateError);
      return NextResponse.json({
        success: false,
        message: 'Ошибка сохранения сессии'
      }, { status: 500 });
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
 * GET /api/kaspi/marketing — получить данные кампаний
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Получаем store и marketing_session
    const storeResult = await supabaseAdmin
      .from('stores')
      .select('id, marketing_session')
      .eq('user_id', userId)
      .single();
    const store = storeResult.data;

    if (!store?.marketing_session) {
      return NextResponse.json({
        success: false,
        message: 'Kaspi Marketing не подключен'
      }, { status: 400 });
    }

    let session = store.marketing_session as unknown as MarketingSession;
    let client = new KaspiMarketingClient(session);

    // Даты по умолчанию — последние 30 дней
    const now = new Date();
    const defaultEnd = now.toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600000);
    const defaultStart = thirtyDaysAgo.toISOString().split('T')[0];

    const start = startDate || defaultStart;
    const end = endDate || defaultEnd;

    // Fetch кампаний — с однократным авто-reconnect (кулдаун 1ч чтобы не долбить Kaspi)
    let campaigns;
    try {
      campaigns = await client.getCampaigns(start, end);
    } catch (firstErr) {
      console.log('[Marketing] getCampaigns failed:', firstErr instanceof Error ? firstErr.message : firstErr);

      // Проверяем кулдаун (1 час) чтобы не вызывать 429
      const ONE_HOUR_MS = 60 * 60 * 1000;
      const lastAttempt = session.last_reconnect_attempt ? new Date(session.last_reconnect_attempt).getTime() : 0;
      const onCooldown = Date.now() - lastAttempt < ONE_HOUR_MS;

      if (onCooldown || !session.username || !session.password) {
        // Не очищаем сессию — показываем ошибку, пользователь сам решит переподключиться
        return NextResponse.json({ success: false, message: firstErr instanceof Error ? firstErr.message : 'Ошибка загрузки кампаний' }, { status: 500 });
      }

      // Однократная попытка переподключения
      console.log('[Marketing] Attempting reconnect...');
      const stampedSession = { ...session, last_reconnect_attempt: new Date().toISOString() };
      await supabaseAdmin.from('stores').update({ marketing_session: JSON.parse(JSON.stringify(stampedSession)) }).eq('user_id', userId);

      try {
        const { KaspiMarketingClient: KMC } = await import('@/lib/kaspi/marketing-client');
        const newSession = await KMC.login(session.username, session.password);
        await supabaseAdmin.from('stores').update({ marketing_session: JSON.parse(JSON.stringify(newSession.session)) }).eq('user_id', userId);
        client = new KaspiMarketingClient(newSession.session);
        campaigns = await client.getCampaigns(start, end);
        console.log('[Marketing] Reconnected successfully');
      } catch (reconnectErr) {
        console.error('[Marketing] Reconnect failed:', reconnectErr instanceof Error ? reconnectErr.message : reconnectErr);
        return NextResponse.json({ success: false, message: reconnectErr instanceof Error ? reconnectErr.message : 'Ошибка переподключения' }, { status: 500 });
      }
    }

    const summary = KaspiMarketingClient.aggregateCampaigns(campaigns);

    // Fetch all marketing channels in parallel (with raw responses for debugging)
    const [extRes, sellerRes, reviewRes] = await Promise.allSettled([
      client.getExternalCampaigns(start, end),
      client.getSellerBonusesOverview(start, end),
      client.getReviewBonusesOverview(start, end),
    ]);

    const channels = {
      productAds: summary.totalCost,
      externalAds: 0,
      sellerBonuses: 0,
      reviewBonuses: 0,
    };
    const channelErrors: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channelDebug: Record<string, any> = {};

    if (extRes.status === 'fulfilled') {
      channelDebug.externalAds = extRes.value;
      for (const c of extRes.value) channels.externalAds += c.cost;
    } else {
      const msg = extRes.reason instanceof Error ? extRes.reason.message : String(extRes.reason);
      channelErrors.push(`externalAds: ${msg}`);
    }
    if (sellerRes.status === 'fulfilled') {
      channelDebug.sellerBonuses = sellerRes.value;
      channels.sellerBonuses = sellerRes.value.cost;
    } else {
      const msg = sellerRes.reason instanceof Error ? sellerRes.reason.message : String(sellerRes.reason);
      channelErrors.push(`sellerBonuses: ${msg}`);
    }
    if (reviewRes.status === 'fulfilled') {
      channelDebug.reviewBonuses = reviewRes.value;
      channels.reviewBonuses = reviewRes.value.cost;
    } else {
      const msg = reviewRes.reason instanceof Error ? reviewRes.reason.message : String(reviewRes.reason);
      channelErrors.push(`reviewBonuses: ${msg}`);
    }

    // Total across all channels
    const totalMarketingCost = channels.productAds + channels.externalAds + channels.sellerBonuses + channels.reviewBonuses;

    // Per-product ad data (aggregate across all campaigns)
    const productAgg: Record<string, { name: string; cost: number; transactions: number; gmv: number; views: number; clicks: number }> = {};
    for (const campaign of campaigns) {
      if (campaign.cost <= 0) continue;
      try {
        const products = await client.getCampaignProducts(campaign.id, start, end);
        for (const p of products) {
          if (p.sku) {
            const ex = productAgg[p.sku];
            if (ex) {
              ex.cost += p.cost || 0;
              ex.transactions += p.transactions || 0;
              ex.gmv += p.gmv || 0;
              ex.views += p.views || 0;
              ex.clicks += p.clicks || 0;
            } else {
              productAgg[p.sku] = {
                name: p.productName || '',
                cost: p.cost || 0,
                transactions: p.transactions || 0,
                gmv: p.gmv || 0,
                views: p.views || 0,
                clicks: p.clicks || 0,
              };
            }
          }
        }
      } catch (e) {
        console.error(`[Marketing] Failed to get products for campaign ${campaign.id}:`, e);
      }
    }

    // Products array sorted by cost desc (for frontend)
    const adProducts = Object.entries(productAgg)
      .filter(([, d]) => d.cost > 0 || d.transactions > 0)
      .sort((a, b) => b[1].cost - a[1].cost)
      .map(([sku, d]) => ({ sku, ...d }));

    return NextResponse.json({
      success: true,
      data: {
        campaigns,
        summary: { ...summary, totalCost: totalMarketingCost },
        channels,
        channelErrors: channelErrors.length > 0 ? channelErrors : undefined,
        channelDebug,
        adProducts,
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

    await supabaseAdmin
      .from('stores')
      .update({ marketing_session: null })
      .eq('user_id', userId);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Marketing disconnect error:', error);
    return NextResponse.json({
      success: false,
      message: 'Ошибка отключения'
    }, { status: 500 });
  }
}
