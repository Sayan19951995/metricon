/**
 * Kaspi Cabinet API Client — работа с mc.shop.kaspi.kz через cookies
 */

const BASE_URL = 'https://mc.shop.kaspi.kz';
const AUTH_URL = 'https://kaspi.kz';

const DEFAULT_HEADERS = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'Referer': 'https://mc.shop.kaspi.kz/',
  'Origin': 'https://mc.shop.kaspi.kz',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

export interface KaspiProduct {
  sku: string;
  name: string;
  price: number;
  stock: number;
  category?: string;
  brand?: string;
  images: string[];
  offerId?: string;
  masterSku?: string;
  shopLink?: string;
  availabilities?: KaspiAvailability[];
  preorder?: number | null;
  active?: boolean;
}

export interface KaspiAvailability {
  storeId: string;
  storeName?: string;
  cityId?: string;
  cityName?: string;
  stockCount: number;
  available: boolean;
  preorderPeriod?: number | null;
}

export interface KaspiLoginResult {
  success: boolean;
  cookies?: string;
  merchantId?: string;
  error?: string;
}

export interface KaspiProductsResult {
  products: KaspiProduct[];
  total: number;
}

/**
 * Попытка HTTP-логина в Kaspi Merchant Cabinet.
 * Kaspi может требовать SMS/captcha — в этом случае вернёт ошибку.
 */
