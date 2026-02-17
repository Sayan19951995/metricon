import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { kaspiCabinetLogin } from '@/lib/kaspi/api-client';

/**
 * GET /api/kaspi/reviews?userId=xxx
 * Рейтинг и метрики магазина: публичная страница + GraphQL BFF
 * Автоматически перелогинивается если сессия истекла
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId обязателен' }, { status: 400 });
    }

    const { data: store } = await supabase
      .from('stores')
      .select('id, kaspi_merchant_id, kaspi_session')
      .eq('user_id', userId)
      .single();

    if (!store) {
      return NextResponse.json({ success: false, error: 'Магазин не найден' }, { status: 404 });
    }

    const session = store.kaspi_session as {
      merchant_id?: string;
      cookies?: string;
      username?: string;
      password?: string;
    } | null;
    const merchantId = session?.merchant_id || store.kaspi_merchant_id;

    if (!merchantId) {
      return NextResponse.json({ success: false, error: 'merchantId не найден' });
    }

    const page = parseInt(searchParams.get('page') || '0');
    const size = parseInt(searchParams.get('size') || '10');
    const ratingFilter = searchParams.get('rating') ? parseInt(searchParams.get('rating')!) : null;

    // Параллельно: публичная страница (метрики) + GraphQL (звёзды) + список отзывов
    const [publicData, gqlData, reviewsList] = await Promise.all([
      fetchPublicMetrics(merchantId),
      session?.cookies ? fetchStarDistribution(merchantId, session.cookies) : null,
      ratingFilter
        ? fetchFilteredReviews(merchantId, ratingFilter, page, size)
        : fetchReviewsList(merchantId, page, size),
    ]);

    // Если GraphQL не сработал и есть логин/пароль — перелогиниваемся
    let finalGqlData = gqlData;
    if (!gqlData && session?.username && session?.password) {
      console.log('[Reviews] Session expired, re-logging in...');
      try {
        const loginResult = await kaspiCabinetLogin(session.username, session.password);
        if (loginResult.success && loginResult.cookies) {
          // Сохраняем новую сессию
          await supabase.from('stores').update({
            kaspi_session: {
              cookies: loginResult.cookies,
              merchant_id: loginResult.merchantId || merchantId,
              created_at: new Date().toISOString(),
              username: session.username,
              password: session.password,
            },
          }).eq('id', store.id);

          // Повторяем GraphQL с новыми куками
          finalGqlData = await fetchStarDistribution(merchantId, loginResult.cookies);
          if (finalGqlData) {
            console.log('[Reviews] Re-login successful, got star data');
          }
        }
      } catch (e) {
        console.error('[Reviews] Re-login failed:', e);
      }
    }

    if (!publicData) {
      return NextResponse.json({ success: false, error: 'Не удалось получить данные с Kaspi' });
    }

    // Точный рейтинг и количество нужных отзывов из GraphQL
    const hasGqlData = finalGqlData !== null && finalGqlData !== undefined;
    const stars = finalGqlData?.stars || { five: 0, four: 0, three: 0, two: 0, one: 0 };
    const totalFromStars = stars.five + stars.four + stars.three + stars.two + stars.one;
    const sumFromStars = 5 * stars.five + 4 * stars.four + 3 * stars.three + 2 * stars.two + 1 * stars.one;
    const exactRating = totalFromStars > 0 ? sumFromStars / totalFromStars : publicData.rating;

    // Расчёт: (sum + 5*X) / (total + X) >= 4.95
    let reviewsNeededFor5 = 0;
    if (exactRating < 4.95 && totalFromStars > 0) {
      reviewsNeededFor5 = Math.ceil((4.95 * totalFromStars - sumFromStars) / (5 - 4.95));
      if (reviewsNeededFor5 < 0) reviewsNeededFor5 = 0;
    }

    // Дата окна и когда выпадут не-пятёрки (90-дневное скользящее окно)
    const nonFiveCount = totalFromStars > 0
      ? stars.four + stars.three + stars.two + stars.one
      : 0;
    const windowEnd = finalGqlData?.windowEnd || null;
    const nonFiveDropOffBy = windowEnd ? new Date(new Date(windowEnd).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString() : null;

    return NextResponse.json({
      success: true,
      approximate: !hasGqlData,
      rating: publicData.rating,
      exactRating: Math.round(exactRating * 10000) / 10000,
      numberOfReviews: publicData.numberOfReviews,
      totalRatings: totalFromStars || publicData.totalRatings,
      stars,
      nonFiveCount,
      windowDays: finalGqlData?.windowDays || 90,
      windowEnd,
      nonFiveDropOffBy,
      cancelled: publicData.cancelled,
      returned: publicData.returned,
      lateDelivery: publicData.lateDelivery,
      status: publicData.status,
      salesCount: publicData.salesCount,
      name: publicData.name,
      logo: publicData.logo,
      reviewsNeededFor5,
      reviews: reviewsList || [],
      page,
    });
  } catch (error) {
    console.error('Reviews API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка сервера',
    }, { status: 500 });
  }
}

// --- Публичная страница Kaspi: общие метрики ---

async function fetchPublicMetrics(merchantId: string) {
  const url = `https://kaspi.kz/shop/info/merchant/${merchantId}/reviews`;
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html',
    },
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

  const m = merchant.merchantMetrics || {};
  return {
    rating: merchant.rating || 0,
    numberOfReviews: merchant.numberOfReviews || 0,
    totalRatings: m.rating?.formulaElements?.numerator || 0,
    cancelled: m.cancelled?.percentage ?? 0,
    returned: m.returned?.percentage ?? 0,
    lateDelivery: m.lateKaspiDelivery?.percentage ?? 0,
    status: m.state?.value || 'UNKNOWN',
    salesCount: merchant.salesCount || 0,
    name: merchant.name || '',
    logo: merchant.logo || '',
  };
}

// --- Публичный API: список отзывов ---

async function fetchReviewsList(merchantId: string, page: number, size: number) {
  try {
    const resp = await fetch(
      `https://kaspi.kz/yml/review-view/api/v1/reviews/merchant/${merchantId}?page=${page}&size=${size}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Referer': `https://kaspi.kz/shop/info/merchant/${merchantId}/reviews`,
          'X-Requested-With': 'XMLHttpRequest',
        },
      }
    );

    if (!resp.ok) return [];
    const json = await resp.json();
    return (json.data || []).map((r: any) => ({
      id: r.id,
      author: r.author,
      date: r.date,
      rating: r.rating,
      text: r.comment?.text || '',
      plus: r.comment?.plus || '',
      minus: r.comment?.minus || '',
      productName: r.product?.name || '',
      productLink: r.product?.link || '',
      photos: (r.galleryImages || []).map((img: any) => img.small).filter(Boolean),
    }));
  } catch (e) {
    console.error('[Reviews] List fetch failed:', e);
    return [];
  }
}

// --- Фильтрация по рейтингу (загружаем страницы пока не наберём нужное кол-во) ---

async function fetchFilteredReviews(merchantId: string, rating: number, page: number, size: number) {
  const skip = page * size;
  const need = skip + size;
  const filtered: any[] = [];

  // Загружаем страницы пока не наберём нужное кол-во или не закончатся
  for (let p = 0; p < 60; p++) {
    const batch = await fetchReviewsList(merchantId, p, 10);
    if (batch.length === 0) break;

    for (const r of batch) {
      if (r.rating === rating) filtered.push(r);
    }

    if (filtered.length >= need) break;
  }

  return filtered.slice(skip, skip + size);
}

// --- GraphQL BFF: точное распределение по звёздам ---

async function fetchStarDistribution(merchantId: string, cookies: string) {
  try {
    const resp = await fetch('https://mc.shop.kaspi.kz/mc/facade/graphql', {
      method: 'POST',
      headers: {
        'Cookie': cookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `{
          merchant(id: "${merchantId}") {
            qualityControl {
              ratingWithStatistics {
                details {
                  from to daysPerPeriod
                }
                statistics {
                  fiveCount fourCount threeCount twoCount oneCount
                }
              }
            }
          }
        }`,
      }),
    });

    if (!resp.ok) return null;
    const json = await resp.json();
    const rws = json.data?.merchant?.qualityControl?.ratingWithStatistics;
    const stats = rws?.statistics;
    if (!stats) return null;

    return {
      stars: {
        five: stats.fiveCount || 0,
        four: stats.fourCount || 0,
        three: stats.threeCount || 0,
        two: stats.twoCount || 0,
        one: stats.oneCount || 0,
      },
      windowEnd: rws?.details?.to || null,
      windowDays: rws?.details?.daysPerPeriod || 90,
    };
  } catch (e) {
    console.error('[Reviews] GraphQL star distribution failed:', e);
    return null;
  }
}
