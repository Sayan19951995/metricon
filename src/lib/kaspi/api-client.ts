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

export interface KaspiCityPrice {
  cityId: string;
  value: number;
}

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
  cityPrices?: KaspiCityPrice[];
  preorder?: number | null;
  active?: boolean;
  stockSpecified?: boolean;
}

export interface KaspiAvailability {
  storeId: string;
  storeName?: string;
  cityId?: string;
  cityName?: string;
  stockCount: number;
  available: boolean;
  preorderPeriod?: number | null;
  stockSpecified?: boolean;
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
 * OAuth2 логин в Kaspi Merchant Cabinet.
 *
 * Поток:
 * 1. mc.shop.kaspi.kz/oauth2/authorization/1 → redirect → idmc.shop.kaspi.kz/login
 * 2. POST idmc.shop.kaspi.kz/api/p/login {_u, _p} → {redirectUrl}
 * 3. Переход по redirectUrl → session cookies для mc.shop.kaspi.kz
 */
export async function kaspiCabinetLogin(
  username: string,
  password: string
): Promise<KaspiLoginResult> {
  const IDP_URL = 'https://idmc.shop.kaspi.kz';
  // Храним cookies раздельно по домену
  let mcCookies = '';   // mc.shop.kaspi.kz
  let idpCookies = '';  // idmc.shop.kaspi.kz

  try {
    // === Шаг 1: Начинаем OAuth2 flow ===
    console.log('[kaspiLogin] Step 1: Starting OAuth2 flow...');

    const oauthRes = await fetch(`${BASE_URL}/oauth2/authorization/1`, {
      method: 'GET',
      headers: { 'User-Agent': DEFAULT_HEADERS['User-Agent'] },
      redirect: 'manual',
    });

    const oauthCookies = extractCookies(oauthRes);
    if (oauthCookies) mcCookies = mergeCookies(mcCookies, oauthCookies);

    const idpAuthorizeUrl = oauthRes.headers.get('location');
    console.log(`[kaspiLogin] OAuth2 redirect: ${oauthRes.status} → ${idpAuthorizeUrl?.substring(0, 80)}...`);
    console.log(`[kaspiLogin] Step 1 cookies (${mcCookies.length} chars): ${cookieKeys(mcCookies)}`);

    if (!idpAuthorizeUrl || !idpAuthorizeUrl.includes('idmc.shop.kaspi.kz')) {
      return { success: false, error: 'Не удалось начать процесс авторизации' };
    }

    // === Шаг 2: Переходим на IDP authorize ===
    const authorizeRes = await fetch(idpAuthorizeUrl, {
      method: 'GET',
      headers: { 'User-Agent': DEFAULT_HEADERS['User-Agent'] },
      redirect: 'manual',
    });

    const authCookies = extractCookies(authorizeRes);
    if (authCookies) idpCookies = mergeCookies(idpCookies, authCookies);

    const loginPageUrl = authorizeRes.headers.get('location');
    console.log(`[kaspiLogin] IDP authorize: ${authorizeRes.status} → ${loginPageUrl}`);
    console.log(`[kaspiLogin] IDP cookies: ${idpCookies ? 'present' : 'empty'}`);

    // === Шаг 3: POST логин/пароль на IDP API ===
    console.log('[kaspiLogin] Step 3: Posting credentials to IDP...');

    const loginRes = await fetch(`${IDP_URL}/api/p/login`, {
      method: 'POST',
      headers: {
        'User-Agent': DEFAULT_HEADERS['User-Agent'],
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': idpCookies,
        'Referer': `${IDP_URL}/login`,
        'Origin': IDP_URL,
      },
      body: JSON.stringify({ _u: username, _p: password }),
    });

    const loginData = await loginRes.json().catch(() => null);
    console.log(`[kaspiLogin] Login response: ${loginRes.status}`, JSON.stringify(loginData)?.substring(0, 200));

    // Собираем cookies от IDP
    const loginRespCookies = extractCookies(loginRes);
    if (loginRespCookies) idpCookies = mergeCookies(idpCookies, loginRespCookies);

    if (!loginRes.ok || !loginData) {
      const errorCode = loginData?.errorCode;
      if (errorCode === 'SECURITY_CODE_SMS_FLOOD') {
        return { success: false, error: 'Слишком много попыток. Подождите и попробуйте снова.' };
      }
      if (errorCode === 'INVALID_CREDENTIALS' || errorCode === 'FAILED') {
        return { success: false, error: 'Неверный логин или пароль' };
      }
      return { success: false, error: loginData?.errorCode || 'Ошибка авторизации' };
    }

    // Если нужен выбор мерчанта (su: true), пробуем выбрать автоматически
    if (loginData.su) {
      console.log('[kaspiLogin] Merchant selection required (su=true)');
      // Пробуем без указания мерчанта — может сработает если один мерчант
      const selectRes = await fetch(`${IDP_URL}/api/p/login`, {
        method: 'POST',
        headers: {
          'User-Agent': DEFAULT_HEADERS['User-Agent'],
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cookie': idpCookies,
          'Referer': `${IDP_URL}/login`,
          'Origin': IDP_URL,
        },
        body: JSON.stringify({ _s_m: loginData.merchantId || '' }),
      });

      const selectData = await selectRes.json().catch(() => null);
      const selectCookies = extractCookies(selectRes);
      if (selectCookies) idpCookies = mergeCookies(idpCookies, selectCookies);
      console.log(`[kaspiLogin] Merchant select: ${selectRes.status}`, JSON.stringify(selectData)?.substring(0, 200));

      if (selectData?.redirectUrl) {
        loginData.redirectUrl = selectData.redirectUrl;
      }
    }

    // === Шаг 4: Переходим по redirectUrl чтобы получить session cookies ===
    const redirectUrl = loginData.redirectUrl;
    if (!redirectUrl) {
      return { success: false, error: 'Не получен URL перенаправления после входа' };
    }

    console.log(`[kaspiLogin] Step 4: Following redirect: ${redirectUrl.substring(0, 80)}...`);

    // Следуем редиректам, собирая cookies
    let nextUrl = redirectUrl;
    for (let i = 0; i < 15; i++) {
      // Определяем какие cookies отправлять
      const isIdp = nextUrl.includes('idmc.shop.kaspi.kz');
      const isMc = nextUrl.includes('mc.shop.kaspi.kz');
      const cookiesToSend = isIdp ? idpCookies : isMc ? mcCookies : '';

      const res = await fetch(nextUrl, {
        method: 'GET',
        headers: {
          'User-Agent': DEFAULT_HEADERS['User-Agent'],
          'Accept': 'text/html,*/*',
          ...(cookiesToSend ? { 'Cookie': cookiesToSend } : {}),
        },
        redirect: 'manual',
      });

      const newCookies = extractCookies(res);
      if (newCookies) {
        if (nextUrl.includes('idmc.shop.kaspi.kz')) {
          idpCookies = mergeCookies(idpCookies, newCookies);
        } else {
          mcCookies = mergeCookies(mcCookies, newCookies);
        }
        console.log(`[kaspiLogin] Redirect ${i} set cookies: ${cookieKeys(newCookies)}`);
      }

      const location = res.headers.get('location');
      console.log(`[kaspiLogin] Redirect ${i}: ${res.status} → ${location?.substring(0, 80) || '(done)'}`);

      if (res.status >= 300 && res.status < 400 && location) {
        nextUrl = location.startsWith('http') ? location : new URL(location, nextUrl).href;
        continue;
      }

      break;
    }

    console.log(`[kaspiLogin] MC cookies (${mcCookies.length} chars): ${cookieKeys(mcCookies)}`);

    // === Шаг 5: Проверка и активация сессии ===
    if (!mcCookies.includes('mc-sid=')) {
      return { success: false, error: 'Сессия не создана после авторизации. Попробуйте ещё раз.' };
    }

    // Шаг 5a: Визит на главную страницу — может установить доп. cookies (XSRF-TOKEN и т.д.)
    try {
      const mainRes = await fetch(`${BASE_URL}/`, {
        headers: {
          'User-Agent': DEFAULT_HEADERS['User-Agent'],
          'Accept': 'text/html,application/xhtml+xml,*/*',
          'Cookie': mcCookies,
        },
        redirect: 'manual',
      });
      const mainCookies = extractCookies(mainRes);
      if (mainCookies) {
        mcCookies = mergeCookies(mcCookies, mainCookies);
        console.log(`[kaspiLogin] Main page (${mainRes.status}) set cookies: ${cookieKeys(mainCookies)}`);
      } else {
        console.log(`[kaspiLogin] Main page: ${mainRes.status}, no new cookies`);
      }
    } catch (e) {
      console.log(`[kaspiLogin] Main page error:`, e);
    }

    // Шаг 5b: Auth API — получаем merchant ID и доп. cookies
    let merchantId = '';
    try {
      const authRes = await fetch(`${BASE_URL}/auth/api/oauth2`, {
        headers: {
          'User-Agent': DEFAULT_HEADERS['User-Agent'],
          'Accept': 'application/json',
          'Cookie': mcCookies,
          'Referer': `${BASE_URL}/`,
        },
      });
      const authCookies = extractCookies(authRes);
      if (authCookies) {
        mcCookies = mergeCookies(mcCookies, authCookies);
        console.log(`[kaspiLogin] Auth API set cookies: ${cookieKeys(authCookies)}`);
      }
      console.log(`[kaspiLogin] Auth API: ${authRes.status}`);
      if (authRes.ok) {
        const authData = await authRes.json();
        merchantId = authData.merchantId || authData.id || '';
        console.log(`[kaspiLogin] Auth data:`, JSON.stringify(authData).substring(0, 300));
      }
    } catch (e) {
      console.log(`[kaspiLogin] Auth API error:`, e);
    }

    // Шаг 5c: Проверка XSRF-TOKEN
    const xsrfMatch = mcCookies.match(/XSRF-TOKEN=([^;]+)/);
    if (xsrfMatch) {
      console.log(`[kaspiLogin] Found XSRF-TOKEN: ${xsrfMatch[1].substring(0, 30)}...`);
    }

    // Шаг 5d: Получаем XSRF-TOKEN через BFF и проверяем сессию
    try {
      const bffHeaders: Record<string, string> = {
        'User-Agent': DEFAULT_HEADERS['User-Agent'],
        'Accept': 'application/json',
        'Referer': 'https://kaspi.kz/mc/',
        'Origin': 'https://kaspi.kz',
        'Cookie': mcCookies,
      };
      if (xsrfMatch) {
        bffHeaders['X-XSRF-TOKEN'] = xsrfMatch[1];
      }
      const checkRes = await fetch(`${BASE_URL}/bff/offer-view/count?m=${merchantId || '0'}`, {
        headers: bffHeaders,
      });

      // Извлекаем cookies из BFF ответа (XSRF-TOKEN и т.д.)
      const bffCookies = extractCookies(checkRes);
      if (bffCookies) {
        mcCookies = mergeCookies(mcCookies, bffCookies);
        console.log(`[kaspiLogin] BFF set cookies: ${cookieKeys(bffCookies)}`);
      }

      const checkBody = await checkRes.text().catch(() => '');
      console.log(`[kaspiLogin] BFF check: ${checkRes.status}, body: ${checkBody.substring(0, 200)}`);

      // Если 403 и теперь есть XSRF-TOKEN — повторяем с ним
      if (checkRes.status === 403) {
        const newXsrf = mcCookies.match(/XSRF-TOKEN=([^;]+)/);
        if (newXsrf && !xsrfMatch) {
          console.log(`[kaspiLogin] Got XSRF-TOKEN from BFF, retrying...`);
          const retryHeaders: Record<string, string> = {
            ...bffHeaders,
            'Cookie': mcCookies,
            'X-XSRF-TOKEN': decodeURIComponent(newXsrf[1]),
          };
          const retryRes = await fetch(`${BASE_URL}/bff/offer-view/count?m=${merchantId || '0'}`, {
            headers: retryHeaders,
          });
          const retryCookies = extractCookies(retryRes);
          if (retryCookies) {
            mcCookies = mergeCookies(mcCookies, retryCookies);
          }
          const retryBody = await retryRes.text().catch(() => '');
          console.log(`[kaspiLogin] BFF retry: ${retryRes.status}, body: ${retryBody.substring(0, 200)}`);
        }
      }

      if (checkRes.ok) {
        console.log('[kaspiLogin] Session verified via BFF!');
      } else {
        const respHeaders: Record<string, string> = {};
        checkRes.headers.forEach((v, k) => { respHeaders[k] = v; });
        console.log('[kaspiLogin] BFF response headers:', JSON.stringify(respHeaders));
      }
    } catch (e) {
      console.log(`[kaspiLogin] BFF check error:`, e);
    }

    // Возвращаем успех — логин прошёл, cookies получены
    console.log(`[kaspiLogin] Login successful. Final cookies: ${cookieKeys(mcCookies)}`);
    return {
      success: true,
      cookies: mcCookies,
      merchantId: merchantId || undefined,
    };
  } catch (error) {
    console.error('[kaspiLogin] Error:', error);
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
  // Если cookies содержат mc-sid — сессия считается активной
  // BFF может возвращать 403 из-за CSRF, это не значит что сессия невалидна
  if (!cookies || !cookies.includes('mc-sid=')) {
    return false;
  }
  return true;
}

export class KaspiAPIClient {
  private cookieString: string;
  private merchantId: string;

  constructor(cookies: string, merchantId: string) {
    this.cookieString = cookies;
    this.merchantId = merchantId;
  }

  private get headers() {
    const h: Record<string, string> = {
      'Accept': 'application/json',
      'Referer': 'https://kaspi.kz/mc/',
      'Origin': 'https://kaspi.kz',
      'User-Agent': DEFAULT_HEADERS['User-Agent'],
      'Cookie': this.cookieString,
    };
    // XSRF-TOKEN → X-XSRF-TOKEN header (Spring Security CSRF, URL-decoded)
    const xsrf = this.cookieString.match(/XSRF-TOKEN=([^;]+)/);
    if (xsrf) {
      h['X-XSRF-TOKEN'] = decodeURIComponent(xsrf[1]);
    }
    return h;
  }

  private get postHeaders() {
    return {
      ...this.headers,
      'Content-Type': 'application/json',
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
      const { products } = await this.getProductsPage(page, limit);
      if (products.length === 0) break;
      allProducts.push(...products);
      if (products.length < limit) break;
      page++;
    }

    return allProducts;
  }

  /**
   * Сделать BFF запрос с автоматическим получением XSRF-TOKEN при 403
   */
  private async bffFetch(url: string, options?: RequestInit & { json?: boolean }): Promise<Response> {
    const hdrs = options?.json ? this.postHeaders : this.headers;
    const response = await fetch(url, { ...options, headers: hdrs });

    // Извлекаем cookies из ответа (XSRF-TOKEN и др.)
    const setCookies = extractCookies(response);
    if (setCookies) {
      this.cookieString = mergeCookies(this.cookieString, setCookies);
    }

    // При 403 — попробуем ещё раз с обновлёнными cookies/XSRF
    if (response.status === 403 && setCookies) {
      console.log(`[BFF] Got 403, retrying with updated cookies...`);
      const retryHdrs = options?.json ? this.postHeaders : this.headers;
      const retryResponse = await fetch(url, { ...options, headers: retryHdrs });
      const retryCookies = extractCookies(retryResponse);
      if (retryCookies) {
        this.cookieString = mergeCookies(this.cookieString, retryCookies);
      }
      return retryResponse;
    }

    return response;
  }

  /**
   * Получить одну страницу товаров + total
   */
  async getProductsPage(page: number = 0, limit: number = 100, activeOnly?: boolean): Promise<{ products: KaspiProduct[]; total: number }> {
    // a=true → active products, omit a → archive products
    const aQuery = activeOnly === false ? '' : `&a=true`;
    const url = `${BASE_URL}/bff/offer-view/list?m=${this.merchantId}&p=${page}&l=${limit}${aQuery}&t=&c=`;

    const response = await this.bffFetch(url);

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`[BFF] Products list failed: ${response.status}, body: ${body.substring(0, 300)}`);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[BFF] List response keys: ${Object.keys(data).join(', ')}, total: ${data.total ?? data.totalCount ?? 'n/a'}`);

    if (!data.data || !Array.isArray(data.data)) {
      return { products: [], total: 0 };
    }

    const products = data.data.map((item: any) => this.mapProduct(item));
    // BFF может вернуть total в разных полях
    const total = data.total ?? data.totalCount ?? data.count ?? -1;

    return { products, total };
  }

  /**
   * Обновить цену товара
   * BFF endpoint для обновления цены оффера
   */
  async updateProductPrice(offerId: string, price: number): Promise<boolean> {
    const url = `${BASE_URL}/bff/offer-view/price`;

    const response = await this.bffFetch(url, {
      method: 'POST',
      json: true,
      body: JSON.stringify({
        merchantId: this.merchantId,
        offerId,
        price,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[BFF] Update price failed: ${response.status}`, text.substring(0, 300));
      throw new Error(`Update price failed: ${response.status} — ${text.substring(0, 200)}`);
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

    const response = await this.bffFetch(url, {
      method: 'POST',
      json: true,
      body: JSON.stringify({
        merchantId: this.merchantId,
        offerId,
        availabilities,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[BFF] Update stock failed: ${response.status}`, text.substring(0, 300));
      throw new Error(`Update stock failed: ${response.status} — ${text.substring(0, 200)}`);
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

    const response = await this.bffFetch(url, {
      method: 'POST',
      json: true,
      body: JSON.stringify({
        merchantId: this.merchantId,
        offerId,
        preorderPeriod: preorderDays,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[BFF] Update preorder failed: ${response.status}`, text.substring(0, 300));
      throw new Error(`Update preorder failed: ${response.status} — ${text.substring(0, 200)}`);
    }

    return true;
  }

  // ===== Прайс-лист (Export / Import) =====

  /**
   * Запустить экспорт прайс-листа.
   * Kaspi генерирует файл асинхронно — нужно потом проверять статус и скачивать.
   */
  async triggerPriceListExport(fileType: 'XML' | 'XLSX' = 'XML'): Promise<{ triggered: boolean; error?: string }> {
    const url = `${BASE_URL}/offers/api/v1/offer/export/trigger?m=${this.merchantId}&available=ACTIVE&fileType=${fileType}`;

    const response = await this.bffFetch(url);
    const text = await response.text();
    console.log(`[PriceList] Export trigger: ${response.status}`, text.substring(0, 300));

    if (response.status === 429) {
      return { triggered: false, error: 'Rate limit — подождите и попробуйте снова' };
    }

    if (!response.ok) {
      return { triggered: false, error: `${response.status}: ${text.substring(0, 200)}` };
    }

    return { triggered: true };
  }

  /**
   * Проверить статус экспорта прайс-листа.
   * Пробуем несколько вариантов URL (endpoint точно не известен).
   */
  async checkExportStatus(): Promise<{ ready: boolean; downloadUrl?: string; data?: any }> {
    // /status вернул 400 — пробуем с разными параметрами
    const urls = [
      `${BASE_URL}/offers/api/v1/offer/export/status?m=${this.merchantId}&available=ACTIVE&fileType=XML`,
      `${BASE_URL}/offers/api/v1/offer/export/status?m=${this.merchantId}&fileType=XML`,
      `${BASE_URL}/offers/api/v1/offer/export/status?m=${this.merchantId}`,
    ];

    for (const url of urls) {
      try {
        const response = await this.bffFetch(url);
        const text = await response.text();
        console.log(`[PriceList] ${url} → ${response.status}: ${text.substring(0, 500)}`);

        if (response.ok) {
          try {
            const data = JSON.parse(text);
            return { ready: true, data };
          } catch {
            return { ready: true, downloadUrl: url };
          }
        }
      } catch (e) {
        console.log(`[PriceList] ${url} error:`, e);
      }
    }

    return { ready: false };
  }

  /**
   * Сгенерировать XML прайс-лист из данных BFF.
   * Формат: https://guide.kaspi.kz/partner/ru/shop/goods/price_list/q2962
   *
   * @param products — товары из BFF (getAllProducts)
   * @param preorderOverrides — Map<sku, Map<storeId, days>> переопределения предзаказа
   * @param companyName — название компании
   */
  generatePriceListXML(
    products: KaspiProduct[],
    preorderOverrides?: Map<string, Map<string, number>>,
  ): string {
    const lines: string[] = [];
    lines.push('<?xml version="1.0" encoding="utf-8"?>');
    lines.push('<kaspi_catalog date="' + new Date().toISOString().split('T')[0] + '"');
    lines.push('    xmlns="kaspiShopping"');
    lines.push('    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
    lines.push('    xsi:schemaLocation="http://kaspi.kz/kaspishopping.xsd">');
    lines.push(`  <company>${escapeXml(this.merchantId)}</company>`);
    lines.push(`  <merchantid>${escapeXml(this.merchantId)}</merchantid>`);
    lines.push('  <offers>');

    for (const product of products) {
      const sku = product.sku || product.masterSku || '';
      if (!sku) continue;

      lines.push(`    <offer sku="${escapeXml(sku)}">`);
      lines.push(`      <model>${escapeXml(product.name)}</model>`);
      const brand = product.brand;
      lines.push(brand ? `      <brand>${escapeXml(brand)}</brand>` : '      <brand/>');
      lines.push('      <availabilities>');

      const avails = product.availabilities || [];
      if (avails.length > 0) {
        for (const a of avails) {
          // Используем полный storeId как в оригинальном экспорте Kaspi (4929016_PP1)
          const fullStoreId = a.storeId;
          const shortStoreId = fullStoreId.includes('_') ? fullStoreId.split('_').pop()! : fullStoreId;
          const available = a.available ? 'yes' : 'no';
          const stockCount = a.stockCount || 0;

          // Предзаказ: берём override если есть, иначе текущее значение
          let preorder = a.preorderPeriod ?? null;
          const skuOverrides = preorderOverrides?.get(sku);
          if (skuOverrides?.has(shortStoreId) || skuOverrides?.has(fullStoreId)) {
            preorder = skuOverrides.get(shortStoreId) ?? skuOverrides.get(fullStoreId)!;
          } else if (skuOverrides?.has('*')) {
            preorder = skuOverrides.get('*')!;
          }

          let attrs = `available="${available}" storeId="${escapeXml(fullStoreId)}"`;
          const preorderVal = (preorder !== null && preorder > 0) ? Math.min(preorder, 30) : 0;
          attrs += ` preOrder="${preorderVal}"`;
          if (stockCount > 0) {
            attrs += ` stockCount="${stockCount}.0"`;
          }

          lines.push(`        <availability ${attrs}/>`);
        }
      } else {
        lines.push(`        <availability available="yes" storeId="${this.merchantId}_PP1" preOrder="0"/>`);
      }

      lines.push('      </availabilities>');

      // cityprices если есть, иначе price
      const cityPrices = product.cityPrices;
      if (cityPrices && cityPrices.length > 0) {
        lines.push('      <cityprices>');
        for (const cp of cityPrices) {
          lines.push(`        <cityprice cityId="${escapeXml(cp.cityId)}">${Math.round(cp.value)}</cityprice>`);
        }
        lines.push('      </cityprices>');
      } else {
        lines.push(`      <price>${Math.round(product.price)}</price>`);
      }
      lines.push('    </offer>');
    }

    lines.push('  </offers>');
    lines.push('</kaspi_catalog>');

    return lines.join('\n');
  }

  /**
   * Загрузить XML прайс-лист в Kaspi через BFF.
   * Endpoint: POST /offers/api/v1/offer/import/upload
   */
  async uploadPriceList(xmlContent: string): Promise<{ success: boolean; error?: string }> {
    // Создаём multipart form data с файлом
    const boundary = '----MetriconBoundary' + Date.now();
    const fileName = `pricelist_${this.merchantId}.xml`;

    const body = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${fileName}"`,
      'Content-Type: application/xml',
      '',
      xmlContent,
      `--${boundary}--`,
    ].join('\r\n');

    const url = `${BASE_URL}/offers/api/v1/offer/import/upload?merchantUid=${this.merchantId}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });

    const text = await response.text();
    console.log(`[PriceList] Upload: ${response.status}`, text.substring(0, 500));

    if (!response.ok) {
      return { success: false, error: `${response.status}: ${text.substring(0, 200)}` };
    }

    return { success: true };
  }

  /**
   * Зарегистрировать URL автозагрузки прайс-листа в Kaspi кабинете.
   * Пробует несколько известных endpoint-ов.
   */
  async registerAutoLoadUrl(
    feedUrl: string,
    login?: string,
    password?: string
  ): Promise<{ success: boolean; error?: string; endpoint?: string }> {
    const payload: Record<string, unknown> = {
      url: feedUrl,
      merchantId: this.merchantId,
    };
    if (login) payload.login = login;
    if (password) payload.password = password;

    // Попробуем разные endpoint-ы
    const endpoints = [
      { url: `${BASE_URL}/bff/offer-view/import/auto-load?m=${this.merchantId}`, method: 'POST' },
      { url: `${BASE_URL}/bff/offer-view/import/auto-load`, method: 'POST' },
      { url: `${BASE_URL}/bff/offer-view/import/settings?m=${this.merchantId}`, method: 'POST' },
      { url: `${BASE_URL}/offers/api/v1/offer/import/auto-load?m=${this.merchantId}`, method: 'POST' },
      { url: `${BASE_URL}/offers/api/v1/offer/import/settings?m=${this.merchantId}`, method: 'POST' },
      { url: `${BASE_URL}/offers/api/v1/offer/import/auto-load?merchantUid=${this.merchantId}`, method: 'PUT' },
    ];

    const results: string[] = [];

    for (const ep of endpoints) {
      try {
        const response = await this.bffFetch(ep.url, {
          method: ep.method,
          json: true,
          body: JSON.stringify(payload),
        });
        const text = await response.text().catch(() => '');
        results.push(`${ep.method} ${ep.url} → ${response.status}: ${text.substring(0, 200)}`);
        console.log(`[AutoLoad] ${ep.method} ${ep.url} → ${response.status}`, text.substring(0, 300));

        if (response.ok || response.status === 200 || response.status === 201 || response.status === 204) {
          return { success: true, endpoint: ep.url };
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push(`${ep.method} ${ep.url} → ERROR: ${msg}`);
        console.error(`[AutoLoad] ${ep.method} ${ep.url} error:`, msg);
      }
    }

    return {
      success: false,
      error: `Не удалось найти endpoint. Попробовано:\n${results.join('\n')}`,
    };
  }

  /**
   * Преобразовать raw данные BFF в наш формат
   */
  // Маппинг storeId → адрес точки продаж (из настроек Kaspi кабинета)
  private static readonly POS_NAMES: Record<string, string> = {
    'PP1': 'Осипенко, 35А',
    'PP2': 'Казыбаева, 3',
    'PP3': 'Ауэзова, 3/2А',
    'PP4': 'Кабдолова, 1/8',
    'PP5': 'Осипенко, 35А (2)',
    'PP6': 'Маметовой, 76',
    'PP7': 'Адилова, 3А',
  };

  private mapProduct(item: any): KaspiProduct {
    const availabilities: KaspiAvailability[] = (item.availabilities || []).map((a: any) => {
      const rawId = a.storeId || a.pointOfServiceId || '';
      const shortId = rawId.includes('_') ? rawId.split('_').pop() : rawId;
      const posName = KaspiAPIClient.POS_NAMES[shortId] || shortId;
      return {
        storeId: rawId,
        storeName: a.storeName || a.pointOfServiceName || posName,
        cityId: a.cityId || '',
        cityName: a.cityName || '',
        stockCount: a.stockCount || 0,
        available: a.available ?? (a.stockCount > 0),
        preorderPeriod: a.preOrder ?? a.preorderPeriod ?? null,
        stockSpecified: a.stockSpecified ?? true,
      };
    });

    const allStockSpecified = availabilities.length === 0 || availabilities.some(a => a.stockSpecified);

    // Сохраняем cityPrices из BFF
    const cityPrices: KaspiCityPrice[] = (item.cityPrices || []).map((cp: any) => ({
      cityId: String(cp.cityId || cp.id || ''),
      value: cp.value || cp.price || 0,
    })).filter((cp: KaspiCityPrice) => cp.cityId && cp.value > 0);

    return {
      sku: item.sku || item.masterSku,
      name: item.title || item.masterTitle,
      price: item.price || cityPrices[0]?.value || item.rangePrice?.MIN || item.minPrice || 0,
      stock: availabilities.reduce((sum, a) => sum + a.stockCount, 0),
      category: item.masterCategory || item.verticalCategory,
      brand: item.brand || null,
      cityPrices: cityPrices.length > 0 ? cityPrices : undefined,
      images: (item.images || []).map((img: string) =>
        img.startsWith('http') ? img : `https://resources.cdn-kaspi.kz/img/m/p/${img}`
      ),
      offerId: item.offerId,
      masterSku: item.masterSku,
      shopLink: item.shopLink,
      availabilities,
      preorder: availabilities[0]?.preorderPeriod ?? null,
      active: item.active ?? true,
      stockSpecified: allStockSpecified,
    };
  }
}

