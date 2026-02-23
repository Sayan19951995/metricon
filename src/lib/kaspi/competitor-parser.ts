/**
 * Лёгкий парсер конкурентов Kaspi (без Puppeteer).
 * Используется в cron автоцены для получения цен конкурентов.
 *
 * Подходы:
 * 1. Kaspi offers API (JSON) — kaspi.kz/yml/offer-view/offers/{productId}
 * 2. Fallback: HTML парсинг страницы товара
 */

import * as cheerio from 'cheerio';

export interface CompetitorOffer {
  merchantId: string;
  merchantName: string;
  price: number;
  deliveryAvailable?: boolean;
}

/**
 * Извлечь product ID из shopLink.
 * Примеры shopLink:
 * - https://kaspi.kz/shop/p/apple-iphone-15-pro-256gb-116615366/?c=750000000
 * - /shop/p/apple-iphone-15-pro-256gb-116615366/
 * Product ID — числовая часть в конце slug.
 */
export function extractProductId(shopLink: string): string | null {
  if (!shopLink) return null;
  // Match pattern: -{digits}/ or /{digits}/ or -{digits}?
  const match = shopLink.match(/[-/](\d{6,})(?:[/?]|$)/);
  return match ? match[1] : null;
}

/**
 * Получить предложения продавцов через Kaspi offers API.
 * Публичный JSON API, не требует авторизации.
 */
export async function getCompetitorOffers(
  productId: string,
  cityId: string = '750000000' // Алматы по умолчанию
): Promise<CompetitorOffer[]> {
  try {
    // Попытка 1: Kaspi offers API
    const offersUrl = `https://kaspi.kz/yml/offer-view/offers/${productId}?city=${cityId}&limit=20`;
    const response = await fetch(offersUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const data = await response.json();
      // Parse Kaspi offers JSON response
      if (data?.offers && Array.isArray(data.offers)) {
        return data.offers.map((offer: any) => ({
          merchantId: String(offer.merchantId || offer.seller?.id || ''),
          merchantName: offer.merchantName || offer.seller?.name || 'Неизвестный',
          price: Number(offer.price || 0),
          deliveryAvailable: offer.deliveryAvailable ?? true,
        })).filter((o: CompetitorOffer) => o.price > 0);
      }
    }

    // Попытка 2: HTML парсинг страницы товара
    return await parseProductPageOffers(productId, cityId);
  } catch (err) {
    console.error(`[CompetitorParser] Error for product ${productId}:`, err);
    // Попытка fallback
    try {
      return await parseProductPageOffers(productId, cityId);
    } catch {
      return [];
    }
  }
}

/**
 * Fallback: парсинг HTML страницы товара для извлечения предложений.
 */
async function parseProductPageOffers(
  productId: string,
  cityId: string
): Promise<CompetitorOffer[]> {
  try {
    const url = `https://kaspi.kz/shop/p/-${productId}/?c=${cityId}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return [];

    const html = await response.text();
    const $ = cheerio.load(html);
    const offers: CompetitorOffer[] = [];

    // Parse offer cards
    $('.sellers-table__row, .offer-item, [data-merchant-id]').each((_, el) => {
      const $el = $(el);
      const merchantId = $el.attr('data-merchant-id') || '';
      const merchantName = $el.find('.sellers-table__merchant-name, .merchant-name, .offer-merchant-name').text().trim();
      const priceText = $el.find('.sellers-table__price, .offer-price').text().trim();
      const price = parseInt(priceText.replace(/[^\d]/g, ''), 10);

      if (merchantName && price > 0) {
        offers.push({ merchantId, merchantName, price });
      }
    });

    // Try alternative: look for embedded JSON data
    if (offers.length === 0) {
      const scripts = $('script').toArray();
      for (const script of scripts) {
        const text = $(script).html() || '';
        // Look for offers data in page scripts
        const offerMatch = text.match(/\"offers\"\s*:\s*(\[[\s\S]*?\])/);
        if (offerMatch) {
          try {
            const parsed = JSON.parse(offerMatch[1]);
            for (const offer of parsed) {
              if (offer.price > 0) {
                offers.push({
                  merchantId: String(offer.merchantId || ''),
                  merchantName: offer.merchantName || 'Неизвестный',
                  price: Number(offer.price),
                });
              }
            }
          } catch { /* ignore parse errors */ }
        }
      }
    }

    return offers;
  } catch (err) {
    console.error(`[CompetitorParser] HTML parse error for ${productId}:`, err);
    return [];
  }
}

/**
 * Найти лучшего конкурента (с минимальной ценой, кроме нашего магазина).
 */
export async function getBestCompetitor(
  productId: string,
  ourMerchantId: string,
  cityId?: string
): Promise<CompetitorOffer | null> {
  const offers = await getCompetitorOffers(productId, cityId);

  if (offers.length === 0) return null;

  // Filter out our own store
  const competitors = offers.filter(o =>
    o.merchantId !== ourMerchantId &&
    !o.merchantName.toLowerCase().includes(ourMerchantId.toLowerCase())
  );

  if (competitors.length === 0) return null;

  // Sort by price ascending, return cheapest
  competitors.sort((a, b) => a.price - b.price);
  return competitors[0];
}
