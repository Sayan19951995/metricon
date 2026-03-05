import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/api-auth';
import { waSendMessage } from '@/lib/whatsapp/client';

const WA_SERVER_URL = process.env.WA_SERVER_URL || 'https://metricon-production.up.railway.app';
const WA_SERVER_SECRET = process.env.WA_SERVER_SECRET || '';

/**
 * GET /api/cron/review-notifications
 * Проверяет новые отзывы и шлёт WhatsApp уведомление владельцу магазина.
 * Запускается каждые 30 минут через Vercel Cron.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all stores with WhatsApp connected and Kaspi merchant_id
    const { data: stores } = await supabaseAdmin
      .from('stores')
      .select('id, user_id, name, kaspi_merchant_id, kaspi_session, whatsapp_connected, last_review_count, last_rating')
      .eq('whatsapp_connected', true)
      .not('kaspi_merchant_id', 'is', null);

    if (!stores || stores.length === 0) {
      return NextResponse.json({ success: true, message: 'No stores to check' });
    }

    let notified = 0;

    for (const store of stores) {
      try {
        const session = store.kaspi_session as any;
        const merchantId = session?.merchant_id || store.kaspi_merchant_id;
        if (!merchantId) continue;

        // Fetch current review count via proxy
        const metrics = await fetchPublicMetrics(merchantId);
        if (!metrics) continue;

        const currentCount = metrics.numberOfReviews || 0;
        const currentRating = metrics.rating || 0;
        const prevCount = (store as any).last_review_count || 0;

        // Update stored values
        await supabaseAdmin
          .from('stores')
          .update({
            last_review_count: currentCount,
            last_rating: currentRating,
          } as any)
          .eq('id', store.id);

        // If first check or no new reviews — skip notification
        if (prevCount === 0 || currentCount <= prevCount) continue;

        const newReviews = currentCount - prevCount;

        // Get owner's phone
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('phone')
          .eq('id', store.user_id as string)
          .single();

        const phone = (user as any)?.phone;
        if (!phone) continue;

        // Format phone for WhatsApp (ensure 7XXXXXXXXXX format)
        const cleanPhone = phone.replace(/\D/g, '');
        const waPhone = cleanPhone.startsWith('8') ? '7' + cleanPhone.slice(1) : cleanPhone;

        // Send notification
        const ratingStr = currentRating.toFixed(1);
        const reviewWord = newReviews === 1 ? 'отзыв' : (newReviews < 5 ? 'отзыва' : 'отзывов');
        const message = `📊 *${store.name || 'Ваш магазин'}*\n\n` +
          `У вас ${newReviews} новый ${reviewWord}!\n` +
          `Рейтинг: ⭐ ${ratingStr} (${currentCount} отзывов)\n\n` +
          `Посмотреть: metricon.kz/app/analytics`;

        const sent = await waSendMessage(store.id, waPhone, message);
        if (sent) notified++;

      } catch (err) {
        console.error(`[ReviewNotify] Error for store ${store.id}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      checked: stores.length,
      notified,
    });
  } catch (error) {
    console.error('[ReviewNotify] Cron error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

async function fetchPublicMetrics(merchantId: string) {
  try {
    const url = `${WA_SERVER_URL}/kaspi-proxy/merchant/${merchantId}/reviews`;
    const resp = await fetch(url, {
      headers: { 'x-api-key': WA_SERVER_SECRET },
    });

    if (!resp.ok) return null;

    const html = await resp.text();
    const marker = 'BACKEND.components.merchant = {';
    const startIdx = html.indexOf(marker);
    if (startIdx < 0) return null;

    const jsonStart = startIdx + marker.length - 1;
    let depth = 0, jsonEnd = jsonStart;
    for (let i = jsonStart; i < html.length && i < jsonStart + 50000; i++) {
      if (html[i] === '{') depth++;
      else if (html[i] === '}') { depth--; if (depth === 0) { jsonEnd = i + 1; break; } }
    }

    let merchant: any;
    try { merchant = JSON.parse(html.substring(jsonStart, jsonEnd)); } catch { return null; }

    return {
      rating: merchant.rating || 0,
      numberOfReviews: merchant.numberOfReviews || 0,
    };
  } catch {
    return null;
  }
}