// --- Вспомогательные функции ---

function cookieKeys(cookies: string): string {
  return cookies.split('; ').map(c => {
    const [k, v] = c.split('=');
    return `${k}(${v?.length || 0})`;
  }).join(', ');
}

function extractCookies(response: Response): string {
  // Метод 1: getSetCookie() (Node.js 18.14+)
  let setCookieHeaders = response.headers.getSetCookie?.() || [];

  // Метод 2: fallback через get('set-cookie') если getSetCookie не работает
  if (setCookieHeaders.length === 0) {
    const raw = response.headers.get('set-cookie');
    if (raw) {
      // split by comma, но аккуратно — не разрезать внутри Expires даты
      setCookieHeaders = raw.split(/,(?=\s*[a-zA-Z_][a-zA-Z0-9_-]*=)/);
    }
  }

  const result = setCookieHeaders
    .map(cookie => cookie.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');

  return result;
}

function mergeCookies(existing: string, incoming: string): string {
  const map = new Map<string, string>();

  for (const cookie of existing.split('; ').filter(Boolean)) {
    const [key, ...rest] = cookie.split('=');
    if (key) map.set(key.trim(), rest.join('='));
  }
  for (const cookie of incoming.split('; ').filter(Boolean)) {
    const [key, ...rest] = cookie.split('=');
    const value = rest.join('=');
    if (key) {
      if (value) {
        map.set(key.trim(), value);
      } else {
        // Пустое значение = удаление cookie
        map.delete(key.trim());
      }
    }
  }

  return Array.from(map.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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
