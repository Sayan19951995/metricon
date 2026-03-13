/**
 * Kaspi Marketing API Client — работа с marketing.kaspi.kz
 */

const MARKETING_BASE = 'https://marketing.kaspi.kz';

const DEFAULT_HEADERS: Record<string, string> = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
  'Sec-Ch-Ua': '"Chromium";v="144", "Google Chrome";v="144", "Not-A.Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
  'x-front-version': '5.0.458',
  'x-requested-with': 'XMLHttpRequest',
};

export interface MarketingCampaign {
  id: number;
  name: string;
  dailyBudget: number;
  startDate: string;
  endDate?: string;
  biddingType: string | number;
  defaultBid: number;
  state: 'Enabled' | 'Paused' | 'Archived';
  targetLocationIds: number[];
  views: number;
  clicks: number;
  favorites: number;
  carts: number;
  ctr: number;
  gmv: number;
  transactions: number;
  cost: number;
  crr: number;
  recordTimeStamp?: string;
}

export interface CampaignProduct {
  id: number;
  sku: string;
  productName: string;
  productUrl?: string;
  imageUrl?: string;
  bid: number;
  campaignState: string;
  productState: string;
  views: number;
  clicks: number;
  favorites: number;
  carts: number;
  ctr: number;
  gmv: number;
  transactions: number;
  cost: number;
  crr: number;
}

export interface MarketingLoginResponse {
  result: string;
  data: {
    userId: string;
    sessionDuration: number;
    sessionStartDateTime: string;
    pay: {
      merchantId: number;
      context: {
        phone: string;
        organizationName: string;
        userFullName: string;
        payPermissions: string[];
      };
    };
    shop: {
      merchantBusinessId: string;
      merchantName: string;
      userType: number;
      merchants: Array<{
        id: number;
        merchantBusinessId: string;
        merchantName: string;
        promotionTypeId: number;
        merchantType: string;
      }>;
    };
    profiles: Array<{
      id: number;
      organizationIdn: string;
      organizationName: string;
      merchants: Array<{ id: number; merchantBusinessId: string; merchantName: string }>;
    }>;
  };
}

export interface MarketingSession {
  user_token: string;
  session_id: string;
  merchant_id: number;
  merchant_business_id?: string;
  marketing_user_id: string;
  merchant_name: string;
  created_at: string;
  username?: string;
  password?: string;
  last_reconnect_attempt?: string;
  all_cookies?: string;
}

export class KaspiMarketingClient {
  private cookies: string;
  private merchantId: number;
  /** Extra cookies collected from WAF preflight requests, keyed by module path prefix */
  private preflightCookies: Record<string, string> = {};

  constructor(session: MarketingSession) {
    this.cookies = session.all_cookies || `user_token=${session.user_token}; X-Kb-Session-Id=${session.session_id}`;
    this.merchantId = session.merchant_id;
  }

  /**
   * Preflight: загружает SPA-страницу модуля, собирает WAF-куки из Set-Cookie.
   * Браузер делает это автоматически при навигации; нам нужно повторить.
   */
  private async preflight(pageUrl: string, moduleKey: string): Promise<string> {
    if (this.preflightCookies[moduleKey]) return this.preflightCookies[moduleKey];

    try {
      const response = await fetch(pageUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
          'Sec-Ch-Ua': DEFAULT_HEADERS['Sec-Ch-Ua'],
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
          'User-Agent': DEFAULT_HEADERS['User-Agent'],
          'Cookie': this.cookies,
        },
        redirect: 'manual',
      });

      const setCookies = response.headers.getSetCookie?.() || [];
      const extraCookies: Record<string, string> = {};
      for (const cookie of setCookies) {
        const match = cookie.match(/^([^=]+)=([^;]+)/);
        if (match) {
          extraCookies[match[1].trim()] = match[2];
        }
      }

      // Also try raw headers iteration for environments where getSetCookie is unavailable
      if (setCookies.length === 0) {
        response.headers.forEach((value, key) => {
          if (key.toLowerCase() === 'set-cookie') {
            for (const part of value.split(',')) {
              const m = part.trim().match(/^([^=]+)=([^;]+)/);
              if (m) extraCookies[m[1].trim()] = m[2];
            }
          }
        });
      }

      // Merge new cookies with existing ones
      const merged = this.cookies + (Object.keys(extraCookies).length > 0
        ? '; ' + Object.entries(extraCookies).map(([k, v]) => `${k}=${v}`).join('; ')
        : '');
      this.preflightCookies[moduleKey] = merged;

