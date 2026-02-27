/**
 * Парсер конкурентов Kaspi.
 * Использует Kaspi offers POST API для получения цен конкурентов.
 *
 * Рабочий endpoint:
 *   POST https://kaspi.kz/yml/offer-view/offers/{productId}
 *   Body: { "cityId": "750000000" }
 *   Headers: Content-Type: application/json, User-Agent: Chrome
 */

export interface CompetitorOffer {
  merchantId: string;
  merchantName: string;
  price: number;
  merchantRating?: number;
  merchantReviewsQuantity?: number;
  kaspiDelivery?: boolean;
  deliveryDuration?: string;
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
  const match = shopLink.match(/[-/](\d{6,})(?:[/?]|$)/);
  return match ? match[1] : null;
}

/**
 * Получить предложения продавцов через Kaspi offers POST API.
 */
export async function getCompetitorOffers(
  productId: string,
  cityId: string = '750000000' // Алматы по умолчанию
): Promise<CompetitorOffer[]> {
  try {
    const url = `https://kaspi.kz/yml/offer-view/offers/${productId}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'Content-Type': 'application/json',
        'Referer': `https://kaspi.kz/shop/p/-${productId}/`,
        'Origin': 'https://kaspi.kz',
      },
      body: JSON.stringify({ cityId }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`[CompetitorParser] Kaspi offers API returned ${response.status} for ${productId}`);
      return [];
    }

    const data = await response.json();

    if (data?.offers && Array.isArray(data.offers)) {
      return data.offers.map((offer: any) => ({
        merchantId: String(offer.merchantId || ''),
        merchantName: offer.merchantName || 'Неизвестный',
        price: Number(offer.price || 0),
        merchantRating: offer.merchantRating,
        merchantReviewsQuantity: offer.merchantReviewsQuantity,
        kaspiDelivery: offer.kaspiDelivery,
        deliveryDuration: offer.deliveryDuration,
      })).filter((o: CompetitorOffer) => o.price > 0);
    }

    return [];
  } catch (err) {
    console.error(`[CompetitorParser] Error for product ${productId}:`, err);
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

/**
 * Получить все предложения и общую статистику по товару.
 */
export async function getOffersStats(
  productId: string,
  ourMerchantId: string,
  cityId?: string
): Promise<{
  totalOffers: number;
  ourPrice: number | null;
  ourPosition: number | null;
  cheapestPrice: number | null;
  cheapestMerchant: string | null;
  offers: CompetitorOffer[];
} | null> {
  const offers = await getCompetitorOffers(productId, cityId);
  if (offers.length === 0) return null;

  // Sort by price
  offers.sort((a, b) => a.price - b.price);

  // Find our offer
  const ourOffer = offers.find(o =>
    o.merchantId === ourMerchantId ||
    o.merchantName.toLowerCase().includes(ourMerchantId.toLowerCase())
  );
  const ourPosition = ourOffer
    ? offers.indexOf(ourOffer) + 1
    : null;

  return {
    totalOffers: offers.length,
    ourPrice: ourOffer?.price || null,
    ourPosition,
    cheapestPrice: offers[0]?.price || null,
    cheapestMerchant: offers[0]?.merchantName || null,
    offers,
  };
}