export async function kaspiCabinetLogin(
  username: string,
  password: string
): Promise<KaspiLoginResult> {
  try {
    // Шаг 1: Получаем начальные cookies и CSRF token
    const initResponse = await fetch(`${AUTH_URL}/mc/login`, {
      method: 'GET',
      headers: {
        'User-Agent': DEFAULT_HEADERS['User-Agent'],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'manual',
    });

    const initCookies = extractCookies(initResponse);

    // Шаг 2: Отправляем логин/пароль
    const loginResponse = await fetch(`${AUTH_URL}/mc/login`, {
      method: 'POST',
      headers: {
        'User-Agent': DEFAULT_HEADERS['User-Agent'],
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': initCookies,
        'Referer': `${AUTH_URL}/mc/login`,
        'Origin': AUTH_URL,
      },
      body: new URLSearchParams({
        username,
        password,
        '_csrf': '', // TODO: extract from page if needed
      }).toString(),
      redirect: 'manual',
    });

    const loginCookies = extractCookies(loginResponse);
    const allCookies = mergeCookies(initCookies, loginCookies);

    // Шаг 3: Проверяем успешность — пробуем получить данные
    const checkResponse = await fetch(`${BASE_URL}/bff/offer-view/count?m=0`, {
      headers: {
        ...DEFAULT_HEADERS,
        'Cookie': allCookies,
      },
    });

    if (checkResponse.ok) {
      // Пытаемся получить merchantId из ответа или из redirect
      const merchantId = await extractMerchantId(allCookies);
      return {
        success: true,
        cookies: allCookies,
        merchantId: merchantId || undefined,
      };
    }

    // Если редирект на логин — авторизация не прошла
    if (checkResponse.status === 302 || checkResponse.status === 401) {
      return {
        success: false,
        error: 'Неверный логин или пароль, или требуется SMS-подтверждение',
      };
    }

    return {
      success: false,
      error: `Ошибка проверки: ${checkResponse.status}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка авторизации',
    };
  }
}

/**
 * Проверка валидности cookies
 */
export async function checkCabinetSession(cookies: string, merchantId: string): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/bff/offer-view/count?m=${merchantId}`, {
      headers: {
        ...DEFAULT_HEADERS,
        'Cookie': cookies,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export class KaspiAPIClient {
  private cookieString: string;
  private merchantId: string;

  constructor(cookies: string, merchantId: string) {
    this.cookieString = cookies;
    this.merchantId = merchantId;
  }

  private get headers() {
    return {
      ...DEFAULT_HEADERS,
      'Cookie': this.cookieString,
    };
  }

  /**
   * Получить все товары продавца
   */
  async getAllProducts(): Promise<KaspiProduct[]> {
    const allProducts: KaspiProduct[] = [];
    let page = 0;
    const limit = 100;

    while (true) {
      const products = await this.getProductsPage(page, limit);
      if (products.length === 0) break;
      allProducts.push(...products);
      if (products.length < limit) break;
      page++;
    }

    return allProducts;
  }

  /**
   * Получить одну страницу товаров
   */
  async getProductsPage(page: number = 0, limit: number = 100): Promise<KaspiProduct[]> {
    const url = `${BASE_URL}/bff/offer-view/list?m=${this.merchantId}&p=${page}&l=${limit}&a=true&t=&c=&lowStock=false&notSpecifiedStock=false`;

    const response = await fetch(url, { headers: this.headers });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      return [];
    }

    return data.data.map((item: any) => this.mapProduct(item));
  }

  /**
   * Получить количество товаров
   */
  async getProductsCount(): Promise<number> {
    const url = `${BASE_URL}/bff/offer-view/count?m=${this.merchantId}`;

    const response = await fetch(url, { headers: this.headers });
    if (!response.ok) {
      throw new Error(`Count request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.count || 0;
  }

  /**
   * Обновить цену товара
   * BFF endpoint для обновления цены оффера
   */
  async updateProductPrice(offerId: string, price: number): Promise<boolean> {
    const url = `${BASE_URL}/bff/offer-view/price`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        merchantId: this.merchantId,
        offerId,
        price,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Update price failed: ${response.status} — ${text}`);
    }

    return true;
  }

  /**
   * Обновить остатки товара по точкам
   */
  async updateProductStock(
    offerId: string,
    availabilities: Array<{ storeId: string; stockCount: number }>
  ): Promise<boolean> {
    const url = `${BASE_URL}/bff/offer-view/stock`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        merchantId: this.merchantId,
        offerId,
        availabilities,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Update stock failed: ${response.status} — ${text}`);
    }

    return true;
  }

  /**
   * Обновить предзаказ товара
   */
  async updatePreorder(
    offerId: string,
    preorderDays: number | null
  ): Promise<boolean> {
    const url = `${BASE_URL}/bff/offer-view/preorder`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        merchantId: this.merchantId,
        offerId,
        preorderPeriod: preorderDays,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Update preorder failed: ${response.status} — ${text}`);
    }

    return true;
  }

  /**
   * Преобразовать raw данные BFF в наш формат
   */
  private mapProduct(item: any): KaspiProduct {
    const availabilities: KaspiAvailability[] = (item.availabilities || []).map((a: any) => ({
      storeId: a.storeId || a.pointOfServiceId || '',
      storeName: a.storeName || a.pointOfServiceName || '',
      cityId: a.cityId || '',
      cityName: a.cityName || '',
      stockCount: a.stockCount || 0,
      available: a.available ?? (a.stockCount > 0),
      preorderPeriod: a.preorderPeriod ?? null,
    }));

    return {
      sku: item.sku || item.masterSku,
      name: item.title || item.masterTitle,
      price: item.price || 0,
      stock: availabilities.reduce((sum, a) => sum + a.stockCount, 0),
      category: item.masterCategory || item.verticalCategory,
      brand: item.brand || null,
      images: item.images || [],
      offerId: item.offerId,
      masterSku: item.masterSku,
      shopLink: item.shopLink,
      availabilities,
      preorder: availabilities[0]?.preorderPeriod ?? null,
      active: item.active ?? true,
    };
  }
}

// --- Вспомогательные функции ---

function extractCookies(response: Response): string {
  const setCookieHeaders = response.headers.getSetCookie?.() || [];
  return setCookieHeaders
    .map(cookie => cookie.split(';')[0])
    .join('; ');
}

function mergeCookies(existing: string, incoming: string): string {
  const map = new Map<string, string>();

  for (const cookie of existing.split('; ').filter(Boolean)) {
    const [key, ...rest] = cookie.split('=');
    map.set(key, rest.join('='));
  }
  for (const cookie of incoming.split('; ').filter(Boolean)) {
    const [key, ...rest] = cookie.split('=');
    map.set(key, rest.join('='));
  }

  return Array.from(map.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

async function extractMerchantId(cookies: string): Promise<string | null> {
  try {
    const response = await fetch(`${BASE_URL}/merchant-nct/mc/nct/kassa-status`, {
      headers: {
        ...DEFAULT_HEADERS,
        'Cookie': cookies,
      },
    });
    if (response.ok) {
      const data = await response.json();
      return data.merchantId || data.id || null;
    }
  } catch {
    // ignore
  }
  return null;
}
