import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuth } from '@/lib/api-auth';
import { KaspiAPIClient } from '@/lib/kaspi/api-client';

interface KaspiSession {
  cookies: string;
  merchant_id: string;
}

/**
 * POST /api/kaspi/cabinet/feed/check
 * Проверить URL автозагрузки через Kaspi (Kaspi сам скачает и валидирует XML)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    const { feedUrl, authLogin, authPassword } = await request.json();
    if (!feedUrl) {
      return NextResponse.json({ success: false, error: 'feedUrl required' }, { status: 400 });
    }

    // Получаем store и сессию
    const storeResult = await supabaseAdmin
      .from('stores')
      .select('kaspi_session, kaspi_merchant_id')
      .eq('user_id', userId)
      .single();
    const store = storeResult.data;

    const session = store?.kaspi_session as KaspiSession | null;
    if (!session?.cookies) {
      return NextResponse.json({ success: false, error: 'Нет активной сессии Kaspi кабинета' });
    }

    const merchantId = session.merchant_id || store?.kaspi_merchant_id || '';
    const client = new KaspiAPIClient(session.cookies, merchantId);

    const result = await client.checkAutoLoadUrl(
      feedUrl,
      authLogin || undefined,
      authPassword || undefined,
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error('[Feed Check] Error:', err);
    return NextResponse.json({ success: false, error: 'Ошибка проверки' }, { status: 500 });
  }
}
