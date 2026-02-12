import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { KaspiMarketingClient, MarketingSession } from '@/lib/kaspi/marketing-client';

/**
 * POST /api/kaspi/marketing — логин в Kaspi Marketing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, username, password } = body;

    if (!userId || !username || !password) {
      return NextResponse.json({
        success: false,
        message: 'userId, username и password обязательны'
      }, { status: 400 });
    }

    // Логин в marketing.kaspi.kz
    const { session, loginData } = await KaspiMarketingClient.login(username, password);

    // Сохраняем сессию в stores
    const { error: updateError } = await supabase
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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'userId обязателен'
      }, { status: 400 });
    }

    // Получаем store и marketing_session
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

    let session = store.marketing_session as unknown as MarketingSession;
    let client = new KaspiMarketingClient(session);

    // Даты по умолчанию — последние 30 дней
    const now = new Date();
    const defaultEnd = now.toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600000);
    const defaultStart = thirtyDaysAgo.toISOString().split('T')[0];

    const start = startDate || defaultStart;
    const end = endDate || defaultEnd;

    // Fetch кампаний (с авто-переподключением при протухшей сессии)
    let campaigns;
    try {
      campaigns = await client.getCampaigns(start, end);
    } catch {
      // Сессия могла протухнуть — пробуем переподключиться
      console.log('[Marketing] Session expired, attempting reconnect...');
      const newSession = await KaspiMarketingClient.tryReconnect(session);
      if (newSession) {
        // Сохраняем обновлённую сессию
        await supabase.from('stores')
          .update({ marketing_session: JSON.parse(JSON.stringify(newSession)) })
          .eq('user_id', userId);
        client = new KaspiMarketingClient(newSession);
        campaigns = await client.getCampaigns(start, end);
        console.log('[Marketing] Reconnected successfully');
      } else {
        throw new Error('Сессия маркетинга истекла. Переподключитесь в настройках.');
      }
    }

    const summary = KaspiMarketingClient.aggregateCampaigns(campaigns);

    return NextResponse.json({
      success: true,
      data: {
        campaigns,
        summary,
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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'userId обязателен'
      }, { status: 400 });
    }

    await supabase
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
