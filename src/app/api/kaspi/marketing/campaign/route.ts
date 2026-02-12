import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { KaspiMarketingClient, MarketingSession } from '@/lib/kaspi/marketing-client';

/**
 * GET /api/kaspi/marketing/campaign?userId=...&campaignId=...&startDate=...&endDate=...
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const campaignId = searchParams.get('campaignId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!userId || !campaignId) {
      return NextResponse.json({
        success: false,
        message: 'userId и campaignId обязательны'
      }, { status: 400 });
    }

    const storeResult = await supabase
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

    const session = store.marketing_session as unknown as MarketingSession;
    const client = new KaspiMarketingClient(session);

    const now = new Date();
    const defaultEnd = now.toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600000);
    const defaultStart = thirtyDaysAgo.toISOString().split('T')[0];

    const start = startDate || defaultStart;
    const end = endDate || defaultEnd;

    const products = await client.getCampaignProducts(Number(campaignId), start, end);

    return NextResponse.json({
      success: true,
      data: {
        products,
        period: { startDate: start, endDate: end },
      }
    });

  } catch (error) {
    console.error('Campaign products error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка загрузки товаров кампании'
    }, { status: 500 });
  }
}