      console.log(`[Marketing] Preflight ${moduleKey}: status=${response.status}, newCookies=${Object.keys(extraCookies).join(',') || 'none'}`);
      return merged;
    } catch (err) {
      console.error(`[Marketing] Preflight ${moduleKey} failed:`, err);
      return this.cookies; // fallback to original cookies
    }
  }

  /**
   * Попытка переподключения если сессия протухла.
   * Возвращает новую сессию или null если нет credentials.
   */
  /** Cooldown 30 min between reconnect attempts to avoid account bans */
  static readonly RECONNECT_COOLDOWN_MS = 30 * 60 * 1000;

  static isReconnectOnCooldown(session: MarketingSession): boolean {
    if (!session.last_reconnect_attempt) return false;
    const elapsed = Date.now() - new Date(session.last_reconnect_attempt).getTime();
    return elapsed < KaspiMarketingClient.RECONNECT_COOLDOWN_MS;
  }

  static async tryReconnect(session: MarketingSession): Promise<MarketingSession | null> {
    if (!session.username || !session.password) return null;

    if (KaspiMarketingClient.isReconnectOnCooldown(session)) {
      const elapsed = Date.now() - new Date(session.last_reconnect_attempt!).getTime();
      const left = Math.round((KaspiMarketingClient.RECONNECT_COOLDOWN_MS - elapsed) / 60000);
      console.log(`[Marketing] Reconnect cooldown: ${left}min left, skipping`);
      return null;
    }

    try {
      const { session: newSession } = await KaspiMarketingClient.login(session.username, session.password);
      return newSession;
    } catch (err) {
      console.error('[Marketing] Reconnect login failed:', err);
      return null;
    }
  }

  /** Returns the session object with last_reconnect_attempt stamped (for saving to DB on failed attempt) */
  static stampReconnectAttempt(session: MarketingSession): MarketingSession {
    return { ...session, last_reconnect_attempt: new Date().toISOString() };
  }

  /**
   * Логин в Kaspi Marketing
   */
  static async login(username: string, password: string): Promise<{
    session: MarketingSession;
    loginData: MarketingLoginResponse['data'];
  }> {
    // Нормализуем телефон: +77076207065 → 87076207065 (11 цифр)
    let phone = username.replace(/[\s\-\(\)]/g, '');
    if (phone.startsWith('+7')) {
      phone = '8' + phone.slice(2);
    }

    // URLSearchParams для application/x-www-form-urlencoded (как в браузере)
    const body = new URLSearchParams();
    body.append('username', phone);
    body.append('password', password);

    const response = await fetch(`${MARKETING_BASE}/accounts/api/User/login`, {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': `${MARKETING_BASE}/sign-in`,
        'Origin': MARKETING_BASE,
      },
      body: body.toString(),
      redirect: 'manual',
    });

    // Собираем cookies из Set-Cookie
    const setCookies = response.headers.getSetCookie?.() || [];
    let userToken = '';
    let sessionId = '';
    const cookieMap: Record<string, string> = {};

    for (const cookie of setCookies) {
      const match = cookie.match(/^([^=]+)=([^;]+)/);
      if (match) {
        const name = match[1].trim();
        const value = match[2];
        cookieMap[name] = value;
        if (name === 'user_token') userToken = value;
        if (name === 'X-Kb-Session-Id') sessionId = value;
      }
    }

    // Также попробуем получить из raw headers
    if (!userToken || !sessionId) {
      const rawHeaders = response.headers;
      const allSetCookies: string[] = [];
      rawHeaders.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') {
          allSetCookies.push(value);
        }
      });
      for (const cookie of allSetCookies) {
        const parts = cookie.split(',');
        for (const part of parts) {
          const match = part.trim().match(/^([^=]+)=([^;]+)/);
          if (match) {
            const name = match[1].trim();
            const value = match[2];
            cookieMap[name] = value;
            if (name === 'user_token') userToken = value;
            if (name === 'X-Kb-Session-Id') sessionId = value;
          }
        }
      }
    }

    // Build full cookie string from all received cookies
    const allCookiesStr = Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join('; ');

    // Если redirect (302/303), тело может быть пустым — пробуем читать текст
    if (response.status === 429) {
      throw new Error('Слишком много попыток входа. Подождите несколько минут и попробуйте снова.');
    }

    const text = await response.text();
    let json: MarketingLoginResponse;
    try {
      json = JSON.parse(text) as MarketingLoginResponse;
    } catch {
      console.error('Marketing login response not JSON:', response.status, text.slice(0, 500));
      throw new Error(`Marketing login failed: HTTP ${response.status}`);
    }

    if (json.result !== 'Ok' || !json.data) {
      console.error('Marketing login rejected:', JSON.stringify(json).slice(0, 500));
      // Показываем валидационную ошибку от Kaspi если есть
      const msg = (json as unknown as { message?: string }).message || json.result;
      throw new Error(msg);
    }

    const merchant = json.data.shop?.merchants?.[0];
    if (!merchant) {
      throw new Error('No merchant found in marketing login response');
    }

    // Log all available IDs for debugging
    console.log('[Marketing] Login IDs:', {
      'shop.merchants[0].id': merchant.id,
      'shop.merchants[0].merchantBusinessId': merchant.merchantBusinessId,
      'shop.merchantBusinessId': json.data.shop?.merchantBusinessId,
      'pay.merchantId': json.data.pay?.merchantId,
      'merchantsCount': json.data.shop?.merchants?.length,
    });

    const session: MarketingSession = {
      user_token: userToken,
      session_id: sessionId,
      merchant_id: merchant.id,
      merchant_business_id: merchant.merchantBusinessId || json.data.shop?.merchantBusinessId,
      marketing_user_id: json.data.userId,
      merchant_name: merchant.merchantName,
      created_at: new Date().toISOString(),
      username,
      password,
      all_cookies: allCookiesStr,
    };

    return { session, loginData: json.data };
  }

  /**
   * Получить все кампании за период
   */
  async getCampaigns(startDate: string, endDate: string): Promise<MarketingCampaign[]> {
    // No preflight — preflight was redirecting to /sign-in and polluting cookies
    const url = `${MARKETING_BASE}/advertising/products/api/v5/merchant/${this.merchantId}/Campaigns?StartDate=${startDate}&EndDate=${endDate}`;
    console.log(`[Marketing] getCampaigns url=${url} merchantId=${this.merchantId}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...DEFAULT_HEADERS,
        'Cookie': this.cookies,
        'Referer': `${MARKETING_BASE}/advertising/campaigns?tab=campaigns`,
      },
    });

    console.log(`[Marketing] getCampaigns HTTP ${response.status} for merchant ${this.merchantId}`);

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error(`[Marketing] getCampaigns non-OK: ${response.status} body=${text.slice(0, 300)}`);
      throw new Error(`getCampaigns HTTP ${response.status}`);
    }

    const text = await response.text();
    let json: { result: string; data: MarketingCampaign[] };
    try {
      json = JSON.parse(text) as { result: string; data: MarketingCampaign[] };
    } catch {
      console.error(`[Marketing] getCampaigns non-JSON: ${text.slice(0, 300)}`);
      throw new Error('getCampaigns response not JSON');
    }

    if (json.result !== 'Ok') {
      const detail = (json as Record<string, unknown>).message || (json as Record<string, unknown>).errorCode || text.slice(0, 200);
      console.error(`[Marketing] getCampaigns result=${json.result} merchantId=${this.merchantId} detail=${detail}`);
      throw new Error(`getCampaigns merchantId=${this.merchantId}: result=${json.result} | ${detail}`);
    }

    return json.data || [];
  }

  /**
   * Получить активные кампании за период
   */
  async getActiveCampaigns(startDate: string, endDate: string): Promise<MarketingCampaign[]> {
    const url = `${MARKETING_BASE}/advertising/products/api/v5/merchant/${this.merchantId}/Campaigns?StartDate=${startDate}&EndDate=${endDate}&state=Enabled`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...DEFAULT_HEADERS,
        'Cookie': this.cookies,
        'Referer': `${MARKETING_BASE}/advertising/campaigns?tab=campaigns`,
      },
    });

    const json = await response.json() as { result: string; data: MarketingCampaign[] };

    if (json.result !== 'Ok') {
      throw new Error(`Failed to fetch active campaigns: ${json.result}`);
    }

    return json.data || [];
  }

  /**
   * Получить товары кампании
   */
  async getCampaignProducts(campaignId: number, startDate: string, endDate: string): Promise<CampaignProduct[]> {
    const url = `${MARKETING_BASE}/advertising/products/api/v5/merchant/${this.merchantId}/Campaign/${campaignId}/Products?StartDate=${startDate}&EndDate=${endDate}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...DEFAULT_HEADERS,
        'Cookie': this.cookies,
        'Referer': `${MARKETING_BASE}/advertising/campaigns/${campaignId}?tab=products`,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = await response.json() as { result: string; data: any[] };

    if (json.result !== 'Ok') {
      throw new Error(`Failed to fetch campaign products: ${json.result}`);
    }

    // Маппим поля API к нашему интерфейсу
    return (json.data || []).map((raw): CampaignProduct => ({
      id: raw.campaignProductId,
      sku: raw.sku,
      productName: raw.title,
      productUrl: raw.itemUrl,
      imageUrl: raw.imageUrl,
      bid: raw.bid,
      campaignState: raw.campaignState || '',
      productState: raw.productState || '',
      views: raw.views || 0,
      clicks: raw.clicks || 0,
      favorites: raw.favorites || 0,
      carts: raw.carts || 0,
      ctr: raw.ctr || 0,
      gmv: raw.gmv || 0,
      transactions: raw.transactions || 0,
      cost: raw.cost || 0,
      crr: raw.crr || 0,
    }));
  }

  /**
   * Получить обзор (Overview)
   */
  async getOverview(startDate: string, endDate: string): Promise<Record<string, unknown>> {
    const url = `${MARKETING_BASE}/advertising/products/api/v4/merchant/${this.merchantId}/Overview`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        'Content-Type': 'application/json',
        'Cookie': this.cookies,
        'Referer': `${MARKETING_BASE}/advertising/overview?tab=overview&activeTab=Enabled`,
        'Origin': MARKETING_BASE,
      },
      body: JSON.stringify({ startDate, endDate }),
    });

    const json = await response.json() as { result: string; data: Record<string, unknown> };
    return json.data || {};
  }

  /**
   * Получить кампании внешней рекламы за период
   */
  async getExternalCampaigns(startDate: string, endDate: string): Promise<Array<{ id: number; name: string; cost: number; gmv: number; transactions: number; state: string }>> {
    const cookies = await this.preflight(
      `${MARKETING_BASE}/external/advertising/products/campaigns`,
      'external-ads',
    );
    const url = `${MARKETING_BASE}/external/advertising/products/api/v1/merchant/${this.merchantId}/campaigns?startDate=${startDate}&endDate=${endDate}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...DEFAULT_HEADERS,
        'x-front-version': '0.0.134',
        'Cookie': cookies,
        'Referer': `${MARKETING_BASE}/external/advertising/products/campaigns`,
      },
    });

    if (!response.ok) {
      const hdrs: Record<string, string> = {};
      response.headers.forEach((v, k) => { hdrs[k] = v; });
      const text = await response.text().catch(() => '');
      throw new Error(`External campaigns HTTP ${response.status} hdrs=${JSON.stringify(hdrs)} body=${text.slice(0, 200)}`);
    }

    const json = await response.json() as { result: string; data: any[] };
    if (json.result !== 'Ok') {
      throw new Error(`Failed to fetch external campaigns: ${json.result}`);
    }
    return (json.data || []).map(c => ({
      id: c.id, name: c.name, cost: c.cost || 0, gmv: c.gmv || 0,
      transactions: c.transactions || 0, state: c.state || '',
    }));
  }

  /**
   * Получить обзор бонусов от продавца за период
   */
  async getSellerBonusesOverview(startDate: string, endDate: string): Promise<{ cost: number; gmv: number; transactions: number }> {
    const cookies = await this.preflight(
      `${MARKETING_BASE}/bonuses/products/promotions/overview`,
      'seller-bonuses',
    );
    const url = `${MARKETING_BASE}/bonuses/products/api/v1/merchant/${this.merchantId}/overview?StartDate=${startDate}&EndDate=${endDate}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...DEFAULT_HEADERS,
        'x-front-version': '0.0.134',
        'Cookie': cookies,
        'Referer': `${MARKETING_BASE}/bonuses/products/promotions/overview`,
      },
    });

    if (!response.ok) {
      const hdrs: Record<string, string> = {};
      response.headers.forEach((v, k) => { hdrs[k] = v; });
      const text = await response.text().catch(() => '');
      throw new Error(`Seller bonuses HTTP ${response.status} hdrs=${JSON.stringify(hdrs)} body=${text.slice(0, 200)}`);
    }

    const json = await response.json();
    return {
      cost: json.bonusAmount || 0,
      gmv: json.gmv || 0,
      transactions: json.transactions || 0,
    };
  }

  /**
   * Получить обзор бонусов за отзыв за период
   */
  async getReviewBonusesOverview(startDate: string, endDate: string): Promise<{ cost: number }> {
    const cookies = await this.preflight(
      `${MARKETING_BASE}/bonuses/reviews/promotions/overview`,
      'review-bonuses',
    );
    const url = `${MARKETING_BASE}/bonuses/reviews/api/v2/merchant/${this.merchantId}/overview?StartDate=${startDate}&EndDate=${endDate}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...DEFAULT_HEADERS,
        'x-front-version': '0.0.134',
        'Cookie': cookies,
        'Referer': `${MARKETING_BASE}/bonuses/reviews/promotions/overview`,
      },
    });

    if (!response.ok) {
      const hdrs: Record<string, string> = {};
      response.headers.forEach((v, k) => { hdrs[k] = v; });
      const text = await response.text().catch(() => '');
      throw new Error(`Review bonuses HTTP ${response.status} hdrs=${JSON.stringify(hdrs)} body=${text.slice(0, 200)}`);
    }

    const json = await response.json();
    return { cost: json.bonusAmount || 0 };
  }

  /**
   * Получить расходы по всем каналам маркетинга за период
   */
  async getAllChannelsCost(startDate: string, endDate: string): Promise<{
    productAds: { cost: number; gmv: number; transactions: number };
    externalAds: { cost: number; gmv: number; transactions: number };
    sellerBonuses: { cost: number; gmv: number; transactions: number };
    reviewBonuses: { cost: number };
    totalCost: number;
    totalGmv: number;
    totalTransactions: number;
  }> {
    const [productRes, externalRes, sellerRes, reviewRes] = await Promise.allSettled([
      this.getCampaigns(startDate, endDate).then(campaigns => {
        const s = KaspiMarketingClient.aggregateCampaigns(campaigns);
        return { cost: s.totalCost, gmv: s.totalGmv, transactions: s.totalTransactions };
      }),
      this.getExternalCampaigns(startDate, endDate).then(campaigns => {
        let cost = 0, gmv = 0, transactions = 0;
        for (const c of campaigns) { cost += c.cost; gmv += c.gmv; transactions += c.transactions; }
        return { cost, gmv, transactions };
      }),
      this.getSellerBonusesOverview(startDate, endDate),
      this.getReviewBonusesOverview(startDate, endDate),
    ]);

    const productAds = productRes.status === 'fulfilled' ? productRes.value : { cost: 0, gmv: 0, transactions: 0 };
    const externalAds = externalRes.status === 'fulfilled' ? externalRes.value : { cost: 0, gmv: 0, transactions: 0 };
    const sellerBonuses = sellerRes.status === 'fulfilled' ? sellerRes.value : { cost: 0, gmv: 0, transactions: 0 };
    const reviewBonuses = reviewRes.status === 'fulfilled' ? reviewRes.value : { cost: 0 };

    // Log errors but don't fail
    if (productRes.status === 'rejected') console.error('[Marketing] Product ads error:', productRes.reason);
    if (externalRes.status === 'rejected') console.error('[Marketing] External ads error:', externalRes.reason);
    if (sellerRes.status === 'rejected') console.error('[Marketing] Seller bonuses error:', sellerRes.reason);
    if (reviewRes.status === 'rejected') console.error('[Marketing] Review bonuses error:', reviewRes.reason);

    return {
      productAds,
      externalAds,
      sellerBonuses,
      reviewBonuses,
      totalCost: productAds.cost + externalAds.cost + sellerBonuses.cost + reviewBonuses.cost,
      totalGmv: productAds.gmv + externalAds.gmv + sellerBonuses.gmv,
      totalTransactions: productAds.transactions + externalAds.transactions + sellerBonuses.transactions,
    };
  }

  /**
   * Агрегация: общие расходы на рекламу
   */
  static aggregateCampaigns(campaigns: MarketingCampaign[]) {
    let totalCost = 0;
    let totalViews = 0;
    let totalClicks = 0;
    let totalTransactions = 0;
    let totalGmv = 0;
    let totalFavorites = 0;
    let totalCarts = 0;

    for (const c of campaigns) {
      totalCost += c.cost || 0;
      totalViews += c.views || 0;
      totalClicks += c.clicks || 0;
      totalTransactions += c.transactions || 0;
      totalGmv += c.gmv || 0;
      totalFavorites += c.favorites || 0;
      totalCarts += c.carts || 0;
    }

    const avgCtr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
    const roas = totalCost > 0 ? totalGmv / totalCost : 0;
    const crr = totalGmv > 0 ? (totalCost / totalGmv) * 100 : 0;

    return {
      totalCost,
      totalViews,
      totalClicks,
      totalTransactions,
      totalGmv,
      totalFavorites,
      totalCarts,
      avgCtr,
      roas,
      crr,
      activeCampaigns: campaigns.filter(c => c.state !== 'Paused' && c.state !== 'Archived').length,
      totalCampaigns: campaigns.length,
    };
  }
}
